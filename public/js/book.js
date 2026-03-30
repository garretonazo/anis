import { checkAuth, authHeaders } from './auth.js';

const bookId = window.location.pathname.split('/').pop();
let allNotes = [];
let activeFilter = 'all';
let isOwner = false;

async function init() {
  isOwner = await checkAuth();
  await Promise.all([loadBook(), loadNotes()]);
}

async function loadBook() {
  const res = await fetch(`/api/books/${bookId}`);
  if (!res.ok) {
    document.getElementById('book-header').innerHTML =
      '<p style="color:var(--text-muted)">Libro no encontrado.</p>';
    return;
  }
  const book = await res.json();
  document.title = `${book.title} — Un té de Anis`;
  renderHeader(book);
  document.getElementById('notes-section').style.display = '';
}

function pct(book) {
  if (!book.total_pages) return 0;
  return Math.min(100, Math.round((book.pages_read / book.total_pages) * 100));
}

function renderHeader(book) {
  const p = pct(book);
  document.getElementById('book-header').innerHTML = `
    <h1 class="book-page-title">${book.title}</h1>
    <p class="book-page-author">${book.author}</p>
    <div class="progress-hero">
      <div class="progress-hero-info">
        <div style="display:flex;gap:6px;align-items:baseline;margin-bottom:6px">
          <span class="progress-hero-pct" id="pct-display">${p}%</span>
          <span style="font-size:.75rem;color:var(--text-muted)">${book.pages_read} / ${book.total_pages} págs.</span>
        </div>
        <div class="progress-hero-bar">
          <div class="progress-hero-fill" id="hero-fill" style="width:${p}%"></div>
        </div>
      </div>
      ${isOwner ? `
        <div class="progress-update">
          <input type="number" id="update-pages" value="${book.pages_read}" min="0" max="${book.total_pages}" placeholder="Páginas leídas" />
          <span style="font-size:.85rem;color:var(--text-muted)">/ ${book.total_pages}</span>
          <button class="btn btn-primary" id="update-btn">Guardar</button>
        </div>
      ` : ''}
    </div>
  `;

  if (isOwner) {
    document.getElementById('update-btn').addEventListener('click', async () => {
      const pages_read = parseInt(document.getElementById('update-pages').value);
      const res = await fetch(`/api/books/${bookId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ pages_read }),
      });
      const updated = await res.json();
      const newPct = pct(updated);
      document.getElementById('hero-fill').style.width = newPct + '%';
      document.getElementById('pct-display').textContent = newPct + '%';
    });
  }
}

async function loadNotes() {
  const res = await fetch(`/api/books/${bookId}/notes`);
  allNotes = await res.json();
  renderNotes();
  toggleNoteForm();
}

function toggleNoteForm() {
  const form = document.getElementById('add-note-form');
  if (form) form.style.display = isOwner ? '' : 'none';
}

function renderNotes() {
  const list = document.getElementById('notes-list');
  const filtered = activeFilter === 'all'
    ? allNotes
    : allNotes.filter(n => n.type === activeFilter);

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">No hay notas todavía.</div>';
    return;
  }

  list.innerHTML = filtered.map(n => `
    <div class="note-card" data-type="${n.type}" data-id="${n.id}">
      <div class="note-type-badge">${labelFor(n.type)}</div>
      <div class="note-content">${escapeHtml(n.content)}</div>
      <div class="note-footer">
        <span class="note-date">${formatDate(n.created_at)}</span>
        ${isOwner ? `<button class="note-delete" data-id="${n.id}">eliminar</button>` : ''}
      </div>
    </div>
  `).join('');

  if (isOwner) {
    list.querySelectorAll('.note-delete').forEach(btn => {
      btn.addEventListener('click', deleteNote);
    });
  }
}

function labelFor(type) {
  return { idea: 'Idea', cita: 'Cita', ensayo: 'Mini-ensayo' }[type] || type;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function deleteNote(e) {
  const id = e.target.dataset.id;
  if (!confirm('¿Eliminar esta nota?')) return;
  await fetch(`/api/notes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  allNotes = allNotes.filter(n => n.id != id);
  renderNotes();
}

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    renderNotes();
  });
});

// Add note
document.getElementById('add-note-btn').addEventListener('click', async () => {
  const content = document.getElementById('note-content').value.trim();
  const type = document.getElementById('note-type').value;
  if (!content) return;

  const res = await fetch(`/api/books/${bookId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ type, content }),
  });

  const note = await res.json();
  allNotes.unshift(note);
  document.getElementById('note-content').value = '';
  renderNotes();
});

document.getElementById('note-content').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    document.getElementById('add-note-btn').click();
  }
});

init();
