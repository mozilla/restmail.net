process.env.NODE_ENV = 'test';

const should = require('should');
const http = require('http');
const net = require('net');
const webserver = require('../webserver.js');
const emailserver = require('../emailserver.js');

var emailPort = -1;
var webPort = -1;

function requestOptions(method, path) {
  return {
    host: '127.0.0.1',
    method: method,
    path: path,
    port: webPort
  };
}

describe('the test servers', function() {
  it('should start up', function(done) {
    webserver(function(err, port) {
      should.not.exist(err);
      (port).should.be.ok;
      webPort = port;
      emailserver(function(err, port) {
        should.not.exist(err);
        (port).should.be.ok;
        emailPort = port;
        done();
      });
    });
  });
});

describe('loading main page', function() {
  it('should work', function(done) {
    http.request(requestOptions('GET', '/'), (res) => {
      (res.statusCode).should.equal(200);
      done();
    }).end();
  });
});

describe('loading main page content path /README', function() {
  it('should work', function(done) {
    http.request(requestOptions('GET', '/README'), (res) => {
      (res.statusCode).should.equal(200);
      done();
    }).end();
  });
});

describe('clearing email', function() {
  it('should work', function(done) {
    http.request(requestOptions('DELETE', '/mail/me@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      done();
    }).end();
  });
});

describe('sending email', function() {
  it('should work', function(done) {
    var s = net.connect(emailPort, function(err) {
      should.not.exist(err);

      var response = '';
      s.on('data', (chunk) => response += chunk);

      s.on('end', function() {
        response.split('\r\n')[6].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      const sequence = [
        'helo',
        'mail from: <lloyd@localhost>',
        'rcpt to: <me@localhost>',
        'data',
        'from: lloyd <lloyd@localhost>',
        'to: me <me@localhost>',
        '',
        'hi',
        '.',
        'quit',
        ''
      ].join('\n') + '\n';

      s.end(sequence);
    });
  });
});

describe('web apis', function() {
  it('should return mail via complete email address', function(done) {
    http.request(requestOptions('GET', '/mail/me@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(1);
        data = data[0];
        data.text.should.equal('hi\n');
        data.receivedAt.should.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        data.from[0].address.should.equal('lloyd@localhost');
        data.from[0].name.should.equal('lloyd');
        data.to[0].address.should.equal('me@localhost');
        data.to[0].name.should.equal('me');
        Object.keys(data.headers).length.should.equal(2);
        done();
      });
    }).end();
  });
});

describe('sending to multiple recipients', function() {
  it('should work', function(done) {
    var s = net.connect(emailPort, function(err) {
      should.not.exist(err);

      var response = '';
      s.on('data', (chunk) => response += chunk);

      s.on('end', function() {
        response.split('\r\n')[7].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      const sequence = [
        'helo',
        'mail from: <lloyd@localhost>',
        'rcpt to: <me@localhost>',
        'rcpt to: <you@localhost>',
        'data',
        'from: lloyd <lloyd@localhost>',
        'to: me <me@localhost>',
        'cc: you <you@localhost>',
        '',
        'hi',
        '.',
        'quit',
        ''
      ].join('\n') + '\n';

      s.end(sequence);
    });
  });
});

describe('web apis', function() {
  it('should return mail for the to: address', function(done) {
    http.request(requestOptions('GET', '/mail/me@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(2);
        data = data[1];
        data.text.should.equal('hi\n');
        data.receivedAt.should.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        data.from[0].address.should.equal('lloyd@localhost');
        data.from[0].name.should.equal('lloyd');
        data.to[0].address.should.equal('me@localhost');
        data.to[0].name.should.equal('me');
        data.cc[0].address.should.equal('you@localhost');
        data.cc[0].name.should.equal('you');
        Object.keys(data.headers).length.should.equal(3);
        done();
      });
    }).end();
  });

  it('should return mail for the cc: address', function(done) {
    http.request(requestOptions('GET', '/mail/you@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(1);
        data = data[0];
        data.text.should.equal('hi\n');
        data.receivedAt.should.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        data.from[0].address.should.equal('lloyd@localhost');
        data.from[0].name.should.equal('lloyd');
        data.to[0].address.should.equal('me@localhost');
        data.to[0].name.should.equal('me');
        data.cc[0].address.should.equal('you@localhost');
        data.cc[0].name.should.equal('you');
        Object.keys(data.headers).length.should.equal(3);
        done();
      });
    }).end();
  });
});

