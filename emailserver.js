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
    console.log("getting mail body to", req.to);

    var mailparser = new MailParser({
      streamAttachments: true,
      debug: true
    });

    stream.pipe(mailparser);

    mailparser.on('end', function(mail) {
      var user = req.to.split('@')[0];
      console.log(user, mail);
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

server.listen(9025);
