# Email addresses for testing

[![Build Status](https://secure.travis-ci.org/mozilla/restmail.net.svg)](http://travis-ci.org/mozilla/restmail.net)

Have you ever wanted to write an automated test of a service that
sends email?  If you have, you might have wanted an email address that
you can check using a simple REST service that returns JSON...

..that's what *restmail.net* is.

## overview

restmail.net is an email server with a REST API.  Any time an
email is sent to a @restmail.net address, the email address springs
into existence and the message is stored (with a max of 10 emails per
"user").  You can query the restmail API to check the email of any
user, and you can also delete outstanding messages via the API.

This lets you test services that deliver email.

By default, emails are deleted after one day.  You can change this
by modifying the `expireAfter` parameter in `config.js`.  Set it to
`0` for no auto-deletion, in which case you will want to keep an
eye on your redis database size.

## security?

All mail sent to restmail email addresses is completely public.  anyone
may delete the messages associated with any user.  This service is
wide open.  If that won't do, you should fork and deploy your own
instance of restmail, and add sekrets and stuff.

## the API

### `DELETE /mail/<user>`

Delete all of the mail for the named user (where user is the user
portion of the email address, not including `@restmail.net`).

Returns `200` on success.

### `GET /mail/<user>`

Returns all mail for the specified user, as an array of JSON blobs,
with the newest messages first.  Here's example output (with lots of
fields stripped out):

    [
      {
        "headers": {
          "date": "Fri, 11 May 2012 14:44:37 -0600",
          "mime-version": "1.0 (Apple Message framework v1257)",
        },
        "from": [ {
          "address": "lloyd@example.com",
          "name": "Lloyd Hilaiel"
        } ],
        "to": [ {
          "address": "test@restmail.net",
          "name": ""
        } ],
        "subject": "this is my first message",
        "text": "it is very pretty.\n"
      }, {
        "headers": {
          "date": "Fri, 11 May 2012 14:44:52 -0600",
          "mime-version": "1.0 (Apple Message framework v1257)",
        },
        "from": [ {
          "address": "lloyd@example.com",
          "name": "Lloyd Hilaiel"
        } ],
        "to": [ {
          "address": "test@restmail.net",
          "name": ""
        } ],
        "subject": "this is my second message",
        "text": "it's pretty awesome too.\n"
      }
    ]

## restmail on your domain

You can use restmail from custom domains:  Just set restmail as your mail exchanger:

    $ dig -t <my domain>
    <my domain>            900     IN      MX      20 restmail.net.

And fetch mail with the full email address:

    GET /mail/<user>@<my domain>

done!

