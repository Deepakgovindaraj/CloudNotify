resource "aws_amplify_app" "cloudnotify" {
  name       = "CloudNotify"
  repository = "https://github.com/Deepakgovindaraj/CloudNotify"

  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "404-200"
  }
}