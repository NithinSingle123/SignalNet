const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'signalnet.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, source, metadata FROM signals WHERE metadata IS NOT NULL ORDER BY timestamp DESC LIMIT 5", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
