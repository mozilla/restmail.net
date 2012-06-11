#!/usr/bin/env bash

wget http://redis.googlecode.com/files/redis-2.4.14.tar.gz
tar xvzf redis-2.4.14.tar.gz 
cd redis-2.4.14
sudo make install
cd utils
sudo ln -s /usr/local/bin/redis-server /usr/bin/redis-server
sudo ./install_server.sh

# now route port 25 to 9025 so that an unpriviledge process can handle mail
sudo iptables -t nat -A PREROUTING -p tcp -m tcp --dport 25 -j REDIRECT --to-ports 9025
