import http
import json
import logging
import s3fs
import time
import uuid

from flask import Flask, request, g, jsonify
from prometheus_flask_exporter import PrometheusMetrics

from dashboard_api import config


app = Flask(__name__)
metrics = PrometheusMetrics(app)


if __name__ != "__main__":
    gunicorn_logger = logging.getLogger("gunicorn.error")
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level)


@app.route("/probe", methods=["GET"])
def probe():
    return {}


@app.before_request
def log_start_time():
    g.request_start_time = time.time()


@app.after_request
def log_request(response):
    ignored_paths = ["/probe", "/metrics"]
    if request.path not in ignored_paths:
        # NOTE: swagger validation failures prevent log_start_time from running
        duration = (
            (time.time() - start_time)
            if (start_time := getattr(g, "request_start_time", None))
            else 0
        )
        app.logger.info(
            f"{request.method} {request.path} "
            f"duration:{duration * 1000:.2f}ms "
            f"content_length:{response.content_length} "
            f"status:{response.status}"
        )
    return response


@app.route("/dashboards", methods=["POST"])
def create_dashboard():

    dashboard = request.json

    # NOTE; this is convenient for tests, it will reuse the one from tests
    s3 = s3fs.S3FileSystem.current()

    dashboard_id = str(uuid.uuid4())
    secret_token = str(uuid.uuid4())

    dashboard_dir = config.S3_DIRECTORY / dashboard_id

    s3.mkdir(dashboard_dir)

    with s3.open(dashboard_dir / "secret_token", "wt") as secret_token_file:
        secret_token_file.write(secret_token)

    with s3.open(dashboard_dir / "dashboard.json", "w") as dashboard_file:
        dashboard_file.write(json.dumps(dashboard))

    return (
        jsonify(
            {
                "dashboard_id": dashboard_id,
                "secret_token": secret_token,
            }
        ),
        http.HTTPStatus.CREATED,
    )


@app.route("/dashboards/<dashboard_id>/<secret_token>", methods=["POST"])
def update_dashboard(dashboard_id: str, secret_token: str):
    raise 4


@app.route("/dashboards/<dashboard_id>", methods=["GET"])
def get_dashboard(dashboard_id: str):
    raise 4


@app.route("/dashboardsX/<dashboard_id>/<secret_token>", methods=["GET"])
def get_dashboard_verified(dashboard_id: str, secret_token: str):
    # TODO: verify secret token and do regular get
    raise 4
