'use strict';

const path = require('path');
const spawn = require('child_process').spawn;
const util = require('util');

const P = require('bluebird');

const log = require('./log');
const mailbox = require('./mailbox');
const sendmail = require('./sendmail');

let webserver;
let emailserver;
let waitForEmail;

const ready = {
  webserver: false,
  emailserver: false
};

const mailSenderTasks = [];

const stats = {
  errors: 0,
  emailSent: 0,
  emailRetrieved: 0,
  startTime: new Date(),
  lastSendTime: new Date()
};

function debug() {
  return;
  const args = Array.prototype.slice.call(arguments);
  log.apply(null, args);
}

function setupChild(child, name) {
  [ 'stdout', 'stderr' ].forEach(function(io) {
    child[io].on('data', function(buf) {
      if (process.env.LOG_TO_CONSOLE) {
        buf.toString().split('\n').forEach(function(ln) {
          let line = ln.trim();
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
  let dfd = P.defer();

  webserver = spawn('node', [ path.join(__dirname, '..', 'webserver.js') ]);
  setupChild(webserver, 'webserver');

  emailserver = spawn('node', [ path.join(__dirname, '..', 'emailserver.js') ]);
  setupChild(emailserver, 'emailserver');

  let waitForStartup = setInterval(function() {
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
  let user = (Math.random() * 1e16).toFixed(0);
  return user + '@' + (domain || 'example.com');
}

function sendEmail(port) {
  let email = randomEmailAddress();
  let from = randomEmailAddress();

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
  sendmail('127.0.0.1', port, from, email)
    .then(onSuccess, onError);
}

function startMailSenderTask(smtpPort, options) {
  let task = setInterval(sendEmail.bind(null, smtpPort), options.interval);
  mailSenderTasks.push(task);
}

function stopMailSenderTasks() {
  mailSenderTasks.forEach(function(task) {
    clearInterval(task);
  });

  setInterval(function() {
    let duration = Date.now() - stats.startTime.getTime();
    let sentPerSecond = (1000 * stats.emailSent / duration).toFixed(2);
    let retrievedPerSecond = (1000 * stats.emailRetrieved / duration).toFixed(2);
    let completionTime = Date.now() - stats.lastSendTime.getTime();

    let format = ("result: %semails (%srps) %semails (%srps), " +
                  "errors: %s, completionTime: %sms, " +
                  "startTime: %s, lastSendTime: %s, now: %s\n");
    log(util.format(format,
                    stats.emailSent,
                    sentPerSecond,
                    stats.emailRetrieved,
                    retrievedPerSecond,
                    stats.errors,
                    completionTime,
                    stats.startTime.toISOString(),
                    stats.lastSendTime.toISOString(),
                    new Date().toISOString()));

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

    let mailerOptions = { maxTries: 5 };
    waitForEmail = mailbox(ports.http, mailerOptions).waitForEmail;

    stats.startTime = new Date();
    for (let i = 0; i < options.workers; ++i) {
      startMailSenderTask(ports.smtp, options);
    }

    setTimeout(stopMailSenderTasks, options.duration);
  });
}

module.exports = run;
