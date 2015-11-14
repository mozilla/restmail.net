#!/usr/bin/env node
'use strict';

const runner = require('./runner');

const options = {
 mailSenders: 5,
 mailSenderInterval: 80,
 testDuration: 10000
};

runner(options);
