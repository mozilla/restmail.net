'use strict';

const path = require('path');
const spawn = require('child_process').spawn;
const util = require('util');

const P = require('bluebird');

const config = require('../lib/config');
const log = require('./log');
const mailbox = require('./mailbox');
const sendmail = require('./sendmail');

let webserver;
let emailserver;
let waitForEmail;

const ready = {
  emailserver: false,
  webserver: false
};

const mailSenderTasks = [];

const stats = {
  emailRetrieved: 0,
  emailSent: 0,
  errors: 0,
  lastSendTime: new Date(),
  startTime: new Date()
};

function debug() {
  if (! config.loadtest.debug) {
    return;
  }

  const args = Array.prototype.slice.call(arguments);
  log.apply(null, args);
}

function setupChild(child, name) {
  [ 'stdout', 'stderr' ].forEach(function(io) {
    child[io].on('data', function(buf) {
      if (config.loadtest.logToConsole) {
        buf.toString().split('\n').forEach(function(ln) {
          const line = ln.trim();
          if (line.length) {
            console.log(line);
          }
        });
      }
      ready[name] = true;
    });
  });
}

function startServers() {
  const dfd = P.defer();

  webserver = spawn('node', [ path.join(__dirname, '..', 'bin', 'webserver.js') ]);
  setupChild(webserver, 'webserver');

  emailserver = spawn('node', [ path.join(__dirname, '..', 'bin', 'emailserver.js') ]);
  setupChild(emailserver, 'emailserver');

  const waitForStartup = setInterval(function() {
    if (ready.webserver && ready.emailserver) {
      clearInterval(waitForStartup);
      return dfd.resolve({
        http: 8080,
        smtp: 9025
      });
    }
  }, 250);

  return dfd.promise;
}

function randomEmailAddress(domain) {
  const user = (Math.random() * 1e16).toFixed(0);
  return user + '@' + (domain || 'example.com');
}

function sendEmail(port) {
  const email = randomEmailAddress();
  const from = randomEmailAddress();

  function onError(err) {
    stats.errors += 1;
    log(err);
  }

  function onSuccess() {
    debug(email, 'successfully sent');
    stats.emailSent += 1;

    waitForEmail(email).then(
      function() {
        debug(email, 'successfully retrieved');
        stats.emailRetrieved += 1;
      }, onError);
  }

  stats.lastSendTime = new Date();
  debug(`sending ${port} ${from} ${email}`);
  sendmail('127.0.0.1', port, from, email)
    .then(onSuccess, onError);
}

function startMailSenderTask(smtpPort, options) {
  const task = setInterval(sendEmail.bind(null, smtpPort), options.interval);
  mailSenderTasks.push(task);
}

function stopMailSenderTasks() {
  mailSenderTasks.forEach(function(task) {
    clearInterval(task);
  });

  setInterval(function() {
    const duration = Date.now() - stats.startTime.getTime();
    const sentPerSecond = (1000 * stats.emailSent / duration).toFixed(2);
    const retrievedPerSecond = (1000 * stats.emailRetrieved / duration).toFixed(2);
    const completionTime = Date.now() - stats.lastSendTime.getTime();

    const format = ('result: %semails (%srps) %semails (%srps), ' +
                    'errors: %s, completionTime: %sms, ' +
                    'startTime: %s, lastSendTime: %s, now: %s\n');
    const message = util.format(format,
                                stats.emailSent,
                                sentPerSecond,
                                stats.emailRetrieved,
                                retrievedPerSecond,
                                stats.errors,
                                completionTime,
                                stats.startTime.toISOString(),
                                stats.lastSendTime.toISOString(),
                                new Date().toISOString());
    log(message);

    if (stats.emailSent === stats.emailRetrieved) {
      webserver.kill();
      emailserver.kill();
      process.exit();
    }
  }, 250);
}

function run(options) {
  startServers().then(function(ports) {
    log('started with webserver on %s and emailserver on %s [%s %s %s]',
        ports.http, ports.smtp, options.duration, options.interval, options.workers);

    const mailerOptions = { maxTries: 5 };
    waitForEmail = mailbox(ports.http, mailerOptions).waitForEmail;

    stats.startTime = new Date();
    for (let i = 0; i < options.workers; ++i) {
      startMailSenderTask(ports.smtp, options);
    }

    setTimeout(stopMailSenderTasks, options.duration);
  });
}

module.exports = run;
