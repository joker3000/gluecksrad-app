const { createClient } = require("@libsql/client");

const db = createClient({
  url: process.env.DATABASE_URL, // Get Turso DB URL from Vercel env
});

async function initializeDatabase() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstname TEXT NOT NULL,
        lastname TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS spins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        spin_number INTEGER NOT NULL,
        distribution TEXT NOT NULL,
        spin_angle REAL,
        spin_value INTEGER,
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
    `);

    console.log("✅ Turso Database Initialized!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
  }
}

// Initialize the database on startup
initializeDatabase();

module.exports = db;
