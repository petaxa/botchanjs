variable "cloudflare_account_id" {
  description = "Cloudflare account that owns the stock game's D1 database"
  type        = string

  validation {
    condition     = can(regex("^[0-9a-fA-F]{32}$", var.cloudflare_account_id))
    error_message = "cloudflare_account_id must be a 32-character hexadecimal account ID."
  }
}

variable "access_service_token_id" {
  description = "ID of the manually created Bot-to-Worker Access Service Token (not its secret)"
  type        = string

  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.access_service_token_id))
    error_message = "access_service_token_id must be a UUID."
  }
}
