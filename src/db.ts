import Database from 'better-sqlite3';

// Inizializza il database SQLite
const db = new Database('sqlite.db');

// Crea la tabella delle categorie se non esiste
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;