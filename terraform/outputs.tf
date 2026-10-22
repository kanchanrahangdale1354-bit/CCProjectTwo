output "worker_name" {
  description = "Name of the deployed Worker"
  value       = cloudflare_workers_script.task_worker.script_name
}

output "kv_namespace_id" {
  description = "ID of the KV namespace"
  value       = cloudflare_workers_kv_namespace.tasks_kv.id
}

output "worker_url" {
  description = "URL of the deployed Worker"
  value       = "https://${cloudflare_workers_script.task_worker.script_name}.kanchanrahangdale1354.workers.dev"
}

output "api_test_command" {
  description = "Curl command to test the API"
  value       = "curl https://${cloudflare_workers_script.task_worker.script_name}.kanchanrahangdale1354.workers.dev/api/tasks"
}