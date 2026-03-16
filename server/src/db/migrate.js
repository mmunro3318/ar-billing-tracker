const fs = require("fs");
const path = require("path");
const { createDbConnection } = require("./connection");

const schemaPath = path.resolve(__dirname, "schema.sql");

function runSchemaMigration() {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const sql = fs.readFileSync(schemaPath, "utf8");
  const db = createDbConnection();

  try {
    db.exec(sql);
    return { success: true };
  } finally {
    db.close();
  }
}

if (require.main === module) {
  try {
    runSchemaMigration();
    console.log("SQLite schema migration complete.");
  } catch (error) {
    console.error("SQLite schema migration failed.");
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  runSchemaMigration,
};
