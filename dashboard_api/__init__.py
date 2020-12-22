import hmac
import http
import json
import logging
from pathlib import PurePath
from typing import NewType
import s3fs
import time
import uuid

from flask import Flask, request, g, jsonify
from prometheus_flask_exporter import PrometheusMetrics
from werkzeug.exceptions import BadRequest, NotFound

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


DashboardId = NewType("DashboardId", str)


def dashboard_dir(dashboard_id: DashboardId) -> PurePath:
    return config.S3_DIRECTORY / dashboard_id


def dashboard_filepath(dashboard_id: DashboardId) -> PurePath:
    return dashboard_dir(dashboard_id=dashboard_id) / "dashboard.json"


def secret_token_filepath(dashboard_id: DashboardId) -> PurePath:
    return dashboard_dir(dashboard_id=dashboard_id) / "secret_token"


@app.route("/dashboards", methods=["POST"])
def create_dashboard():

    dashboard = request.json

    s3 = s3fs.S3FileSystem.current()

    dashboard_id = DashboardId(str(uuid.uuid4()))
    secret_token = str(uuid.uuid4())

    s3.mkdir(dashboard_dir(dashboard_id))

    with s3.open(secret_token_filepath(dashboard_id), "w") as secret_token_file:
        secret_token_file.write(secret_token)

    with s3.open(dashboard_filepath(dashboard_id), "w") as dashboard_file:
        dashboard_file.write(json.dumps(dashboard))

    response = {
        "dashboard_id": dashboard_id,
        "secret_token": secret_token,
    }
    return (jsonify(response), http.HTTPStatus.CREATED)


@app.route("/dashboards/<dashboard_id>/<secret_token>", methods=["POST"])
def update_dashboard(dashboard_id: DashboardId, secret_token: str):
    raise 4


@app.route("/dashboards/<dashboard_id>", methods=["GET"])
@app.route("/dashboards/<dashboard_id>/<secret_token>", methods=["GET"])
def get_dashboard(dashboard_id: DashboardId, secret_token=None):
    """
    If a secret token is specified, we do validate it to make the user aware of this,
    but for this operation it is not required
    """
    try:
        if secret_token:
            validate_token(dashboard_id, secret_token)

        return s3fs.S3FileSystem.current().cat_file(
            str(dashboard_filepath(dashboard_id)),
        )
    except FileNotFoundError:
        raise NotFound()


def validate_token(dashboard_id: DashboardId, secret_token: str) -> None:
    """
    Throws FileNotFound and BadRequest
    """
    actual_secret = s3fs.S3FileSystem.current().cat_file(
        str(secret_token_filepath(dashboard_id)),
    )
    if not hmac.compare_digest(actual_secret, secret_token.encode()):
        raise BadRequest("Invalid secret token")
