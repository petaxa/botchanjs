variable "cloudflare_account_id" {
  description = "Cloudflare account that owns the stock game's D1 database"
  type        = string

  validation {
    condition     = can(regex("^[0-9a-fA-F]{32}$", var.cloudflare_account_id))
    error_message = "cloudflare_account_id must be a 32-character hexadecimal account ID."
  }
}
