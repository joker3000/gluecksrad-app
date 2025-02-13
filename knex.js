const Knex = require("knex");

const knex = Knex({
    client: "better-sqlite3",
    connection: {
        filename: "/tmp/gluecksrad.db"
    },
    useNullAsDefault: true
});

module.exports = knex;
