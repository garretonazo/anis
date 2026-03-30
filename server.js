const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Auth config ──────────────────────────────────────────────────────────────
// Cambiá esta contraseña por la tuya
const OWNER_PASSWORD = 'Oliver';
const sessions = new Set();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function requireAuth(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public/uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Auth endpoints ───────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password !== OWNER_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  const token = generateToken();
  sessions.add(token);
  res.json({ token });
});

app.post('/api/auth/logout', (req, res) => {
  const auth = req.headers['authorization'];
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/auth/check', (req, res) => {
  const auth = req.headers['authorization'];
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  res.json({ isOwner: !!(token && sessions.has(token)) });
});

// ─── Books ────────────────────────────────────────────────────────────────────

app.get('/api/books', (req, res) => {
  const books = db.prepare('SELECT * FROM books ORDER BY id').all();
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Libro no encontrado' });
  res.json(book);
});

app.patch('/api/books/:id/progress', requireAuth, (req, res) => {
  const { pages_read, total_pages } = req.body;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Libro no encontrado' });

  const newPages = pages_read !== undefined ? pages_read : book.pages_read;
  const newTotal = total_pages !== undefined ? total_pages : book.total_pages;

  db.prepare('UPDATE books SET pages_read = ?, total_pages = ? WHERE id = ?')
    .run(newPages, newTotal, req.params.id);

  res.json({ ...book, pages_read: newPages, total_pages: newTotal });
});

// ─── Notes ────────────────────────────────────────────────────────────────────

app.get('/api/books/:id/notes', (req, res) => {
  const notes = db
    .prepare('SELECT * FROM notes WHERE book_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json(notes);
});

app.post('/api/books/:id/notes', requireAuth, (req, res) => {
  const { type, content } = req.body;
  if (!type || !content) return res.status(400).json({ error: 'type y content son requeridos' });
  if (!['idea', 'cita', 'ensayo'].includes(type))
    return res.status(400).json({ error: 'type debe ser idea, cita o ensayo' });

  const result = db
    .prepare('INSERT INTO notes (book_id, type, content) VALUES (?, ?, ?)')
    .run(req.params.id, type, content);

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(note);
});

app.delete('/api/notes/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Uploads (subir está abierto, eliminar requiere auth) ─────────────────────

app.get('/api/uploads', (req, res) => {
  const files = db.prepare('SELECT * FROM uploads ORDER BY created_at DESC').all();
  res.json(files);
});

app.post('/api/uploads', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
  const { description } = req.body;

  const result = db
    .prepare('INSERT INTO uploads (filename, original_name, description) VALUES (?, ?, ?)')
    .run(req.file.filename, req.file.originalname, description || null);

  const record = db.prepare('SELECT * FROM uploads WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(record);
});

app.delete('/api/uploads/:id', requireAuth, (req, res) => {
  const record = db.prepare('SELECT * FROM uploads WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Archivo no encontrado' });

  const fs = require('fs');
  const filePath = path.join(__dirname, 'public/uploads', record.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM uploads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────

app.get('/book/:id', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/book.html'))
);
app.get('/anis', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/anis.html'))
);

app.listen(PORT, () =>
  console.log(`Un té de Anis corriendo en http://localhost:${PORT}`)
);
