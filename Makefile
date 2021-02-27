m :=Automated Makefile push message

all:
	echo "no target specified"

push:
	git add .
	git commit -m "$(m)"
	git push