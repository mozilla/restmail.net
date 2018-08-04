function rcptToDomainWhitelist() {
  const defaults = [
    'localhost',
    'restmail.net',
    'restmail.com',
    'example.com'
  ];

  if (process.env.RESTMAIL_RCPT_TO_DOMAIN_WHITELIST) {
    return process.env.RESTMAIL_RCPT_TO_DOMAIN_WHITELIST.split(',');
  }

  return defaults;
}


module.exports = {
  // Interval in seconds after which to automatically delete mail.
  // Set to 0 for no auto-delete, and keep an eye on the size of
  // your redis db.
  expireAfter: process.env.RESTMAIL_EXPIRE_AFTER || 60 * 60 * 24,

  // Maximum number of RCPT TO on one connection dialogue. If there are more
  // than this limit, an error will returned and the connection terminated.
  maximumRcptTo: process.env.RESTMAIL_MAXIMUM_RCPT_TO || 5,

  // Domain whitelist. RCPT TO addresses must match one of the domains on this
  // list. (Strict matching, no subdomains).
  rcptToDomainWhitelist: rcptToDomainWhitelist()
};
