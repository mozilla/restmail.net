#!/usr/bin/env node

const MailParser = require('mailparser').MailParser;
const config = require('./config');
const fs = require('fs');
const os = require('os');
const path = require('path');
const redis = require('redis');
const smtp = require('smtp-protocol');
const util = require('util');
const isSpecialUser = require('./util').isSpecialUser;

const HOSTNAME = process.env.EMAIL_HOSTNAME || 'restmail.net';
const IS_TEST = process.env.NODE_ENV === 'test';
const TMP_DIR = process.env.TMP_DIR || os.tmpdir();

// create a connection to the redis datastore
var db = redis.createClient();

function log(/* format, values... */) {
  if (IS_TEST) {
    return;
  }
  var args = Array.prototype.slice.call(arguments);
  var timestamp = new Date().toISOString();
  args[0] = util.format('[%s] %s', timestamp, args[0]);
  process.stderr.write(util.format.apply(null, args) + '\n');
}

function logError(err) {
  log('ERROR (oh noes!): ' + err);
}

function allowedDomain(address) {
  const allowedDomains = config.rcptToDomainWhitelist;
  const match = address.match(/.*@(.*)/);

  if (match && match[1]) {
    const domain = match[1];
    if (allowedDomains.includes(domain)) {
      return true;
    }
  }

  return false;
}

function mailSummary(mail) {
  const deliveryTime =
    new Date(mail.receivedAt).getTime() - new Date(mail.date).getTime();

  const summary = {
    date: mail.date,
    deliveryTime: deliveryTime,
    from: mail.from,
    receivedAt: mail.receivedAt,
    subject: mail.subject,
    to: mail.to
  };

  if (mail.headers) {
    summary.headers = {
      cc: mail.headers.cc,
      date: mail.headers.date,
      from: mail.headers.from,
      subject: mail.headers.subject,
      to: mail.headers.to
    };
  }

  return JSON.stringify(summary);
}

var server = smtp.createServer(HOSTNAME, function (req) {
  log(new Date().toISOString() + ' Handling SMTP request');

  let users = [];
  let rcptTo = 0;
  let rejected = false;

  // By default smtp-protocol sends a string advertising STARTTLS support (HELO vs EHLO)
  // Override this because we don't
  req.on('greeting', function(command, ack) {
    ack.accept(250, 'OK');
  });

  req.on('to', function(user, ack) {
    rcptTo += 1;
    log(new Date().toISOString() + ' on to ' + rcptTo + ' ' + config.maximumRcptTo + ' ' + user);

    const allowed = allowedDomain(user);
    if (! allowed) {
      log(new Date().toISOString() + ' user ' + user + 'is not in an allowed domain. Dropping');
      rejected = true;
      return ack.reject(553, 'Requested action not taken: mailbox name not allowed');
    }

    users.push(user);

    if (rcptTo > config.maximumRcptTo) {
      log(new Date().toISOString() + ' ' + user + ' rejected');
      rejected = true;
      return ack.reject(452, 'Too many recipients');
    }

    ack.accept(250, 'OK');
  });

  req.on('message', function (stream, ack) {
    if (rejected) {
      return;
    }

    log(new Date().toISOString() + ' onmessage');
    var mailparser = new MailParser({
      streamAttachments: true
    });

    stream.pipe(mailparser);

    mailparser.on('end', (function(users, mail) {
      mail.receivedAt = new Date().toISOString();
      log('Received message for', users, mailSummary(mail));
      users.forEach(function(user) {
        // Divert special admin-type addresses into local files
        const specialUser = isSpecialUser(user);
        if (specialUser) {
          const mailfile = path.join(TMP_DIR, 'restmail-' + specialUser);
          log(new Date().toISOString() + 'appending to', mailfile);
          fs.appendFileSync(mailfile, JSON.stringify(mail) + '\n');
          return;
        }

        db.rpush(user, JSON.stringify(mail), function(err) {
          if (err) {
            return logError(err);
          }

          if (config.expireAfter) {
            db.expire(user, config.expireAfter);
          }

          db.llen(user, function(err, replies) {
            if (err) {
              return logError(err);
            }

            if (replies > 10) {
              db.ltrim(user, -10, -1, function(err) {
                if (err) {
                  return logError(err);
                }
              });
            }
          });
        });
      });
    }).bind(null, users));

    ack.accept(354, 'OK');
    users = [];
  });

  req.on('rset', function() {
    users = [];
  });

  req.on('command', function(cmd, r) {
    if (cmd.name === 'noop') {
      log(new Date().toISOString() + ' oncommand ' + JSON.stringify(cmd));
      r.preventDefault();
      r.write(250);
      r.next();
    }
  });
});

// handle starting from the command line or the test harness
if (process.argv[1] === __filename) {
  var port = process.env.PORT || 9025;
  log('Starting up on port', port);
  server.listen(port);
} else {
  module.exports = function(cb) {
    var port = process.env.PORT || 0;
    server.listen(port, function(err) {
      cb(err, server.address().port);
    });
  };
}
