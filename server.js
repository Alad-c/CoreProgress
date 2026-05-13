const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const { Pool } = require('pg');
// ... all other code remains unchanged
const { Pool } = require('pg'); // PostgreSQL client for Node.js
const bcrypt = require('bcrypt'); // Password hashing
const path = require('path');
const app = express();

// Use the port provided by Render or default to 3000
const PORT = process.env.PORT || 3000;

// --- DATABASE CONNECTION ---
// The connection string will be stored in Render's Environment Variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for most cloud database providers like Supabase
    }
});

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// --- DATABASE INITIALIZATION ---
// Create tables if they do not exist (PostgreSQL syntax)
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workout_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                type TEXT,
                value TEXT,
                date TEXT
            );
        `);
        console.log("✅ Cloud Database (PostgreSQL) tables are ready.");
    } catch (err) {
        console.error("❌ Database Init Error:", err.message);
    }
}
initDB();

// --- ROUTES ---

// 1. Registration Route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Validation: 3-20 characters, letters, numbers, and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid username format! Use 3-20 letters, numbers, or underscores." 
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, password) VALUES ($1, $2)';
        
        await pool.query(query, [username, hashedPassword]);
        res.json({ success: true, message: "Account created in Cloud DB! 🎉" });
    } catch (err) {
        if (err.code === '23505') { // PostgreSQL code for unique_violation
            return res.status(400).json({ 
                success: false, 
                message: "This username is already taken! 👤" 
            });
        }
        res.status(500).json({ success: false, message: "Server error during registration." });
    }
});

// 2. Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ success: false, message: "User not found." });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.json({ success: true, message: "Login successful!", username: user.username });
        } else {
            res.status(400).json({ success: false, message: "Invalid password." });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// 3. Log Workout Route
app.post('/log-workout', async (req, res) => {
    const { username, type, value } = req.body;
    const date = new Date().toLocaleDateString();

    try {
        // Find user ID
        const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userRes.rows.length === 0) return res.status(400).json({ success: false, message: "User not found" });

        const userId = userRes.rows[0].id;

        // Insert log using $n placeholders
        const query = 'INSERT INTO workout_logs (user_id, type, value, date) VALUES ($1, $2, $3, $4)';
        await pool.query(query, [userId, type, value, date]);

        res.json({ success: true, message: "Workout saved to Cloud DB!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to save log" });
    }
});

// 4. Leaderboard Route (Top 5 Users)
app.get('/top-results', async (req, res) => {
    const query = `
        SELECT 
            users.username,
            SUM(CASE WHEN workout_logs.type = 'Street Workout' THEN 1 ELSE 0 END) AS street_workouts,
            SUM(CASE WHEN workout_logs.type = 'Squash Match' THEN 1 ELSE 0 END) AS squash_matches,
            SUM(CASE WHEN workout_logs.type = 'Running Weekly Goal' THEN 1 ELSE 0 END) AS running_goals,
            COUNT(workout_logs.id) AS total_workouts
        FROM users
        JOIN workout_logs ON users.id = workout_logs.user_id
        GROUP BY users.id, users.username
        ORDER BY total_workouts DESC
        LIMIT 5
    `;

    try {
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error" });
    }
});

// 5. My History Route
app.post('/my-history', async (req, res) => {
    const { username } = req.body;

    try {
        const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userRes.rows.length === 0) return res.status(400).json({ success: false, message: "User not found" });

        const query = 'SELECT id, type, value, date FROM workout_logs WHERE user_id = $1 ORDER BY id DESC';
        const result = await pool.query(query, [userRes.rows[0].id]);
        
        res.json({ success: true, logs: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error" });
    }
});

// 6. Delete Log Route
app.post('/delete-log', async (req, res) => {
    const { username, logId } = req.body;

    try {
        const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userRes.rows.length === 0) return res.status(400).json({ success: false, message: "Auth failed" });

        const query = 'DELETE FROM workout_logs WHERE id = $1 AND user_id = $2';
        const result = await pool.query(query, [logId, userRes.rows[0].id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Log not found or unauthorized" });
        }
        
        res.json({ success: true, message: "Log deleted from Cloud DB!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete" });
    }
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});