describe('sending two mails on the same TCP connection', function() {
  it('should work', function(done) {
    var s = net.connect(emailPort, function(err) {
      should.not.exist(err);

      var response = '';
      s.on('data', (chunk) => response += chunk);

      s.on('end', function() {
        response.split('\r\n')[10].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      const sequence = [
        'helo',
        'mail from: <lloyd@localhost>',
        'rcpt to: <me@localhost>',
        'data',
        'from: lloyd <lloyd@localhost>',
        'to: me <me@localhost>',
        '',
        'hello',
        '.',
        'mail from: <me@localhost>',
        'rcpt to: <you@localhost>',
        'data',
        'from: me <me@localhost>',
        'to: you <you@localhost>',
        '',
        'world',
        '.',
        'quit',
        ''
      ].join('\n') + '\n';

      s.end(sequence);
    });
  });
});

describe('web apis', function() {
  it('should return new mail for the address from the first delivery', function(done) {
    http.request(requestOptions('GET', '/mail/me@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(3);
        data = data[2];
        data.text.should.equal('hello\n');
        data.receivedAt.should.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        data.from[0].address.should.equal('lloyd@localhost');
        data.from[0].name.should.equal('lloyd');
        data.to[0].address.should.equal('me@localhost');
        data.to[0].name.should.equal('me');
        Object.keys(data.headers).length.should.equal(2);
        done();
      });
    }).end();
  });

  it('should return new mail for the address from the second delivery', function(done) {
    http.request(requestOptions('GET', '/mail/you@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(2);
        data = data[1];
        data.text.should.equal('world\n');
        data.receivedAt.should.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        data.from[0].address.should.equal('me@localhost');
        data.from[0].name.should.equal('me');
        data.to[0].address.should.equal('you@localhost');
        data.to[0].name.should.equal('you');
        Object.keys(data.headers).length.should.equal(2);
        done();
      });
    }).end();
  });
});

//
// START: redirect some well-known admin addresses out of redis
//
describe('sending email to some well-known admin addresses', function() {
  it('should appear to work', function(done) {
    var s = net.connect(emailPort, function(err) {
      should.not.exist(err);

      var response = '';
      s.on('data', (chunk) => response += chunk);

      s.on('end', function() {
        response.split('\r\n')[6].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      const sequence = [
        'helo',
        'mail from: <lloyd@localhost>',
        'rcpt to: <hostmaster@localhost>',
        'data',
        'from: lloyd <lloyd@localhost>',
        'to: me <hostmaster@localhost>',
        '',
        'hi',
        '.',
        'quit',
        ''
      ].join('\n') + '\n';

      s.end(sequence);
    });
  });
});

describe('web apis', function() {
  it('should not though return mail via complete email address', function(done) {
    http.request(requestOptions('GET', '/mail/hostmaster@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(0);
        done();
      });
    }).end();
  });
});

describe('sending to multiple "admin" recipients', function() {
  it('should appear to work', function(done) {
    var s = net.connect(emailPort, function(err) {
      should.not.exist(err);

      var response = '';
      s.on('data', (chunk) => response += chunk);

      s.on('end', function() {
        response.split('\r\n')[7].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      const sequence = [
        'helo',
        'mail from: <lloyd@localhost>',
        'rcpt to: <administrator@localhost>',
        'rcpt to: <webmaster@localhost>',
        'data',
        'from: lloyd <lloyd@localhost>',
        'to: Administrator <administrator@localhost>',
        'cc: Webmaster <webmaster@localhost>',
        '',
        'hi',
        '.',
        'quit',
        ''
      ].join('\n') + '\n';

      s.end(sequence);
    });
  });
});

describe('web apis', function() {
  it('should not return "admin" mail for the to: address', function(done) {
    http.request(requestOptions('GET', '/mail/administrator@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(0);
        done();
      });
    }).end();
  });

  it('should not return "admin" mail for the cc: address', function(done) {
    http.request(requestOptions('GET', '/mail/webmaster@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(0);
        done();
      });
    }).end();
  });
});

