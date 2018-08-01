module.exports = {
  // Interval in seconds after which to automatically delete mail.
  // Set to 0 for no auto-delete, and keep an eye on the size of
  // your redis db.
  expireAfter: 60 * 60 * 24,

  // Maximum number of RCPT TO on one connection dialogue. If there are more
  // than this limit, an error will returned and the connection terminated.
  maximumRcptTo: 5,

  // Domain whitelist. RCPT TO addresses must match one of the domains on this
  // list. (Strict matching, no subdomains).
  rcptToDomainWhitelist: [
    'restmail.net',
    'restmail.com',
    'restmail.dev.lcip.org'
  ]
};
