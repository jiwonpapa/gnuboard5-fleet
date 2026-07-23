GET {{base_url}}/api/docs/openapi.yaml
HTTP 200
[Asserts]
header "content-type" contains "application"
body contains "openapi: 3.0.3"
body contains "title: Gnuboard5 REST API"
