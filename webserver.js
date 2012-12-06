var express = require('express'),
      redis = require("redis"),
         fs = require('fs');

const HOSTNAME = process.env['EMAIL_HOSTNAME'] || "restmail.net";

// create a connection to the redis datastore
var db = redis.createClient();

db.on("error", function (err) {
  db = null;
  console.log("redis error!  the server won't actually store anything!  this is just fine for local dev");
});

var app = express.createServer();

// log to console when not testing
if (process.env.NODE_ENV !== 'test') app.use(express.logger());

app.get('/README', function(req, res) {
  res.setHeader('Content-Type', 'text/plain');
  res.sendfile(__dirname + '/README.md');
});

// automatically make user part only input into email with
// default hostname.
function canonicalize(email) {
  if (email.indexOf('@') === -1) email = email + '@' + HOSTNAME;
  return email;
}

// the 'todo/get' api gets the current version of the todo list
// from the server
app.get('/mail/:user', function(req, res) {
  if (!db) res.json([]);

  req.params.user = canonicalize(req.params.user);

  db.lrange(req.params.user, -10, -1, function(err, replies) {
    if (err) {
      console.log("ERROR", err);
      res.send(500);
    } else {
      var arr = [];
      replies.forEach(function (r) {
        try {
          arr.push(JSON.parse(r));
        } catch(e) { }
      });
      res.json(arr);
    }
  });
});

app.delete('/mail/:user', function(req, res) {
  if (!db) res.send(200);

  req.params.user = canonicalize(req.params.user);

  db.del(req.params.user, function(err) {
    res.send(err ? 500 : 200);
  });
});

app.use(express.static(__dirname + "/website"));

// handle starting from the command line or the test harness
if (process.argv[1] === __filename) {
  app.listen(process.env['PORT'] || 8080);
} else {
  module.exports = function(cb) {
    app.listen(0, function(err) {
      cb(err, app.address().port);
    });
  };
}
