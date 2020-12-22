# build is docker-compose build
all:
	docker-compose run eodash-dashboard-api bash -c "pytest && flake8 && mypy ."

test:
	docker-compose run eodash-dashboard-api pytest -s

test-watch:
	docker-compose run eodash-dashboard-api ptw

lint:
	docker-compose run eodash-dashboard-api bash -c "flake8; mypy ."

lint-watch:
	docker-compose run eodash-dashboard-api bash -c "watch -n1  bash -c \"flake8; mypy .\""
	
upgrade-packages:
	docker-compose run --user 0 eodash-dashboard-api bash -c "python3 -m pip install pip-upgrader && pip-upgrade --skip-package-installation"

bash:
	docker-compose run eodash-dashboard-api bash
