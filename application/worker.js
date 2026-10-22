// ============================================
// Student Task Manager API
// Cloudflare Worker with Workers KV
// ============================================

// CORS headers for browser access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Helper: JSON response
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Helper: Error response
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message, success: false }, status);
}

// Helper: Generate unique task ID
function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: Parse and validate task data
function validateTask(body, isUpdate = false) {
  const errors = [];

  if (!isUpdate || body.title !== undefined) {
    if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
      errors.push("Title is required and must be a non-empty string");
    }
  }

  const validPriorities = ["Low", "Medium", "High"];
  if (body.priority !== undefined && !validPriorities.includes(body.priority)) {
    errors.push(`Priority must be one of: ${validPriorities.join(", ")}`);
  }

  const validStatuses = ["Pending", "In Progress", "Completed"];
  if (body.status !== undefined && !validStatuses.includes(body.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(", ")}`);
  }

  return errors;
}

// ============================================
// Main Request Handler
// ============================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: GET /api/tasks - List all tasks
    if (method === "GET" && path === "/api/tasks") {
      try {
        const list = await env.TASKS_KV.list();
        const tasks = [];

        for (const key of list.keys) {
          const value = await env.TASKS_KV.get(key.name);
          if (value) {
            tasks.push(JSON.parse(value));
          }
        }

        // Sort by createdAt (newest first)
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return jsonResponse({ success: true, tasks, count: tasks.length });
      } catch (err) {
        console.error("KV List Error:", err);
        return errorResponse("Failed to retrieve tasks", 500);
      }
    }

    // Route: POST /api/tasks - Create a task
    if (method === "POST" && path === "/api/tasks") {
      try {
        const body = await request.json();
        const errors = validateTask(body, false);

        if (errors.length > 0) {
          return errorResponse(errors.join("; "), 400);
        }

        const task = {
          id: generateId(),
          title: body.title.trim(),
          description: body.description?.trim() || "",
          priority: body.priority || "Medium",
          status: body.status || "Pending",
          createdAt: new Date().toISOString(),
          deadline: body.deadline || null,
        };

        await env.TASKS_KV.put(task.id, JSON.stringify(task));

        return jsonResponse({ success: true, task }, 201);
      } catch (err) {
        console.error("Create Error:", err);
        return errorResponse("Failed to create task: " + err.message, 500);
      }
    }

    // Route: GET /api/tasks/{id} - Get single task
    if (method === "GET" && path.startsWith("/api/tasks/")) {
      const id = path.split("/")[3];

      try {
        const value = await env.TASKS_KV.get(id);

        if (!value) {
          return errorResponse("Task not found", 404);
        }

        return jsonResponse({ success: true, task: JSON.parse(value) });
      } catch (err) {
        console.error("Get Error:", err);
        return errorResponse("Failed to retrieve task", 500);
      }
    }

    // Route: PUT /api/tasks/{id} - Update a task
    if (method === "PUT" && path.startsWith("/api/tasks/")) {
      const id = path.split("/")[3];

      try {
        const existing = await env.TASKS_KV.get(id);

        if (!existing) {
          return errorResponse("Task not found", 404);
        }

        const body = await request.json();
        const errors = validateTask(body, true);

        if (errors.length > 0) {
          return errorResponse(errors.join("; "), 400);
        }

        const existingTask = JSON.parse(existing);
        const updatedTask = {
          ...existingTask,
          title: body.title?.trim() ?? existingTask.title,
          description: body.description?.trim() ?? existingTask.description,
          priority: body.priority ?? existingTask.priority,
          status: body.status ?? existingTask.status,
          deadline: body.deadline ?? existingTask.deadline,
        };

        await env.TASKS_KV.put(id, JSON.stringify(updatedTask));

        return jsonResponse({ success: true, task: updatedTask });
      } catch (err) {
        console.error("Update Error:", err);
        return errorResponse("Failed to update task", 500);
      }
    }

    // Route: DELETE /api/tasks/{id} - Delete a task
    if (method === "DELETE" && path.startsWith("/api/tasks/")) {
      const id = path.split("/")[3];

      try {
        const existing = await env.TASKS_KV.get(id);

        if (!existing) {
          return errorResponse("Task not found", 404);
        }

        await env.TASKS_KV.delete(id);

        return jsonResponse({ success: true, message: "Task deleted" });
      } catch (err) {
        console.error("Delete Error:", err);
        return errorResponse("Failed to delete task", 500);
      }
    }

    // Default: 404 for unknown routes
    return errorResponse("Route not found", 404);
  },
};