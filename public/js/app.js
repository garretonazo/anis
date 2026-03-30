import { checkAuth, login, logout, authHeaders } from './auth.js';

const list = document.getElementById('books-list');
const modal = document.getElementById('progress-modal');
const form = document.getElementById('progress-form');
let activeBookId = null;
let isOwner = false;

async function init() {
  isOwner = await checkAuth();
  updateAuthUI();
  await loadBooks();
}

function updateAuthUI() {
  document.getElementById('auth-btn').textContent = isOwner ? 'Salir' : 'Entrar';
  document.getElementById('auth-btn').classList.toggle('owner-active', isOwner);
}

async function loadBooks() {
  const res = await fetch('/api/books');
  const books = await res.json();
  books.sort((a, b) => pct(b) - pct(a));
  render(books);
}

function pct(book) {
  if (!book.total_pages) return 0;
  return Math.min(100, Math.round((book.pages_read / book.total_pages) * 100));
}

function render(books) {
  if (!books.length) {
    list.innerHTML = '<div class="empty-state">No hay libros aún.</div>';
    return;
  }
  list.innerHTML = books.map(b => {
    const p = pct(b);
    return `
      <div class="book-row" data-id="${b.id}">
        <div class="book-main">
          <a href="/book/${b.id}" class="book-title-link">${b.title}</a>
          <p class="book-author">${b.author}</p>
        </div>
        <div class="book-progress-inline">
          <div class="progress-bar-sm">
            <div class="progress-fill-sm" style="width:${p}%"></div>
          </div>
          <span class="progress-pct-sm">${p}%</span>
        </div>
        ${isOwner ? `
          <button class="book-update-btn" onclick="openModal(${b.id}, '${escStr(b.title)}', ${b.pages_read}, ${b.total_pages})">
            editar
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

function escStr(str) {
  return str.replace(/'/g, "\\'");
}

window.openModal = function(id, title, pagesRead, totalPages) {
  activeBookId = id;
  document.getElementById('modal-title-display').value = title;
  document.getElementById('modal-pages-read').value = pagesRead;
  document.getElementById('modal-total-pages').value = totalPages;
  modal.classList.add('open');
  document.getElementById('modal-pages-read').focus();
};

document.getElementById('modal-cancel').addEventListener('click', () => {
  modal.classList.remove('open');
});

modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.remove('open');
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  const pages_read = parseInt(document.getElementById('modal-pages-read').value);
  const total_pages = parseInt(document.getElementById('modal-total-pages').value);

  await fetch(`/api/books/${activeBookId}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ pages_read, total_pages }),
  });

  modal.classList.remove('open');
  loadBooks();
});

// ─── Login / Logout ───────────────────────────────────────────────────────────

document.getElementById('auth-btn').addEventListener('click', async () => {
  if (isOwner) {
    await logout();
    isOwner = false;
    updateAuthUI();
    loadBooks();
  } else {
    document.getElementById('login-modal').classList.add('open');
    document.getElementById('login-password').focus();
  }
});

document.getElementById('login-cancel').addEventListener('click', () => {
  document.getElementById('login-modal').classList.remove('open');
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent = '';
});

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const password = document.getElementById('login-password').value;
  try {
    await login(password);
    isOwner = true;
    updateAuthUI();
    document.getElementById('login-modal').classList.remove('open');
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').textContent = '';
    loadBooks();
  } catch {
    document.getElementById('login-error').textContent = 'Contraseña incorrecta';
  }
});

document.getElementById('login-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('login-modal')) {
    document.getElementById('login-modal').classList.remove('open');
  }
});

init();
