// Treat some common default admin-type contact emails specially
function isSpecialUser(user) {
  var localPart = null;
  const names = [ 'administrator', 'hostmaster', 'postmaster', 'webmaster', 'admin' ];

  if (! user) {
    return;
  }

  const match = user.match(/^([^@]*)/);
  if (match[1] && names.indexOf(match[1]) !== -1) {
    localPart = match[1];
  }

  return localPart;
}

module.exports = {
  isSpecialUser: isSpecialUser
};
