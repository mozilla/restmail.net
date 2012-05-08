var smtp = require('smtp-protocol'),
   redis = require("redis");

// create a connection to the redis datastore
var db = redis.createClient();

function loggit(err) {
  console.log("ERROR (oh noes!):", err);
}

var server = smtp.createServer(function (req) {
  req.on('to', function (to, ack) {
    // accept everything
    ack.accept();
  });

  req.on('message', function (stream, ack) {
    var data = 'from: ' + req.from + "\n" +
               'to: ' + req.to + "\n\n";

    stream.on('data', function(chunk) {
      data += chunk;
    });

    stream.on('end', function(chunk) {
      var user = req.to.split('@')[0];

      db.rpush(user, data, function(err) {
        if (err) return loggit(err);

        db.llen(user, function(err, replies) {
          if (err) return loggit(err);

          if (replies > 10) db.ltrim(user, -10, -1, function(err) {
            if (err) return loggit(err);
          });
        });
      });
    });

    ack.accept();
  });
});

server.listen(9025);
