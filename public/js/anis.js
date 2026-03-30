import { checkAuth, authHeaders } from './auth.js';

let selectedFile = null;
let allFiles = [];
let isOwner = false;

async function init() {
  isOwner = await checkAuth();
  loadFiles();
}

const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadForm = document.getElementById('upload-form');
const fileNameDisplay = document.getElementById('file-name-display');

uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) selectFile(fileInput.files[0]);
});

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));

uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) selectFile(e.dataTransfer.files[0]);
});

function selectFile(file) {
  selectedFile = file;
  fileNameDisplay.value = file.name;
  uploadZone.style.display = 'none';
  uploadForm.style.display = 'flex';
  document.getElementById('file-description').focus();
}

document.getElementById('cancel-upload').addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  uploadZone.style.display = '';
  uploadForm.style.display = 'none';
  document.getElementById('file-description').value = '';
});

document.getElementById('confirm-upload').addEventListener('click', async () => {
  if (!selectedFile) return;

  const btn = document.getElementById('confirm-upload');
  btn.disabled = true;
  btn.textContent = 'Subiendo...';

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('description', document.getElementById('file-description').value);

  try {
    const res = await fetch('/api/uploads', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Error al subir');
    const record = await res.json();
    allFiles.unshift(record);
    renderFiles();

    selectedFile = null;
    fileInput.value = '';
    uploadZone.style.display = '';
    uploadForm.style.display = 'none';
    document.getElementById('file-description').value = '';
  } catch {
    alert('No se pudo subir el archivo.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Subir archivo';
  }
});

async function loadFiles() {
  const res = await fetch('/api/uploads');
  allFiles = await res.json();
  renderFiles();
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const icons = { pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', mp3: '🎵', mp4: '🎬', txt: '📝', doc: '📝', docx: '📝' };
  return icons[ext] || '📎';
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderFiles() {
  const list = document.getElementById('files-list');
  if (!allFiles.length) {
    list.innerHTML = '<div class="empty-state">Todavía no hay archivos subidos.</div>';
    return;
  }
  list.innerHTML = allFiles.map(f => `
    <div class="file-item" data-id="${f.id}">
      <div class="file-icon">${fileIcon(f.original_name)}</div>
      <div class="file-info">
        <a href="/uploads/${f.filename}" target="_blank" class="file-name">${f.original_name}</a>
        ${f.description ? `<p class="file-desc">${escapeHtml(f.description)}</p>` : ''}
        <p class="file-date">${formatDate(f.created_at)}</p>
      </div>
      ${isOwner ? `<button class="btn btn-danger" data-id="${f.id}">Eliminar</button>` : ''}
    </div>
  `).join('');

  if (isOwner) {
    list.querySelectorAll('.btn-danger').forEach(btn => {
      btn.addEventListener('click', () => deleteFile(parseInt(btn.dataset.id)));
    });
  }
}

async function deleteFile(id) {
  if (!confirm('¿Eliminar este archivo?')) return;
  await fetch(`/api/uploads/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  allFiles = allFiles.filter(f => f.id !== id);
  renderFiles();
}

init();