describe('sending two "admin" mails on the same TCP connection', function() {
  it('should work', function(done) {
    var s = net.connect(emailPort, function(err) {
      should.not.exist(err);

      var response = '';
      s.on('data', (chunk) => response += chunk);

      s.on('end', function() {
        response.split('\r\n')[10].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      const sequence = [
        'helo',
        'mail from: <lloyd@localhost>',
        'rcpt to: <admin@localhost>',
        'data',
        'from: lloyd <lloyd@localhost>',
        'to: admin <admin@localhost>',
        '',
        'hello',
        '.',
        'mail from: <admin@localhost>',
        'rcpt to: <postmaster@localhost>',
        'data',
        'from: admin <admin@localhost>',
        'to: postmaster <postmaster@localhost>',
        '',
        'world',
        '.',
        'quit'
      ].join('\n') + '\n';

      s.end(sequence);
    });
  });
});

describe('web apis', function() {
  it('should not return new "admin" mail for the address from the first delivery', function(done) {
    http.request(requestOptions('GET', '/mail/admin@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(0);
        done();
      });
    }).end();
  });

  it('should not return new "admin" mail for the address from the second delivery', function(done) {
    http.request(requestOptions('GET', '/mail/postmaster@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(0);
        done();
      });
    }).end();
  });
});
//
// END: redirect some well-known admin addresses out of redis
//

describe('the SMTP RSET and NOOP commands', function() {
  it('should be supported', function(done) {
    var s = net.connect(emailPort, function(err) {
      should.not.exist(err);

      var response = '';
      s.on('data', (chunk) => response += chunk);

      s.on('end', function() {
        var lines = response.split('\r\n');
        lines[3].should.equal('250 OK');
        lines[4].should.equal('250');
        lines[11].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      const sequence = [
        'helo',
        'mail from: <lloyd@localhost>',
        'rcpt to: <me@localhost>',
        'rset',
        'mail from: <me@localhost>',
        'noop',
        'rcpt to: <you@localhost>',
        'data',
        'from: me <me@localhost>',
        'to: you <you@localhost>',
        '',
        'just4you',
        '.',
        'noop',
        'quit',
        ''
      ].join('\n') + '\n';

      s.end(sequence);
    });
  });
});

describe('web apis', function() {
  it('should show that mail was not delivered after a reset', function(done) {
    http.request(requestOptions('GET', '/mail/me@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(3);
        done();
      });
    }).end();
  });

  it('should return new mail delivered after a reset', function(done) {
    http.request(requestOptions('GET', '/mail/you@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(3);
        data = data[2];
        data.text.should.equal('just4you\n');
        data.receivedAt.should.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        data.from[0].address.should.equal('me@localhost');
        data.from[0].name.should.equal('me');
        data.to[0].address.should.equal('you@localhost');
        data.to[0].name.should.equal('you');
        Object.keys(data.headers).length.should.equal(2);
        done();
      });
    }).end();
  });
});

describe('clearing email', function() {
  it('should work', function(done) {
    http.request(requestOptions('DELETE', '/mail/me@localhost'), (res) => {
      (res.statusCode).should.equal(200);
      http.request(requestOptions('DELETE', '/mail/you@localhost'), (res) => {
        (res.statusCode).should.equal(200);
        done();
      }).end();
    }).end();
  });

  it('should cause GET to return zero mails', function(done) {
    http.request(requestOptions('GET', '/mail/me'), (res) => {
      (res.statusCode).should.equal(200);
      var data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(0);
        done();
      });
    }).end();
  });
});
