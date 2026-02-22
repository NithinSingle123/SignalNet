const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration from environment variables
const pool = new Pool({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'signalnet',
    password: process.env.PG_PASSWORD || 'password',
    port: process.env.PG_PORT || 5432,
});

pool.on('connect', () => {
    console.log('Connected to the PostgreSQL database.');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

const initSchema = async () => {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    let schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    try {
        // Replace SQLite-specific syntax for PostgreSQL compatibility
        const pgSchema = schemaSql
            .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
            .replace(/REAL/g, 'DOUBLE PRECISION')
            .replace(/BIGINT/g, 'BIGINT') // placeholders if needed
            .replace(/INTEGER\s*(?!PRIMARY)/g, 'BIGINT '); // Timestamps usually better as BIGINT

        await pool.query(pgSchema);
        console.log('Database schema initialized.');

        // Migration: safely add verification_data to existing live DB
        await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS verification_data TEXT`).catch(err => {
            console.error('Migration error (verification_data):', err);
        });

        // Migration: safely add metadata to signals table
        await pool.query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS metadata TEXT`).catch(err => {
            console.error('Migration error (metadata):', err);
        });

        // Migration: safely add lifecycle_phase to events table
        await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS lifecycle_phase TEXT`).catch(err => {
            console.error('Migration error (lifecycle_phase):', err);
        });

        // Migration: safely add type to events table
        await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS type TEXT`).catch(err => {
            console.error('Migration error (type):', err);
        });

        // Migration: create advisories table if missing
        await pool.query(`
            CREATE TABLE IF NOT EXISTS advisories (
                id TEXT PRIMARY KEY,
                event_id TEXT,
                message TEXT,
                channels TEXT,
                created_at BIGINT,
                FOREIGN KEY(event_id) REFERENCES events(id)
            )
        `).catch(err => {
            console.error('Migration error (advisories table):', err);
        });

    } catch (err) {
        console.error('Error initializing schema:', err);
    }
};

initSchema();

module.exports = {
    query: (text, params) => pool.query(text, params),
    all: (text, params) => pool.query(text, params).then(res => res.rows),
    get: (text, params) => pool.query(text, params).then(res => res.rows[0]),
    run: (text, params) => pool.query(text, params), // simplified for compat
};
