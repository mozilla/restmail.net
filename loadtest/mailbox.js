var P = require('bluebird');
var request = require('request');
var url = require('url');

var log = require('./log');

module.exports = function (port) {
  var interval = 500;
  var maxTries = 10;

  function checkEmail(json, to) {
    if (!Array.isArray(json)) {
      return new Error('Mailbox is not an Array');
    }

    if (json.length > 1) {
      return new Error('Mailbox has more than one email ' + json.length);
    }

    // mail has not arrived yet
    if (json.length === 0) {
      return false;
    }

    if (json[0].to[0].address !== to) {
      log('Unexpected to address', json[0].to[0].address !== to);
      return new Error('Unexpected to address' + json[0].to[0].address + '/' + to);
    }

    return true;
  }

  function loop(email, tries, cb) {
    var uri = url.format({
      protocol: 'http',
      hostname: '127.0.0.1',
      port: port,
      pathname: '/mail/' + email
    });

    log('checking mail', uri);

    var options = { uri: uri, json: true };

    request.get(options, function (err, res, json) {
      log('mail status', res && res.statusCode, 'tries', tries);

      var emailState = checkEmail(json, email);

      if (emailState instanceof Error) {
        return cb(emailState);
      }

      if(!emailState) {
        if (tries === 0) {
          return cb(new Error('could not get mail for ' + uri));
        }
        return setTimeout(loop.bind(null, email, --tries, cb), interval);
      }

      log('deleting mail', uri);
      request.del(options, function (err /*, res, body */) {
        cb(err, json);
      });
    });
  }

  function waitForEmail(email) {
    var dfd = P.defer();

    loop(email, maxTries, function (err, json) {
      if (err) {
        return dfd.reject(err);
      }
      return dfd.resolve(json);
    });

    return dfd.promise;
  }

  return {
    waitForEmail: waitForEmail,
  };
};
