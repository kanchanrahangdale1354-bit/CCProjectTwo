variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
  sensitive   = true
}

variable "app_name" {
  description = "Application name prefix"
  type        = string
  default     = "student-task-manager"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "kv_namespace_title" {
  description = "Title for the KV namespace"
  type        = string
  default     = "student-tasks-kv"
}