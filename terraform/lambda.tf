resource "aws_lambda_function" "save_telegram_connection" {
  function_name = "SaveTelegramConnection"

  filename         = "../SaveTelegramConnection/SaveTelegramConnection.zip"
  source_code_hash = filebase64sha256("../SaveTelegramConnection/SaveTelegramConnection.zip")

  role    = "arn:aws:iam::879955400695:role/service-role/SaveTelegramConnection-role-arbgn5nq"
  handler = "index.handler"
  runtime = "nodejs24.x"

  timeout     = 3
  memory_size = 128
}
resource "aws_lambda_function" "send_email_notification" {
  function_name = "SendEmailNotification"

  filename         = "../SendEmailNotification/SendEmailNotification.zip"
  source_code_hash = filebase64sha256("../SendEmailNotification/SendEmailNotification.zip")

  role    = "arn:aws:iam::879955400695:role/service-role/SendEmailNotification-role-mc7q59xx"
  handler = "index.handler"
  runtime = "nodejs24.x"

  timeout     = 30
  memory_size = 128

  environment {
    variables = {
      GMAIL_PASS         = "plddozihuthcbgrc"
      GMAIL_USER         = "cloudnotify.apps@gmail.com"
      TELEGRAM_BOT_TOKEN = "8718946499:AAEOhHRpd5DewK3l2dE-X1skrK61Ufz5LYs"
    }
  }
}