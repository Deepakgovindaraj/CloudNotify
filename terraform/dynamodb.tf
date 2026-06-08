resource "aws_dynamodb_table" "notifications" {
  name         = "Notifications"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "notificationId"

  attribute {
    name = "notificationId"
    type = "S"
  }
}
resource "aws_dynamodb_table" "userchannels" {
  name         = "UserChannels"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "email"

  attribute {
    name = "email"
    type = "S"
  }
}