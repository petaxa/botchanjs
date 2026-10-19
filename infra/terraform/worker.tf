resource "cloudflare_worker" "stocks_api" {
  account_id = var.cloudflare_account_id
  name       = "botchan-stocks-api"

  subdomain = {
    enabled          = true
    previews_enabled = false
  }
}

resource "cloudflare_worker_version" "stocks_api" {
  account_id         = var.cloudflare_account_id
  worker_id          = cloudflare_worker.stocks_api.id
  compatibility_date = "2026-10-20"
  main_module        = "index.js"

  modules = [{
    name         = "index.js"
    content_type = "application/javascript+module"
    content_file = "${path.module}/../../worker/index.js"
  }]

  bindings = [{
    name = "DB"
    type = "d1"
    id   = cloudflare_d1_database.stocks.id
  }]
}

resource "cloudflare_workers_deployment" "stocks_api" {
  account_id  = var.cloudflare_account_id
  script_name = cloudflare_worker.stocks_api.name
  strategy    = "percentage"
  versions = [{
    percentage = 100
    version_id = cloudflare_worker_version.stocks_api.id
  }]

  depends_on = [cloudflare_zero_trust_access_application.stocks_api]
}

resource "cloudflare_zero_trust_access_policy" "stocks_api_service" {
  account_id = var.cloudflare_account_id
  name       = "Botchan stock API service token"
  decision   = "non_identity"

  include = [{
    service_token = {
      token_id = var.access_service_token_id
    }
  }]
}

resource "cloudflare_zero_trust_access_application" "stocks_api" {
  account_id                = var.cloudflare_account_id
  name                      = "Botchan stock API"
  type                      = "self_hosted"
  app_launcher_visible      = false
  service_auth_401_redirect = true

  destinations = [{
    type      = "worker"
    worker_id = cloudflare_worker.stocks_api.id
  }]

  policies = [{
    id         = cloudflare_zero_trust_access_policy.stocks_api_service.id
    precedence = 1
  }]

}

output "stocks_api_worker_id" {
  description = "Worker ID to find the protected endpoint in the Cloudflare dashboard"
  value       = cloudflare_worker.stocks_api.id
}
