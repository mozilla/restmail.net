const fs = require('fs');
const os = require('os');
const path = require('path');

const convict = require('convict');

const config = convict({
  email: {
    host: {
      'default': 'restmail.net',
      doc: 'Host/Domain name for receiving email.',
      env: 'EMAIL_HOST',
      format: String
    },
    port: {
      // Note: in production, 25 is iptables nat'd to 9025.
      'default': 9025,
      doc: 'Port number to listen on.',
      env: 'EMAIL_PORT',
      format: 'port'
    }
  },

  enableSTS: {
    'default': true,
    doc: 'Send "strict-transport-security" header.',
    env: 'ENABLE_STS',
    format: Boolean
  },

  env: {
    'default': '',
    doc: 'Node environment.',
    env: 'NODE_ENV',
    format: String
  },

  // Interval in seconds after which to automatically delete mail.
  // Set to 0 for no auto-delete, and keep an eye on the size of
  // your redis db.
  expireAfter: {
    'default': 60 * 60 * 24,
    doc: 'Interval in seconds after which to automatically delete mail. 0 for never.',
    env: 'EXPIRE_AFTER',
    format: 'int'
  },

  loadtest: {
    debug: {
      'default': false,
      doc: 'Debug logging while running loadtest',
      env: 'LOADTEST_DEBUG',
      format: Boolean
    },
    logToConsole: {
      'default': false,
      doc: 'Very verbose detail during loadtest',
      env: 'LOADTEST_LOG_TO_CONSOLE',
      format: Boolean
    }
  },

  // Maximum number of RCPT TO on one connection dialogue. If there are more
  // than this limit, an error will returned and the connection terminated.
  // Note: SES for one will exceed the limit of 5 as it batch reuses
  // connections to deliver multiple emails, so you cannot practically use
  // this in production.
  maximumRcptTo: {
    'default': 5,
    doc: 'Maximum number of RCPT TO on one connection dialogue.',
    env: 'MAXIMUM_RCPT_TO',
    format: 'int'
  },

  // Domain whitelist. RCPT TO addresses must match one of the domains on this
  // list. (Strict matching, no subdomains).
  rcptToDomainWhitelist: {
    'default': [
      'localhost',
      'restmail.net',
      'restmail.com',
      'example.com'
    ],
    doc: 'RCPT TO addresses must match one of the domains on this list.',
    env: 'RCPT_TO_DOMAIN_WHITELIST',
    format: Array
  },

  redis: {
    host: {
      'default': '127.0.0.1',
      doc: 'Redis host.',
      env: 'REDIS_HOST',
      format: String
    },
    port: {
      'default': 6379,
      doc: 'Redis port.',
      env: 'REDIS_PORT',
      format: 'port'
    }
  },

  specialUserDir: {
    'default': os.tmpdir(),
    doc: 'Location of directory in which to store webmaster, etc. email.',
    env: 'SPECIAL_USER_DIR',
    format: String
  },

  // For initial deployment, since I don't control all the clients, I'll start
  // with a low value. Enough to break someone temporarily and know about it,
  // but undoable.
  stsMaxAge: {
    'default': '120',
    doc: 'Strict-Transport-Security max-age value (in seconds).',
    env: 'STS_MAX_AGE',
    format: String
  },

  webPort: {
    'default': 8080,
    doc: 'Port number for web server to listen on.',
    env: 'WEB_PORT',
    format: 'port'
  }
});

// handle configuration files.  you can specify a CSV list of configuration
// files to process, which will be overlayed in order, in the CONFIG_FILES
// environment variable.

const envConfig = path.join(__dirname, config.get('env') + '.json') +
  ',' + (process.env.CONFIG_FILES || '');
const files = envConfig.split(',').filter(fs.existsSync);
config.loadFile(files);
config.validate({ allowed: 'strict' });

const properties = config.getProperties();
module.exports = properties;
