// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
    host: 'aws-0-us-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.jdmgcvhcaulyllydvcob',
    password: 'buc110t@2025', //depois colocar em variavel
    ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.json());

// Login Endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const query = 'SELECT * FROM users WHERE username = $1 AND password = $2';
        const result = await pool.query(query, [username, password]);

        if (result.rows.length > 0) {
            res.status(200).json({ message: 'Login successful!' });
        } else {
            res.status(401).json({ message: 'Invalid username or password.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal server error.' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
