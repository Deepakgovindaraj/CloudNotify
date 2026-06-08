resource "aws_apigatewayv2_api" "cloudnotify_api" {
  name          = "CloudNotifyAPI"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = [
      "authorization",
      "content-type"
    ]

    allow_methods = [
      "DELETE",
      "GET",
      "OPTIONS",
      "POST",
      "PUT"
    ]

    allow_origins = [
      "*"
    ]
  }
}