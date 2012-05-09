var smtp = require('smtp-protocol'),
   redis = require("redis"),
   MailParser = require("mailparser").MailParser;

// create a connection to the redis datastore
var db = redis.createClient();

function loggit(err) {
  console.log("ERROR (oh noes!):", err);
}

var server = smtp.createServer('restmail.net', function (req) {
  req.on('to', function (to, ack) {
    console.log("got mail for", to); 
    // accept everything
    ack.accept();
  });

  req.on('message', function (stream, ack) {
    console.log("getting mail body to", req.to);

    var mailparser = new require("mailparser").MailParser({
      streamAttachments: true,
      debug: true
    });

    stream.pipe(mailparser);

    mailparser.on('end', function(mail) {
      console.log(mail);
      db.rpush(user, mail.toString(), function(err) {
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
