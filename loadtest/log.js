var util = require('util');

module.exports = function log() {
  var args = Array.prototype.slice.call(arguments);
  var timestamp = new Date().toISOString();
  args[0] = util.format('[%s] %s', timestamp, args[0]);
  process.stdout.write(util.format.apply(null, args) + '\n');
};


