/* ================================================================
   Student Task Manager — Frontend Logic
   ================================================================ */

const API_BASE = 'https://student-task-manager-worker-production.kanchanrahangdale1354.workers.dev/api';

let tasks = [];
let editingId = null;
let deletingId = null;

/* ---------------- Theme ---------------- */
const THEME_KEY = 'stm-theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return applyTheme(saved);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ---------------- Sidebar (mobile) ---------------- */
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

document.getElementById('menu-btn').addEventListener('click', () => {
  sidebar.classList.add('open');
  overlay.classList.add('show');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
});

/* ---------------- API ---------------- */
async function fetchTasks() {
  try {
    const res = await fetch(`${API_BASE}/tasks`);
    const data = await res.json();
    if (data.success) {
      tasks = data.tasks;
      renderTasks();
      updateStats();
    } else {
      showToast(data.error || 'Failed to load tasks', 'error');
    }
  } catch (err) {
    showToast('Network error while loading tasks', 'error');
  }
}

async function createTask(taskData) {
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Task created successfully', 'success');
      closeModal();
      fetchTasks();
    } else {
      showToast(data.error || 'Failed to create task', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

async function updateTask(id, taskData) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Task updated', 'success');
      closeModal();
      fetchTasks();
    } else {
      showToast(data.error || 'Failed to update task', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

async function deleteTask(id) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Task deleted', 'success');
      closeDeleteModal();
      fetchTasks();
    } else {
      showToast(data.error || 'Failed to delete task', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

/* ---------------- Rendering ---------------- */
function renderTasks() {
  const list = document.getElementById('task-list');
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6M9 13h6M9 17h6"/>
          </svg>
        </div>
        <h3>${tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}</h3>
        <p>${tasks.length === 0 ? 'Click "Add Task" to create your first task.' : 'Try adjusting your filters or search query.'}</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map((task, i) => {
    const deadlineHTML = task.deadline
      ? `<span title="Deadline">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
           ${formatDate(task.deadline)}
         </span>`
      : '';
    const createdHTML = `
      <span title="Created">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        ${formatDate(task.createdAt)}
      </span>`;

    return `
      <article class="task-card" data-priority="${task.priority}" data-status="${task.status}" style="animation-delay: ${i * 30}ms">
        <div class="task-card-header">
          <h3 class="task-card-title">${escapeHtml(task.title)}</h3>
          <span class="task-badge" data-priority="${task.priority}">${task.priority}</span>
        </div>
        ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
        <span class="task-status" data-status="${task.status}">${task.status}</span>
        <div class="task-meta">${createdHTML}${deadlineHTML}</div>
        <div class="task-actions">
          <button class="btn btn-ghost" onclick="editTask('${task.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="btn btn-danger" onclick="confirmDelete('${task.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Delete
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function getFilteredTasks() {
  let filtered = [...tasks];
  const search = document.getElementById('search-input').value.toLowerCase().trim();
  const status = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  const sortBy = document.getElementById('sort-by').value;

  if (search) filtered = filtered.filter(t => t.title.toLowerCase().includes(search));
  if (status) filtered = filtered.filter(t => t.status === status);
  if (priority) filtered = filtered.filter(t => t.priority === priority);

  if (sortBy === 'deadline') {
    filtered.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  } else {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return filtered;
}

function updateStats() {
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const progress = tasks.filter(t => t.status === 'In Progress').length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const high = tasks.filter(t => t.priority === 'High').length;

  setStat('stat-total', total);
  setStat('stat-pending', pending);
  setStat('stat-progress', progress);
  setStat('stat-completed', completed);
  setStat('stat-high', high);

  // Progress ring
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (percent / 100) * circumference;
  const ring = document.getElementById('progress-ring');
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${offset}`;
  document.getElementById('progress-percent').textContent = `${percent}%`;
  document.getElementById('progress-sub').textContent =
    total === 0 ? 'No tasks yet' : `${completed} of ${total} done`;
}

function setStat(id, value) {
  const el = document.getElementById(id);
  const current = parseInt(el.textContent) || 0;
  if (current !== value) {
    el.textContent = value;
    el.style.transform = 'scale(1.15)';
    setTimeout(() => el.style.transform = 'scale(1)', 200);
  }
}

/* ---------------- Modal ---------------- */
function openModal(title, task = null) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('task-id').value = task?.id || '';
  document.getElementById('task-title').value = task?.title || '';
  document.getElementById('task-description').value = task?.description || '';
  document.getElementById('task-priority').value = task?.priority || 'Medium';
  document.getElementById('task-status').value = task?.status || 'Pending';
  document.getElementById('task-deadline').value = task?.deadline ? task.deadline.split('T')[0] : '';
  editingId = task?.id || null;
  document.getElementById('task-modal').classList.add('active');
  setTimeout(() => document.getElementById('task-title').focus(), 100);
}

function closeModal() {
  document.getElementById('task-modal').classList.remove('active');
  document.getElementById('task-form').reset();
  editingId = null;
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) openModal('Edit Task', task);
}

function confirmDelete(id) {
  deletingId = id;
  document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('active');
  deletingId = null;
}

/* ---------------- Utilities ---------------- */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-icon">${icons[type] || icons.info}</div><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 250);
  }, 3000);
}

/* ---------------- Events ---------------- */
document.getElementById('add-task-btn').addEventListener('click', () => openModal('Add Task'));
document.getElementById('cancel-btn').addEventListener('click', closeModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);

document.getElementById('confirm-delete').addEventListener('click', () => {
  if (deletingId) deleteTask(deletingId);
});

document.getElementById('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    title: document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-description').value.trim(),
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value,
    deadline: document.getElementById('task-deadline').value || null
  };
  if (!data.title) return showToast('Title is required', 'error');
  if (editingId) updateTask(editingId, data);
  else createTask(data);
});

['search-input', 'filter-status', 'filter-priority', 'sort-by'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('input', renderTasks);
  el.addEventListener('change', renderTasks);
});

document.getElementById('clear-filters').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-priority').value = '';
  document.getElementById('sort-by').value = 'createdAt';
  renderTasks();
  showToast('Filters cleared', 'info');
});

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', (e) => {
    if (e.target === o) {
      if (o.id === 'task-modal') closeModal();
      if (o.id === 'delete-modal') closeDeleteModal();
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
});

/* Nav switching (visual only) */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('page-title').textContent =
      item.dataset.view === 'tasks' ? 'All Tasks' : 'Dashboard';
    if (window.innerWidth <= 900) {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    }
  });
});

/* ---------------- Init ---------------- */
initTheme();
fetchTasks();