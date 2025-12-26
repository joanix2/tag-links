# Makefile pour TagLink backend

.PHONY: api tests database serve

api:
	./run_tests.sh --api-only

tests:
	./run_tests.sh --tests-only

database:
	docker compose -f docker-compose.neo4j.yml up -d

serve:
	./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
