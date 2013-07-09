module.exports = {

  // Interval in seconds after which to automatically delete mail.
  // Set to 0 for no auto-delete, and keep an eye on the size of
  // your redis db.
  expireAfter: 60 * 60 * 24
};
