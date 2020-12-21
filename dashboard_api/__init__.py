import logging
import time

from flask import Flask, request, g
from prometheus_flask_exporter import PrometheusMetrics


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
