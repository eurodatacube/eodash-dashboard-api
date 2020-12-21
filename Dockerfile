FROM python:3.9.1

WORKDIR /srv/service
ADD requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ADD . .

USER www-data

CMD ["gunicorn", "--bind=0.0.0.0:8080", "--workers=3", "--log-level=INFO", "dashboard_api:app"]
