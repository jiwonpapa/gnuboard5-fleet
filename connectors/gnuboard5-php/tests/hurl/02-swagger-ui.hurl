GET {{base_url}}/api/docs/index.html
HTTP 200
[Asserts]
header "content-type" contains "text/html"
body contains "Swagger UI"
