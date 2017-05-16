'use strict';

const util = require('util');

function log() {
  const args = Array.prototype.slice.call(arguments);
  const timestamp = new Date().toISOString();
  args[0] = util.format('[%s] %s', timestamp, args[0]);
  process.stdout.write(util.format.apply(null, args) + '\n');
}

module.exports = log;


