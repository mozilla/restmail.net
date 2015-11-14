var path = require('path');
var spawn = require('child_process').spawn;

var P = require('bluebird');

var log = require('./log');
var mailbox = require('./mailbox');
var sendmail = require('./sendmail');

var webserver;
var emailserver;
var ready = {
  webserver: false,
  emailserver: false
};

var startTime;
var lastSendTime;

var emailSent = 0;
var emailRetrieved = 0;
var errors = 0;

var mailSenders = 5;
var mailSenderInterval = 80;
var testDuration = 60000;
var mailSenderTasks = [];
var waitForEmail;

function setupChild(child, name) {
  [ 'stdout', 'stderr' ].forEach(function(io) {
    child[io].on('data', function(buf) {
      if (process.env.LOG_TO_CONSOLE) {
        buf.toString().split('\n').forEach(function(ln) {
          var line = ln.trim();
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
  var dfd = P.defer();

  webserver = spawn('node', [ path.join(__dirname, '..', 'webserver.js') ]);
  setupChild(webserver, 'webserver');

  emailserver = spawn('node', [ path.join(__dirname, '..', 'emailserver.js') ]);
  setupChild(emailserver, 'emailserver');

  var waitForStartup = setInterval(function() {
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
  var user = (Math.random() * 1e16).toFixed(0);
  return user + '@' + (domain || 'example.com');
}

function sendEmail(port) {
  var email = randomEmailAddress();
  var from = randomEmailAddress();

  function onError(err) {
    errors += 1;
    log(err);
  }

  function onSuccess() {
    log(email, 'successfully sent');
    emailSent += 1;

    waitForEmail(email).then(
      function() {
        log(email, 'successfully retrieved');
        emailRetrieved += 1;
      }, onError);
  }

  lastSendTime = new Date();
  sendmail('127.0.0.1', port, from, email)
    .then(onSuccess, onError);
}

function startMailSenderTask(ports) {
  var task = setInterval(sendEmail.bind(null, ports.smtp), mailSenderInterval);
  mailSenderTasks.push(task);
}

function stopMailSenderTasks() {
  mailSenderTasks.forEach(function(task) {
    clearInterval(task);
  });

  setInterval(function() {
    var duration = Date.now() - startTime.getTime();
    var sentPerSecond = (1000 * emailSent / duration).toFixed(2);
    var retrievedPerSecond = (1000 * emailRetrieved / duration).toFixed(2);
    var completionTime = Date.now() - lastSendTime.getTime();

    var format = ("[" + new Date().toISOString() + "] " +
                  "result: %semails (%srps) %semails (%srps), " + 
                  "errors: %s, completionTime: %sms, " + 
                  "startTime: %s, lastSendTime: %s, now: %s\n");

    console.log(format,
                emailSent,
                sentPerSecond,
                emailRetrieved,
                retrievedPerSecond,
                errors,
                completionTime,
                startTime.toISOString(),
                lastSendTime.toISOString(),
                new Date().toISOString());

    if (emailSent === emailRetrieved) {
      webserver.kill();
      emailserver.kill();
      process.exit();
    }
  }, 250);
}

startServers().then(function(ports) {
  log('started with webserver on %s and emailserver on %s',
      ports.http, ports.smtp);

  var options = { maxTries: 5 };
  waitForEmail = mailbox(ports.http, options).waitForEmail;

  startTime = new Date();
  for (var i = 0; i < mailSenders; ++i) {
    startMailSenderTask(ports);
  }

  setTimeout(stopMailSenderTasks, testDuration);
});
