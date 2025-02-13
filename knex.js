const Knex = require("knex");

const knex = Knex({
    client: "better-sqlite3",
    connection: {
        filename: "/tmp/gluecksrad.db" // ✅ Vercel speichert SQLite-Daten in /tmp/
    },
    useNullAsDefault: true
});

module.exports = knex;
