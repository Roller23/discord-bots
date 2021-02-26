m :=Automated Makefile push message

all:
	echo "no target specified"

push:
	git add .
	git reset -- database.json
	git commit -m "$(m)"
	git push