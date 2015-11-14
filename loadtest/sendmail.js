var crypto = require('crypto');
var P = require('bluebird');
var smtp = require('smtp-protocol');

var defaultMessage = (function() {
  var str = '';
  var count = Math.floor(4096 / 80);
  for (var i = 0; i < count; ++i) {
    str += crypto.randomBytes(40).toString('hex') + '\n';
  }
  return str;
})();

module.exports = function sendmail(host, port, from, to, message) {
  var dfd = P.defer();

  message = message || defaultMessage;

  function onComplete(mail, err) {
    if (err) {
      mail.quit();
      return dfd.reject(err);
    }
    mail.quit();
    return dfd.resolve();
  }

  smtp.connect(host, port, function (mail) {
    var msg = [
      "From: " + from,
      "To: " + to,
      "",
      message,
      "."
    ].join('\n');

    mail.helo('example.com');
    mail.from(from);
    mail.to(to);
    mail.data();
    var msgstream = mail.message(onComplete.bind(null, mail));
    msgstream.write(msg);
    msgstream.end();
  });

  return dfd.promise;
};
