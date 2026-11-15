// Configurable Backend API Base URL
// When deployed on Vercel, set your deployed backend URL here or in the UI "API URL" input field.
const DEFAULT_PRODUCTION_BACKEND_URL = 'https://backend-test-livid.vercel.app';

let API_BASE_URL = localStorage.getItem('API_BASE_URL') || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : (DEFAULT_PRODUCTION_BACKEND_URL || '')
);

// State Management
const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  notesPage: 1,
  postsPage: 1,
  adminUsersPage: 1,
  adminNotesPage: 1,
};

// DOM Elements
const alertBox = document.getElementById('alert-box');
const sessionStatus = document.getElementById('session-status');
const btnLogout = document.getElementById('btn-logout');
const tabBtnAdmin = document.getElementById('tab-btn-admin');
const apiUrlInput = document.getElementById('api-url-input');
const btnSaveApiUrl = document.getElementById('btn-save-api-url');
const btnCheckApi = document.getElementById('btn-check-api');
const apiStatusIndicator = document.getElementById('api-status-indicator');

// Setup API URL UI
if (apiUrlInput) {
  apiUrlInput.value = API_BASE_URL;
}

btnSaveApiUrl?.addEventListener('click', () => {
  const newUrl = apiUrlInput.value.trim().replace(/\/+$/, '');
  API_BASE_URL = newUrl;
  localStorage.setItem('API_BASE_URL', newUrl);
  showAlert(`API Base URL set to: ${newUrl || '(current origin)'}`, 'success');
  checkApiHealth();
});

btnCheckApi?.addEventListener('click', () => {
  checkApiHealth(true);
});

async function checkApiHealth(showAlertMsg = false) {
  if (!apiStatusIndicator) return;
  apiStatusIndicator.className = 'api-status-badge';
  apiStatusIndicator.textContent = 'Checking...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.status === 'healthy') {
      apiStatusIndicator.className = 'api-status-badge online';
      apiStatusIndicator.textContent = 'Backend Online';
      if (showAlertMsg) showAlert('Successfully connected to backend API!', 'success');
    } else {
      throw new Error();
    }
  } catch (e) {
    apiStatusIndicator.className = 'api-status-badge offline';
    apiStatusIndicator.textContent = 'Backend Offline';
    if (showAlertMsg) showAlert('Could not reach backend API at ' + API_BASE_URL, 'error');
  }
}

// Helper: Show Alert
function showAlert(message, type = 'success', duration = 4000) {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.classList.remove('hidden');
  if (duration > 0) {
    setTimeout(() => {
      alertBox.classList.add('hidden');
    }, duration);
  }
}

// Helper: API Fetch with Authorization header & Base URL
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    showAlert(error.message, 'error');
    throw error;
  }
}

// Tab Switching Logic
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');

      tabButtons.forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((tc) => tc.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTabId).classList.add('active');

      if (targetTabId === 'tab-notes') loadNotes(state.notesPage);
      if (targetTabId === 'tab-posts') loadPosts(state.postsPage);
      if (targetTabId === 'tab-admin') {
        loadAdminUsers(state.adminUsersPage);
        loadAdminNotes(state.adminNotesPage);
      }
    });
  });
}

// Update Session UI
function updateSessionUI() {
  if (state.user && state.token) {
    const roleBadge = state.user.role === 'admin' ? '[ADMIN]' : '[USER]';
    sessionStatus.innerHTML = `Signed in as <strong>${escapeHtml(state.user.name)}</strong> <span class="badge">${roleBadge}</span>`;
    btnLogout.classList.remove('hidden');

    if (state.user.role === 'admin') {
      tabBtnAdmin.classList.remove('hidden');
    } else {
      tabBtnAdmin.classList.add('hidden');
    }
  } else {
    sessionStatus.textContent = 'Not logged in';
    btnLogout.classList.add('hidden');
    tabBtnAdmin.classList.add('hidden');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Logout
btnLogout.addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateSessionUI();
  showAlert('Logged out successfully.', 'success');
  document.getElementById('tab-btn-auth').click();
});

// Authentication Handlers
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));

    updateSessionUI();
    showAlert(`Welcome back, ${res.user.name}!`, 'success');
    document.getElementById('tab-btn-notes').click();
  } catch (err) {}
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const interestsRaw = document.getElementById('reg-interests').value;

  const interests = interestsRaw.split(',').map((s) => s.trim()).filter(Boolean);

  try {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, interests }),
    });

    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));

    updateSessionUI();
    showAlert('Account created and logged in!', 'success');
    document.getElementById('tab-btn-notes').click();
  } catch (err) {}
});

