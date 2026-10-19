terraform {
  required_version = "~> 1.16.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28.0"
    }
  }

  backend "s3" {
    key                         = "botchan/terraform.tfstate"
    region                      = "auto"
    use_lockfile                = true
    use_path_style              = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}

provider "cloudflare" {}

resource "cloudflare_d1_database" "stocks" {
  account_id            = var.cloudflare_account_id
  name                  = "botchan-stocks"
  primary_location_hint = "apac"

  lifecycle {
    prevent_destroy = true
  }
}
