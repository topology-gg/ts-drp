.PHONY: docker-build
docker-build:
	docker build -t ts-drp -f docker/Dockerfile .

docker-start:
	docker run -it --rm -v $(PWD)/.env:/ts-drp/.env ts-drp -m bootstrap
