The command `make stack=mystack key=yourkeyname` will create an EC2 instance [1] with the following attributes:

* builds and runs restmail.net (https://github.com/mozilla/restmail.net) webserver and emailserver
* an nginx reverse proxy serving both port 80 and port 443 traffic with a self-signed SSL certificate
* registers `mystack.dev.lcip.org` in DNS as a A record, and an MX record to receive email
* node processes managed by supervisorctl
* ssh access to `ssh ec2-user@mystack.dev.lcip.org`
* since this is not the domain `restmail.net`, access to emailboxes is with a url like `http://mystack.dev.lcip.org/mail/foobar@mystack.dev.lcip.org`

[1] assumes you have AWS access keys set up in mozilla's cloudservices-aws-dev IAM, but this ansible code should be not hard to re-use in some other IAM
