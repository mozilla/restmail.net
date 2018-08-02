function isPermittedDomain(address, config) {
  const permittedDomains = config.rcptToDomainWhitelist.map((d) => d.toUpperCase());
  const match = address.match(/.*@(.*)/);

  let permitted = false;

  if (match && match[1]) {
    const domain = match[1].toUpperCase();
    permittedDomains.forEach((permittedDomain) => {
      if (domain === permittedDomain) {
        permitted = true;
      }
    });
  }

  return permitted;
}

// Treat some common default admin-type contact emails specially
function isSpecialUser(user) {
  let localPart = null;
  const names = [ 'admin', 'administrator', 'hostmaster', 'postmaster', 'webmaster' ]
    .map((name) => name.toUpperCase());

  if (! user) {
    return;
  }

  const match = user.match(/^([^@]*)@/i);
  if (match && match[1] && names.indexOf(match[1].toUpperCase()) !== -1) {
    localPart = match[1].toLowerCase();
  }

  return localPart;
}

module.exports = {
  isPermittedDomain: isPermittedDomain,
  isSpecialUser: isSpecialUser
};
