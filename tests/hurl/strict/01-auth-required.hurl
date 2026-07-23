GET {{base_url}}/api/v1/members/me
HTTP 401
[Asserts]
jsonpath "$.status" == 401
jsonpath "$.title" contains "Unauthorized"
