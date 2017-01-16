#!/usr/bin/env node
'use strict';

const commander = require('commander');
const runner = require('./runner');

function main() {
  commander
    .option('-d, --duration [duration]', 'test duration (ms)', 10000)
    .option('-i, --interval [interval]', 'mail sender interval (ms)', 80)
    .option('-w, --workers [workers]', 'Number of concurrent mail send tasks', 5)
    .parse(process.argv)

  runner(commander.opts());
}

main();
