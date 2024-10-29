all: bin

gamelist:
	grep "new GameInfo" ../src/app/components/normal-component/pick-game/pick-game.component.ts | sed -E "s/.*new GameInfo\([^,]+, +'([^']+)'.*/\1/" > games.txt

bin:
	opam exec -- dune build main.exe

run: gamelist
	GAMES=$$(cat games.txt)
	opam exec -- dune exec -- ./main.exe

run-local: gamelist
	GAMES=$$(cat games.txt)
	opam exec -- dune exec -- ./main.exe -no-emulator -project everyboard-test -origin '*' -endpoint 'https://firestore.googleapis.com' -show-errors

run-load-test: gamelist
	GAMES=$$(cat games.txt)
	opam exec -- dune exec -- ./main.exe -no-emulator -endpoint https://firestore.googleapis.com -show-errors -project everyboard-loadtest -origin '*' -service-account ../service-accounts/loadtest.json

test: bin gamelist
	find . -name '*.coverage' | xargs rm -f
	GAMES=$$(cat games.txt) \
	opam exec -- dune exec --instrument-with bisect_ppx --force -- ./tests.exe test $(match) $(test-number)
	opam exec -- bisect-ppx-report html
	echo 'Coverage produced in _coverage/index.html'

generate-coverage:
	opam exec -- bisect-ppx-report html
	echo 'Coverage produced in _coverage/index.html'

check-coverage:
	opam exec -- bisect-ppx-report summary
	opam exec -- bisect-ppx-report summary | grep '100.00%' || ( echo 'Coverage too low!' && exit 1 )
	find . -name '*.coverage' | xargs rm -f

docker: gamelist
	sed -i 's/;; //' dune
	docker build -t backend-build -f Dockerfile.build .
	sed -i 's/(flags /;; (flags /' dune
	docker run --rm --entrypoint cat backend-build /home/ocaml/_build/default/main.exe > main.static.exe
	chmod +x main.static.exe
	cp /etc/services services
	cp /etc/ssl/certs/ca-certificates.crt ca-certificates.crt
	echo "GAMES='$$(cat games.txt)'" > .env
	docker build -t "backend-$(target)" -f Dockerfile.serve .
	docker save "backend-$(target)" > "backend-$(target).tar"

deploy: docker
	ssh -p "$(port)" "$(user)@$(server)" "docker stop \$$(docker ps -q --filter publish=$(listen-port)) ; docker load && docker container prune -f && docker image prune -f && docker run -d -p $(listen-port):8081 backend-$(target) /main.static.exe $(args)" < "backend-$(target).tar"

clean:
	opam exec -- dune clean

.PHONY: bin test clean install docker deploy all
