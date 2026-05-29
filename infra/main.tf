terraform {
  required_version = ">= 1.9"
  required_providers {
    aws        = { source = "hashicorp/aws",        version = "~> 5.0" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.0" }
  }
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key_id
  secret_key = var.aws_secret_access_key
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
