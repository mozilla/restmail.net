'use strict';

const crypto = require('crypto');
const P = require('bluebird');
const smtp = require('smtp-protocol');

const defaultMessage = (function() {
  let str = '';
  let count = Math.floor(4096 / 80);
  for (let i = 0; i < count; ++i) {
    str += crypto.randomBytes(40).toString('hex') + '\n';
  }
  return str;
})();

module.exports = function sendmail(host, port, from, to, message) {
  const dfd = P.defer();

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
    const msg = [
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
    const msgstream = mail.message(onComplete.bind(null, mail));
    msgstream.write(msg);
    msgstream.end();
  });

  return dfd.promise;
};
