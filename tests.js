const
should = require('should'),
net = require('net'),
webserver = require('./webserver.js'),
emailserver = require('./emailserver.js');

var emailPort = -1;
var webPort = -1;

describe('the test servers', function() {
  it('should start up', function(done) {
    webserver(function(err, port) {
      should.not.exist(err);
      (port).should.be.ok
      webPort = port;
      emailserver(function(err, port) {
        should.not.exist(err);
        (port).should.be.ok
        emailPort = port;
        done();
      });
    });
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

      s.end("helo\nmail from: <lloyd@localhost>\nrcpt to: <me@localhost>\ndata\nhi\n.\nquit\n");
    });
    setTimeout(function() { console.log('waited'); });
  });
});