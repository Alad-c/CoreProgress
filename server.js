const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt'); // For password encryption
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware to read JSON and HTML Form data
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// 1. Initialize Database (CoreProgress.db will be created automatically)
const db = new sqlite3.Database('./CoreProgress.db', (err) => {
    if (err) console.error('DB Error:', err.message);
    else console.log('✅ Connected to CoreProgress SQLite database.');
});

// 2. Create Tables if they don't exist
db.serialize(() => {
    // Create Users Table (UNIQUE constraint prevents duplicate usernames)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
    
    // Create Workout Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS workout_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,
        value TEXT,
        date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
    
    console.log("✅ Database tables are ready.");
});

// --- ROUTES ---

// 3. Registration Route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // --- SERVER-SIDE VALIDATION ---
    // Check if username is between 3-20 characters and contains only letters, numbers, or underscores
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid username format! Use 3-20 letters, numbers, or underscores." 
        });
    }

    try {
        // Hash the password (encrypt it) so it's secure
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
        db.run(query, [username, hashedPassword], function(err) {
            if (err) {
                // Check if the error is because the username already exists
                if (err.message && err.message.includes("UNIQUE constraint failed")) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "This username is already taken. Please choose another one! 👤" 
                    });
                }
                // Generic database error
                return res.status(500).json({ success: false, message: "Database error during registration." });
            }
            // Success
            res.json({ success: true, message: "Account created successfully! 🎉" });
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "Server error during registration." });
    }
});

// 4. Login Route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = `SELECT * FROM users WHERE username = ?`;
    db.get(query, [username], async (err, user) => {
        if (err) return res.status(500).json({ success: false, message: "Database error." });
        if (!user) return res.status(400).json({ success: false, message: "User not found." });

        // Compare the password sent with the encrypted one in DB
        const match = await bcrypt.compare(password, user.password);
        
        if (match) {
            res.json({ success: true, message: "Login successful!", username: user.username });
        } else {
            res.status(400).json({ success: false, message: "Invalid password." });
        }
    });
});

// --- LOG WORKOUT DATA ---
app.post('/log-workout', (req, res) => {
    const { username, type, value } = req.body;
    const date = new Date().toLocaleDateString();

    // 1. Find the user ID first
    db.get(`SELECT id FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(400).json({ success: false, message: "User not found" });

        // 2. Insert the log
        const query = `INSERT INTO workout_logs (user_id, type, value, date) VALUES (?, ?, ?, ?)`;
        db.run(query, [user.id, type, value, date], function(err) {
            if (err) {
                console.error("Log error:", err);
                return res.status(500).json({ success: false, message: "Failed to save log" });
            }
            res.json({ success: true, message: "Workout saved to database!" });
        });
    });
});

// --- GET TOP 5 USERS (Breakdown by sport) ---
app.get('/top-results', (req, res) => {
    const query = `
        SELECT 
            users.username,
            SUM(CASE WHEN workout_logs.type = 'Street Workout' THEN 1 ELSE 0 END) AS street_workouts,
            SUM(CASE WHEN workout_logs.type = 'Squash Match' THEN 1 ELSE 0 END) AS squash_matches,
            SUM(CASE WHEN workout_logs.type = 'Running Weekly Goal' THEN 1 ELSE 0 END) AS running_goals,
            COUNT(workout_logs.id) AS total_workouts
        FROM users
        JOIN workout_logs ON users.id = workout_logs.user_id
        GROUP BY users.id
        ORDER BY total_workouts DESC
        LIMIT 5
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json(rows);
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});