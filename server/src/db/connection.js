const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const defaultDbPath = path.resolve(__dirname, "..", "..", "data", "ar-billing-tracker.sqlite");

function createDbConnection(dbPath = process.env.DB_PATH || defaultDbPath) {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

module.exports = {
  createDbConnection,
  defaultDbPath,
};