// Notes Management
async function loadNotes(page = 1) {
  if (!state.token) {
    document.getElementById('notes-list-container').innerHTML = '<p class="muted">Please log in to view your notes.</p>';
    document.getElementById('notes-pagination').innerHTML = '';
    return;
  }

  try {
    const res = await apiFetch(`/api/notes?page=${page}&limit=5`);
    state.notesPage = res.pagination.page;

    const container = document.getElementById('notes-list-container');
    if (res.notes.length === 0) {
      container.innerHTML = '<p class="muted">No notes found. Create your first note above!</p>';
    } else {
      container.innerHTML = res.notes
        .map(
          (note) => `
        <div class="list-item" id="note-${note._id}">
          <div class="list-item-title">
            <span>${escapeHtml(note.title)}</span>
            <span class="muted">${new Date(note.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="list-item-content">${escapeHtml(note.content)}</div>
          <div class="item-actions">
            <button class="btn btn-sm btn-secondary" onclick="editNotePrompt('${note._id}', '${escapeJs(note.title)}', '${escapeJs(note.content)}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteNoteAction('${note._id}')">Delete</button>
          </div>
        </div>
      `
        )
        .join('');
    }

    renderPagination('notes-pagination', res.pagination, 'loadNotes');
  } catch (err) {}
}

window.loadNotes = loadNotes;

function escapeJs(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

// Create Note
document.getElementById('form-create-note').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.token) return showAlert('Please log in first.', 'error');

  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').value.trim();

  try {
    await apiFetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });

    document.getElementById('form-create-note').reset();
    showAlert('Note created successfully!', 'success');
    loadNotes(1);
  } catch (err) {}
});

// Edit Note
window.editNotePrompt = async function (id, currentTitle, currentContent) {
  const newTitle = prompt('Edit Note Title:', currentTitle);
  if (newTitle === null) return;
  const newContent = prompt('Edit Note Content:', currentContent);
  if (newContent === null) return;

  try {
    await apiFetch(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: newTitle, content: newContent }),
    });
    showAlert('Note updated successfully!', 'success');
    loadNotes(state.notesPage);
  } catch (err) {}
};

// Delete Note
window.deleteNoteAction = async function (id) {
  if (!confirm('Are you sure you want to delete this note?')) return;
  try {
    await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
    showAlert('Note deleted successfully!', 'success');
    loadNotes(state.notesPage);
  } catch (err) {}
};

document.getElementById('btn-refresh-notes').addEventListener('click', () => loadNotes(state.notesPage));

// Public Posts Management
async function loadPosts(page = 1) {
  try {
    const res = await apiFetch(`/api/posts?page=${page}&limit=5`);
    state.postsPage = res.pagination.page;

    const container = document.getElementById('posts-list-container');
    if (res.posts.length === 0) {
      container.innerHTML = '<p class="muted">No community posts published yet.</p>';
    } else {
      container.innerHTML = res.posts
        .map(
          (post) => `
        <div class="list-item">
          <div class="list-item-title">
            <span>${escapeHtml(post.title)}</span>
          </div>
          <div class="list-item-meta">
            By <strong>${escapeHtml(post.author?.name || 'Anonymous')}</strong> (${escapeHtml(post.author?.email || 'N/A')}) • ${new Date(post.createdAt).toLocaleDateString()}
          </div>
          <div class="list-item-content">${escapeHtml(post.content)}</div>
        </div>
      `
        )
        .join('');
    }

    renderPagination('posts-pagination', res.pagination, 'loadPosts');
  } catch (err) {}
}

window.loadPosts = loadPosts;

// Create Post
document.getElementById('form-create-post').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.token) return showAlert('Please log in to publish a post.', 'error');

  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();

  try {
    await apiFetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });

    document.getElementById('form-create-post').reset();
    showAlert('Community post published!', 'success');
    loadPosts(1);
  } catch (err) {}
});

document.getElementById('btn-refresh-posts').addEventListener('click', () => loadPosts(state.postsPage));

// Aggregations Logic
// Scenario 1
document.getElementById('btn-run-scenario1').addEventListener('click', async () => {
  const output = document.getElementById('scenario1-output');
  output.textContent = 'Executing aggregation pipeline...';
  try {
    const res = await apiFetch('/api/aggregations/users-by-interest');
    output.textContent = JSON.stringify(res, null, 2);
    showAlert('Scenario 1 aggregation completed!', 'success');
  } catch (err) {
    output.textContent = `Error: ${err.message}`;
  }
});

// Scenario 2
document.getElementById('btn-use-my-id').addEventListener('click', () => {
  if (state.user && state.user._id) {
    document.getElementById('lookup-user-id').value = state.user._id;
  } else {
    showAlert('You are not logged in. Please log in first or type a User ID manually.', 'error');
  }
});

