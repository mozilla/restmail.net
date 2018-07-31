process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');

const should = require('should');
const Mailparser = require('mailparser').MailParser;

function createStream(fixture) {
  const stream = fs.createReadStream(path.resolve(__dirname, `./fixtures/${fixture}`));
  return stream;
}

describe('the email', function() {
  let endEventCalled = false;

  beforeEach((done) => {
    endEventCalled = false;
    done();
  });

  afterEach((done) => {
    endEventCalled.should.equal(true);
    done();
  });

  it('had the expected parsed structure', function(done) {
    const stream = createStream('test.eml');
    const mailparser = new Mailparser({
      streamAttachments: true
    });

    stream.pipe(mailparser);

    mailparser.on('end', (mail) => {
      endEventCalled = true;
      should.exist(mail);

      const mailKeys = [
        'date',
        'from',
        'headers',
        'html',
        'messageId',
        'priority',
        'subject',
        'text',
        'to'
      ];

      mailKeys.forEach((key) => {
        (mail[key]).should.be.defined;
      });

      mail['messageId'].should.equal('0000000000000000-00000000-0000-0000-0000-000000000000-000000@us-west-2.amazonses.com');
      mail['priority'].should.equal('normal');
      mail['subject'].should.equal('Confirm your email and start to sync!');

      const headerKeys = [
        'content-language',
        'content-type',
        'date',
        'from',
        'message-id',
        'mime-version',
        'subject',
        'to',
        'x-email-service',
        'x-flow-begin-time',
        'x-flow-id',
        'x-link',
        'x-template-name',
        'x-template-version',
        'x-uid',
        'x-verify-code'
      ];

      headerKeys.forEach((key) => {
        (mail.headers[key]).should.be.defined;
      });

      mail.headers['content-language'].should.equal('en');
      mail.headers['content-type'].should.equal('multipart/alternative; boundary="----sinikael-?=_1-15330061738540.201488097167851"');
      mail.headers['date'].should.equal('Tue, 31 Jul 2018 03:02:53 +0000');
      mail.headers['from'].should.equal('Firefox Accounts <accounts@firefox.com>');
      mail.headers['message-id'].should.equal('<0000000000000000-00000000-0000-0000-0000-000000000000-000000@us-west-2.amazonses.com>');
      mail.headers['mime-version'].should.equal('1.0');
      mail.headers['subject'].should.equal('Confirm your email and start to sync!');
      mail.headers['to'].should.equal('someone@example.com');
      mail.headers['x-email-service'].should.equal('fxa-auth-server');
      mail.headers['x-flow-begin-time'].should.equal('1533006144964');
      mail.headers['x-flow-id'].should.equal('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
      mail.headers['x-template-name'].should.equal('verifySyncEmail');
      mail.headers['x-template-version'].should.equal('1');
      mail.headers['x-uid'].should.equal('deadbeefdeadbeefdeadbeefdeadbeef');
      mail.headers['x-verify-code'].should.equal('deadbeefdeadbeefdeadbeefdeadbeef');

      done();
    });
  });
});
