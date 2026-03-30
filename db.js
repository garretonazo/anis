const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'anis.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    total_pages INTEGER NOT NULL DEFAULT 0,
    pages_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('idea', 'cita', 'ensayo')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed books if table is empty
const count = db.prepare('SELECT COUNT(*) as n FROM books').get();
if (count.n === 0) {
  const insert = db.prepare(
    'INSERT INTO books (title, author, total_pages, pages_read) VALUES (?, ?, ?, ?)'
  );
  const books = [
    ['Yo necesito amor', 'Klaus Kinski', 200, 0],
    ['Meridiano de sangre', 'Cormac McCarthy', 374, 0],
    ['Mañana en la batalla piensa en mí', 'Javier Marías', 320, 0],
    ['El asunto', 'Julian Barnes', 280, 0],
    ['Vuelo ciego', 'Idea Vilariño', 96, 0],
    ['No me pregunten cómo pasa el tiempo', 'José Emilio Pacheco', 148, 0],
    ['Las amigas', 'Aurora Venturini', 192, 0],
    ['El ticket que explotó', 'William S. Burroughs', 208, 0],
    ['El intérprete del dolor', 'Jhumpa Lahiri', 232, 0],
  ];
  for (const b of books) insert.run(...b);
}

module.exports = db;
