import json
import http
import subprocess
import time
from pathlib import PurePath
import os
from unittest import mock

from botocore.session import Session
import urllib.request
import urllib.error
import s3fs
import pytest

from dashboard_api import app


@pytest.fixture
def client():
    app.config["TESTING"] = True

    with app.test_request_context():
        with app.test_client() as client:
            yield client


@pytest.fixture(scope="session")
def s3_endpoint_port():
    return 4567


@pytest.fixture(scope="session")
def s3_endpoint_uri(s3_endpoint_port):
    return f"http://127.0.0.1:{s3_endpoint_port}/"


@pytest.fixture(scope="session")
def s3_bucket() -> str:
    return "test-bucket"


@pytest.fixture(scope="session")
def s3_directory(s3_bucket):
    s3_dir = PurePath(f"{s3_bucket}/my_dir")
    with mock.patch("dashboard_api.config.S3_DIRECTORY", new=s3_dir):
        yield s3_dir


# similar to https://github.com/dask/s3fs/blob/master/s3fs/tests/test_s3fs.py
@pytest.fixture(scope="session")
def s3_base(s3_endpoint_port, s3_endpoint_uri):
    proc = subprocess.Popen(
        ["moto_server", "s3", "-p", str(s3_endpoint_port)],
        stderr=subprocess.DEVNULL,  # it logs a lot
    )
    timeout = 5
    while timeout > 0:
        try:
            r = urllib.request.urlopen(s3_endpoint_uri)
            if r.status == http.HTTPStatus.OK:
                break
        except (urllib.error.HTTPError, urllib.error.URLError):
            pass
        timeout -= 0.1
        time.sleep(0.1)

    yield

    proc.terminate()
    proc.wait()


@pytest.fixture(scope="session", autouse=True)
def s3(s3_base, s3_endpoint_uri, s3_bucket, s3_directory):
    os.environ["AWS_ACCESS_KEY_ID"] = "A"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "B"

    session = Session()
    client = session.create_client("s3", endpoint_url=s3_endpoint_uri)
    client.create_bucket(Bucket=s3_bucket)

    s3fs.S3FileSystem.clear_instance_cache()
    s3 = s3fs.S3FileSystem(anon=False, client_kwargs={"endpoint_url": s3_endpoint_uri})
    s3.invalidate_cache()
    return s3


@pytest.fixture
def dashboard_id() -> str:
    return "2f0f37ba-14bd-4918-8f3c-2e6ce3ab64b1"


@pytest.fixture
def secret_token() -> str:
    return "f1191322-ee57-4b86-ac72-b68c4d33514b"


@pytest.fixture
def dashboard(s3_directory, dashboard_id, secret_token, s3):
    dashboard_data = {"a": 5}
    dashboard_dir = s3_directory / dashboard_id
    s3.mkdir(dashboard_dir)

    with s3.open(dashboard_dir / "secret_token", "wt") as secret_token_file:
        secret_token_file.write(secret_token)

    with s3.open(dashboard_dir / "dashboard.json", "w") as dashboard_file:
        dashboard_file.write(json.dumps(dashboard_data))

    yield dashboard_data

    s3.rm(str(dashboard_dir), recursive=True)
