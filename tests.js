const
should = require('should'),
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