const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./health_data.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the health_data database.');
});

db.serialize(() => {
    // Users table (for patients and doctors)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('patient', 'doctor'))
    )`);

    // Appointments table
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT,
        doctor TEXT,
        location TEXT,
        source TEXT DEFAULT 'manual',
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Medications table
    db.run(`CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        dosage TEXT,
        duration TEXT,
        prescription_date TEXT,
        source TEXT DEFAULT 'ai',
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Medical Terms table
    db.run(`CREATE TABLE IF NOT EXISTS medical_terms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        term TEXT NOT NULL,
        explanation TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // AI Suggestions table
    db.run(`CREATE TABLE IF NOT EXISTS suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        suggestion TEXT NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
});

module.exports = db; 