HOMEDIR = $(shell pwd)

test:
	node tests/basictests.js

pushall:
	git push origin master && npm publish
