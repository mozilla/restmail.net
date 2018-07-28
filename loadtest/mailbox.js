'use strict';

const P = require('bluebird');
const request = require('request');
const url = require('url');

const log = require('./log');

function debug() {
  return;
  const args = Array.prototype.slice.call(arguments);
  log.apply(null, args);
}

module.exports = function (port, options) {
  const interval = options.interval || 500;
  const maxTries = options.maxTries = options.maxTries || 10;

  function checkEmail(json, to) {
    if (! Array.isArray(json)) {
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
    const uri = url.format({
      protocol: 'http',
      hostname: '127.0.0.1',
      port: port,
      pathname: '/mail/' + email
    });

    debug('checking mail', uri);

    const requestOptions = { uri: uri, json: true };
    request.get(requestOptions, function (err, res, json) {
      if (err) {
        return cb(err);
      }

      if (tries < options.maxTries - 1) {
        log('mail status', res && res.statusCode, 'tries', tries);
      }

      const emailState = checkEmail(json, email);

      if (emailState instanceof Error) {
        return cb(emailState);
      }

      if(! emailState) {
        if (tries === 0) {
          return cb(new Error('could not get mail for ' + uri));
        }
        return setTimeout(loop.bind(null, email, --tries, cb), interval);
      }

      debug('deleting mail', uri);
      request.del(requestOptions, function (err /*, res, body */) {
        cb(err, json);
      });
    });
  }

  function waitForEmail(email) {
    const dfd = P.defer();

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
