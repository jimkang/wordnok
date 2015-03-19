HOMEDIR = $(shell pwd)

PM2 = $(HOMEDIR)/node_modules/pm2/bin/pm2

test:
	node tests/basictests.js

start-server:
	$(PM2) start start-cache-server.js --name wordnok-cache || \
	echo "wordnok-cache has already been started."

stop-server:
	$(PM2) stop wordnok-cache || echo "Didn't need to stop process."
