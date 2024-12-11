const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

// Carregar o dotenv apenas no ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const port = process.env.PORT || 3000;

// Configuração da conexão ao banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(bodyParser.json());
app.use(express.static('client')); // Servir o frontend

// Endpoints
app.get('/api/users', async (req, res) => {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
});

app.post('/api/users', async (req, res) => {
    const { fullName, email } = req.body;
    await pool.query('INSERT INTO users (full_name, email) VALUES ($1, $2)', [fullName, email]);
    res.status(201).send();
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { fullName, email } = req.body;
    await pool.query('UPDATE users SET full_name = $1, email = $2 WHERE id = $3', [fullName, email, id]);
    res.status(200).send();
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).send();
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
