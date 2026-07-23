GET {{base_url}}/api/v1/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.version" == "1.0.0"
jsonpath "$.g5_independent" exists
