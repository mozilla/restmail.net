var smtp = require('smtp-protocol'),
   redis = require("redis"),
   MailParser = require("mailparser").MailParser;

// create a connection to the redis datastore
var db = redis.createClient();

function loggit(err) {
  console.log("ERROR (oh noes!):", err);
}

var server = smtp.createServer('restmail.net', function (req) {
  ['rcpt', 'mail', 'to', 'from'].forEach(function(event)  {
    req.on(event, function () {
      var ack = arguments[arguments.length - 1];
      ack.accept(250, "OK");
    });
  });

  req.on('greeting', function (to, ack) {
    ack.accept(250, " ");
  });

  req.on('message', function (stream, ack) {
    var mailparser = new MailParser({
      streamAttachments: true
    });

    stream.pipe(mailparser);

    mailparser.on('end', function(mail) {
      mail.receivedAt = new Date().toISOString();
      var user = req.to.split('@')[0];
      db.rpush(user, JSON.stringify(mail), function(err) {
        if (err) return loggit(err);

        db.llen(user, function(err, replies) {
          if (err) return loggit(err);

          if (replies > 10) db.ltrim(user, -10, -1, function(err) {
            if (err) return loggit(err);
          });
        });
      });
    });

    ack.accept(354, 'OK');
  });
});

// handle starting from the command line or the test harness
if (process.argv[1] === __filename) {
  server.listen(process.env['PORT'] || 9025);
} else {
  module.exports = function(cb) {
    server.listen(0, function(err) {
      cb(err, server.address().port);
    });
  };
}
