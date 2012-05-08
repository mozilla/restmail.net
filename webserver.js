var express = require('express'),
      https = require('https'),
      redis = require("redis");

// create a connection to the redis datastore
var db = redis.createClient();

db.on("error", function (err) {
  db = null;
  console.log("redis error!  the server won't actually store anything!  this is just fine for local dev");
});

var app = express.createServer(
  express.logger()
);

// the 'todo/get' api gets the current version of the todo list
// from the server
app.get('/get/:user', function(req, res) {
  res.send(req.params.user);
});

app.use(express.static(__dirname + "/static"));

app.listen(process.env['PORT'] || 8080, '0.0.0.0');
