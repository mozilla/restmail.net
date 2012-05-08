var express = require('express'),
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
app.get('/mail/:user', function(req, res) {
  db.lrange(req.params.user, -10, -1, function(err, replies) {
    if (err) {
      console.log("ERROR", err);
      res.send(500); 
    } else {
      res.json(replies);
    }
  });
});

app.put('/clear/:user', function(req, res) {
  db.ltrim(user, 0, -1, function(err) {
    res.send(err ? 500 : 200);
  });
});

app.use(express.static(__dirname + "/static"));

app.listen(process.env['PORT'] || 8080, '0.0.0.0');