document.getElementById('btn-run-scenario2').addEventListener('click', async () => {
  const userId = document.getElementById('lookup-user-id').value.trim();
  const output = document.getElementById('scenario2-output');

  if (!userId) {
    return showAlert('Please enter a valid user ID.', 'error');
  }

  output.textContent = 'Executing $lookup aggregation pipeline...';
  try {
    const res = await apiFetch(`/api/aggregations/users/${userId}/posts`);
    output.textContent = JSON.stringify(res, null, 2);
    showAlert('Scenario 2 aggregation completed!', 'success');
  } catch (err) {
    output.textContent = `Error: ${err.message}`;
  }
});

// Admin Console Logic
async function loadAdminUsers(page = 1) {
  if (!state.token || state.user?.role !== 'admin') return;

  try {
    const res = await apiFetch(`/api/admin/users?page=${page}&limit=5`);
    state.adminUsersPage = res.pagination.page;

    const container = document.getElementById('admin-users-list');
    container.innerHTML = res.users
      .map(
        (u) => `
      <div class="list-item">
        <div class="list-item-title">
          <span>${escapeHtml(u.name)} <span class="badge">${u.role.toUpperCase()}</span></span>
          <span class="muted">${escapeHtml(u.email)}</span>
        </div>
        <div class="list-item-meta">
          ID: <code>${u._id}</code> | Interests: ${u.interests?.length ? u.interests.join(', ') : 'None'}
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-secondary" onclick="toggleUserRole('${u._id}', '${u.role}')">Toggle to ${u.role === 'admin' ? 'User' : 'Admin'}</button>
          <button class="btn btn-sm btn-danger" onclick="deleteUserAction('${u._id}')">Delete</button>
        </div>
      </div>
    `
      )
      .join('');

    renderPagination('admin-users-pagination', res.pagination, 'loadAdminUsers');
  } catch (err) {}
}

window.loadAdminUsers = loadAdminUsers;

async function loadAdminNotes(page = 1) {
  if (!state.token || state.user?.role !== 'admin') return;

  try {
    const res = await apiFetch(`/api/admin/notes?page=${page}&limit=5`);
    state.adminNotesPage = res.pagination.page;

    const container = document.getElementById('admin-notes-list');
    container.innerHTML = res.notes
      .map(
        (n) => `
      <div class="list-item">
        <div class="list-item-title">
          <span>${escapeHtml(n.title)}</span>
          <span class="muted">Author: ${escapeHtml(n.user?.name || 'Unknown')} (${escapeHtml(n.user?.email || 'N/A')})</span>
        </div>
        <div class="list-item-content">${escapeHtml(n.content)}</div>
      </div>
    `
      )
      .join('');

    renderPagination('admin-notes-pagination', res.pagination, 'loadAdminNotes');
  } catch (err) {}
}

window.loadAdminNotes = loadAdminNotes;

window.toggleUserRole = async function (id, currentRole) {
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  try {
    await apiFetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole }),
    });
    showAlert(`User role updated to ${newRole}!`, 'success');
    loadAdminUsers(state.adminUsersPage);
  } catch (err) {}
};

window.deleteUserAction = async function (id) {
  if (!confirm('Are you sure you want to delete this user? Their notes will be deleted.')) return;
  try {
    await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    showAlert('User deleted successfully.', 'success');
    loadAdminUsers(state.adminUsersPage);
  } catch (err) {}
};

document.getElementById('form-admin-create-user').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('admin-user-name').value.trim();
  const email = document.getElementById('admin-user-email').value.trim();
  const password = document.getElementById('admin-user-pass').value;
  const role = document.getElementById('admin-user-role').value;
  const interests = document.getElementById('admin-user-interests').value.split(',').map((s) => s.trim()).filter(Boolean);

  try {
    await apiFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, interests }),
    });
    document.getElementById('form-admin-create-user').reset();
    showAlert(`User '${name}' provisioned as ${role}!`, 'success');
    loadAdminUsers(1);
  } catch (err) {}
});

document.getElementById('btn-refresh-admin-users').addEventListener('click', () => loadAdminUsers(state.adminUsersPage));
document.getElementById('btn-refresh-admin-notes').addEventListener('click', () => loadAdminNotes(state.adminNotesPage));

// Generic Pagination Renderer
function renderPagination(elementId, pagination, handlerName) {
  const container = document.getElementById(elementId);
  if (!container || !pagination) return;

  const { page, totalPages, totalCount } = pagination;

  container.innerHTML = `
    <span>Page ${page} of ${totalPages} (${totalCount} total)</span>
    <div style="display: flex; gap: 0.5rem;">
      <button class="btn btn-sm btn-secondary" ${page <= 1 ? 'disabled' : ''} onclick="${handlerName}(${page - 1})">Prev</button>
      <button class="btn btn-sm btn-secondary" ${page >= totalPages ? 'disabled' : ''} onclick="${handlerName}(${page + 1})">Next</button>
    </div>
  `;
}

// Initial Bootstrap
initTabs();
updateSessionUI();
checkApiHealth();
loadPosts(1);
