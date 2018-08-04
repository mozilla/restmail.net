process.env.NODE_ENV = 'test';

const should = require('should');
const { isPermittedDomain, isSpecialUser } = require('../util');

describe('isPermittedDomain()', () => {
  it('should work', (done) => {
    const config = {
      rcptToDomainWhitelist: [
        'restmail.net'
      ]
    };

    should.equal(isPermittedDomain('foo@restmail.net', config), true);
    should.equal(isPermittedDomain('foo@RESTMAIL.NET', config), true);
    should.equal(isPermittedDomain('foo@RestMail.net', config), true);
    should.equal(isPermittedDomain('foo@restmail.net ', config), false);
    should.equal(isPermittedDomain('foo@restmail.network', config), false);

    done();
  });
});

describe('isSpecialUser()', () => {
  it('should work', (done) => {
    should.equal(isSpecialUser('admin@example.com'), 'admin');
    should.equal(isSpecialUser('administrator@example.com'), 'administrator');
    should.equal(isSpecialUser('hostmaster@example.com'), 'hostmaster');
    should.equal(isSpecialUser('postmaster@example.com'), 'postmaster');
    should.equal(isSpecialUser('webmaster@example.com'), 'webmaster');

    should.equal(isSpecialUser('ADMIN@example.com'), 'admin');
    should.equal(isSpecialUser('Admin@example.com'), 'admin');

    should.equal(isSpecialUser('admin@example.com@foo'), 'admin');

    done();
  });
});
