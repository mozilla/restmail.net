#!/usr/bin/env node

const express = require('express');
const morgan = require('morgan');
const redis = require('redis');
const http = require('http');
const path = require('path');

const config = require('./config');
const { isSpecialUser } = require('./util');

const HOSTNAME = process.env.EMAIL_HOSTNAME || 'restmail.net';
const IS_TEST = process.env.NODE_ENV === 'test';

// create a connection to the redis datastore
var db = redis.createClient();

db.on('error', function (err) {
  db = null;
  if (IS_TEST) {
    console.log(new Date().toISOString() + ': redis error! the server ' +
                "won't actually store anything!  this is just fine for local dev");
  } else {
    console.log(new Date().toISOString() + ': FATAL: redis server error: ' + err);
    console.log(new Date().toISOString() + ': Exiting due to fatal error...');
    process.exit(1);
  }
});

var app = express();

// log to console when not testing
if (! IS_TEST) {
  app.use(morgan('combined'));
}

app.get('/README', function(req, res) {
  res.set('Content-Type', 'text/plain');
  res.sendFile(path.join(__dirname, 'README.md'));
});

// automatically make user part only input into email with
// default hostname.
function canonicalize(email) {
  if (email.indexOf('@') === -1) {
    email = email + '@' + HOSTNAME;
  }
  return email;
}

// the 'todo/get' api gets the current version of the todo list
// from the server
app.get('/mail/:user', function(req, res) {
  if (! db) {
    return IS_TEST ? res.json([]) : res.status(500).end();
  }

  req.params.user = canonicalize(req.params.user);

  // Don't return mailboxes for special admin-type addresses
  const specialUser = isSpecialUser(req.params.user);
  if (specialUser) {
    return res.json([]);
  }

  db.lrange(req.params.user, -10, -1, function(err, replies) {
    if (err) {
      console.log(new Date().toISOString() + ': ERROR', err);
      res.status(500).end();
    } else {
      var arr = [];
      replies.forEach(function (r) {
        try {
          arr.push(JSON.parse(r));
        } catch (e) { }
      });
      res.set('Content-Type', 'application/json');
      res.send(JSON.stringify(arr, undefined, 2));
    }
  });
});

app.delete('/mail/:user', function(req, res) {
  if (! db) {
    return res.status(IS_TEST ? 200 : 500).end();
  }

  req.params.user = canonicalize(req.params.user);

  db.del(req.params.user, function(err) {
    res.status(err ? 500 : 200).end();
  });
});

app.use(express.static(__dirname + '/website'));

// handle starting from the command line or the test harness
if (process.argv[1] === __filename) {
  var port = process.env['PORT'] || 8080;
  console.log(`[${new Date().toISOString()}]: Starting up on port ${port} ${JSON.stringify(config)}`);
  app.listen(port);
} else {
  module.exports = function(cb) {
    var server = http.createServer(app);
    server.listen(function() {
      var port = server.address().port;
      console.log(`[${new Date().toISOString()}]: Starting up on port ${port} ${JSON.stringify(config)}`);
      cb(null, port);
    });
  };
}
