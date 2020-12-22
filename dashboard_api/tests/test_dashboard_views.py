import http
import json
import s3fs


def test_create_dashboards_adds_json_files(client, s3_directory):
    dashboard = {"a": 3}
    response = client.post("/dashboards", json=dashboard)

    assert response.status_code == http.HTTPStatus.CREATED

    s3 = s3fs.S3FileSystem.current()

    dashboard_dir = s3_directory / response.json["dashboard_id"]
    # import pdb; pdb.set_trace()
    assert (
        s3.cat_file(str(dashboard_dir / "secret_token")).decode()
        == response.json["secret_token"]
    )
    assert json.loads(s3.cat_file(str(dashboard_dir / "dashboard.json"))) == dashboard


def test_create_dashboards_refuses_invalid_json(client):
    response = client.post(
        "/dashboards", content_type="application/json", data="asdfa;'"
    )
    assert response.status_code == http.HTTPStatus.BAD_REQUEST


def test_update_dashboard_fails_on_nonexistent_dashboard(client):
    response = client.post("/dashboards/a/b")
    assert response.status_code == http.HTTPStatus.NOT_FOUND


def test_update_dashboard_fails_on_secret_missmatch(client, dashboard, dashboard_id):
    response = client.post(f"/dashboards/{dashboard_id}/invalid")
    assert response.status_code == http.HTTPStatus.BAD_REQUEST


def test_update_dashboards_refuses_invalid_json(
    client, dashboard_id, dashboard, secret_token
):
    response = client.post(
        f"/dashboards/{dashboard_id}/{secret_token}",
        content_type="application/json",
        data="asdfa;'",
    )
    assert response.status_code == http.HTTPStatus.BAD_REQUEST


def test_update_dashboard_changes_dashboard(
    client, dashboard_id, dashboard, secret_token, s3_directory
):
    new_dashboard = {"a": dashboard["a"] + 1}
    response = client.post(
        f"/dashboards/{dashboard_id}/{secret_token}", json=new_dashboard
    )

    assert response.status_code == http.HTTPStatus.OK

    assert (
        json.loads(
            s3fs.S3FileSystem.current().cat_file(
                str(s3_directory / dashboard_id / "dashboard.json")
            )
        )
        == new_dashboard
    )


def test_get_dashboard_handles_missing(client):
    response = client.get("/dashboards/1234")
    assert response.status_code == http.HTTPStatus.NOT_FOUND


def test_get_dashboard_returns_dashboard(client, dashboard_id, dashboard):
    response = client.get(f"/dashboards/{dashboard_id}")
    assert response.status_code == http.HTTPStatus.OK
    assert response.json == dashboard


def test_get_dashboard_verified_fails_on_secret_missmatch(
    client, dashboard_id, dashboard
):
    response = client.get(f"/dashboards/{dashboard_id}/invalid")
    assert response.status_code == http.HTTPStatus.BAD_REQUEST


def test_get_dashboard_verified_returns_dashboard(
    client, dashboard_id, dashboard, secret_token
):
    response = client.get(f"/dashboards/{dashboard_id}/{secret_token}")
    assert response.status_code == http.HTTPStatus.OK
    assert response.json == dashboard
