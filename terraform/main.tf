# ============================================
# 1. Workers KV Namespace
# ============================================
resource "cloudflare_workers_kv_namespace" "tasks_kv" {
  account_id = var.cloudflare_account_id
  title      = "${var.app_name}-${var.environment}-${var.kv_namespace_title}"
}

# ============================================
# 2. Cloudflare Worker Script
# ============================================
resource "cloudflare_workers_script" "task_worker" {
  account_id  = var.cloudflare_account_id
  script_name = "${var.app_name}-worker-${var.environment}"

  main_module  = "worker.js"
  content_file = "${path.module}/../application/worker.js"

  content_sha256 = filesha256("${path.module}/../application/worker.js")

  compatibility_date  = "2024-01-01"
  compatibility_flags = ["nodejs_compat"]

  bindings = [
    {
      type         = "kv_namespace"
      name         = "TASKS_KV"
      namespace_id = cloudflare_workers_kv_namespace.tasks_kv.id
    }
  ]
}

# ============================================
# 3. Enable workers.dev route (THE MISSING PIECE)
# ============================================
resource "cloudflare_workers_script_subdomain" "task_worker_subdomain" {
  account_id       = var.cloudflare_account_id
  script_name      = cloudflare_workers_script.task_worker.script_name
  enabled          = true
  previews_enabled = false
}