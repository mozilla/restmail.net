/*global it:true describe:true */
process.env.NODE_ENV = 'test';

const
should = require('should'),
http = require('http'),
net = require('net'),
webserver = require('./webserver.js'),
emailserver = require('./emailserver.js');

var emailPort = -1;
var webPort = -1;

describe('the test servers', function() {
  it('should start up', function(done) {
    /*jshint expr:true */
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
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/',
      method: 'GET'
    }, function(res) {
      (res.statusCode).should.equal(200);
      done();
    }).end();
  });
});

describe('loading main page content path /README', function() {
  it('should work', function(done) {
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/README',
      method: 'GET'
    }, function(res) {
      (res.statusCode).should.equal(200);
      done();
    }).end();
  });
});

describe('clearing email', function() {
  it('should work', function(done) {
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/mail/me@localhost',
      method: 'DELETE'
    }, function(res) {
      (res.statusCode).should.equal(200);
      done();
    }).end();
  });
});

describe('sending email', function() {
  it('should work', function(done) {
    var s = net.connect(emailPort, function(err) {
      should.not.exist(err);

      var response = "";
      s.on('data', function(chunk) { response += chunk; });

      s.on('end', function() {
        response.split('\r\n')[6].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      s.end("helo\nmail from: <lloyd@localhost>\nrcpt to: <me@localhost>\ndata\nfrom: lloyd <lloyd@localhost>\nto: me <me@localhost>\n\nhi\n.\nquit\n");
    });
  });
});

describe('web apis', function() {
  it('should return mail via complete email address', function(done) {
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/mail/me@localhost',
      method: 'GET'
    }, function(res) {
      (res.statusCode).should.equal(200);
      var data = "";
      res.on('data', function (chunk) { data += chunk; });
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

      var response = "";
      s.on('data', function(chunk) { response += chunk; });

      s.on('end', function() {
        response.split('\r\n')[7].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      s.end("helo\nmail from: <lloyd@localhost>\nrcpt to: <me@localhost>\nrcpt to: <you@localhost>\ndata\nfrom: lloyd <lloyd@localhost>\nto: me <me@localhost>\ncc: you <you@localhost>\n\nhi\n.\nquit\n");
    });
  });
});

describe('web apis', function() {
  it('should return mail for the to: address', function(done) {
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/mail/me@localhost',
      method: 'GET'
    }, function(res) {
      (res.statusCode).should.equal(200);
      var data = "";
      res.on('data', function (chunk) { data += chunk; });
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
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/mail/you@localhost',
      method: 'GET'
    }, function(res) {
      (res.statusCode).should.equal(200);
      var data = "";
      res.on('data', function (chunk) { data += chunk; });
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

      var response = "";
      s.on('data', function(chunk) { response += chunk; });

      s.on('end', function() {
        response.split('\r\n')[10].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      s.end("helo\nmail from: <lloyd@localhost>\nrcpt to: <me@localhost>\ndata\nfrom: lloyd <lloyd@localhost>\nto: me <me@localhost>\n\nhello\n.\nmail from: <me@localhost>\nrcpt to: <you@localhost>\ndata\nfrom: me <me@localhost>\nto: you <you@localhost>\n\nworld\n.\nquit\n");
    });
  });
});

describe('web apis', function() {
  it('should return new mail for the address from the first delivery', function(done) {
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/mail/me@localhost',
      method: 'GET'
    }, function(res) {
      (res.statusCode).should.equal(200);
      var data = "";
      res.on('data', function (chunk) { data += chunk; });
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
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/mail/you@localhost',
      method: 'GET'
    }, function(res) {
      (res.statusCode).should.equal(200);
      var data = "";
      res.on('data', function (chunk) { data += chunk; });
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

describe('the SMTP RSET and NOOP commands', function() {
  it('should be supported', function(done) {
    var s = net.connect(emailPort, function(err) {
      should.not.exist(err);

      var response = "";
      s.on('data', function(chunk) { response += chunk; });

      s.on('end', function() {
        var lines = response.split('\r\n')
        lines[3].should.equal('250 OK');
        lines[4].should.equal('250');
        lines[11].should.equal('221 Bye!');
        s.destroy();
        done();
      });

      s.end("helo\nmail from: <lloyd@localhost>\nrcpt to: <me@localhost>\nrset\nmail from: <me@localhost>\nnoop\nrcpt to: <you@localhost>\ndata\nfrom: me <me@localhost>\nto: you <you@localhost>\n\njust4you\n.\nnoop\nquit\n");
    });
  });
});

describe('web apis', function() {
  it('should show that mail was not delivered after a reset', function(done) {
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/mail/me@localhost',
      method: 'GET'
    }, function(res) {
      (res.statusCode).should.equal(200);
      var data = "";
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(3);
        done();
      });
    }).end();
  });

  it('should return new mail delivered after a reset', function(done) {
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/mail/you@localhost',
      method: 'GET'
    }, function(res) {
      (res.statusCode).should.equal(200);
      var data = "";
      res.on('data', function (chunk) { data += chunk; });
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
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/mail/me@localhost',
      method: 'DELETE'
    }, function(res) {
      (res.statusCode).should.equal(200);
      http.request({
        host: '127.0.0.1',
        port: webPort,
        path: '/mail/you@localhost',
        method: 'DELETE'
      }, function(res) {
        (res.statusCode).should.equal(200);
        done();
      }).end();
    }).end();
  });

  it('should cause GET to return zero mails', function(done) {
    http.request({
      host: '127.0.0.1',
      port: webPort,
      path: '/mail/me',
      method: 'GET'
    }, function(res) {
      (res.statusCode).should.equal(200);
      var data = "";
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        data = JSON.parse(data);
        data.length.should.equal(0);
        done();
      });
    }).end();
  });
});
