const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

app.use(express.json());

const pool = new Pool({
  user: 'meuusuario1',
  host: 'localhost',
  database: 'meubanco1',
  password: '123456senha',
  port: 5432,
});

// Rota para obter todas as categorias
app.get('/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar categorias');
  }
});

// Rota para adicionar uma nova categoria
app.post('/categorias', async (req, res) => {
  const { nome, tipo } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO categorias (nome, tipo) VALUES ($1, $2) RETURNING *',
      [nome, tipo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao adicionar categoria');
  }
});

// Rota para atualizar uma categoria
app.put('/categorias/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, tipo } = req.body;
  try {
    const result = await pool.query(
      'UPDATE categorias SET nome = $1, tipo = $2 WHERE id = $3 RETURNING *',
      [nome, tipo, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao atualizar categoria');
  }
});

// Rota para deletar uma categoria
app.delete('/categorias/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categorias WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao deletar categoria');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

const cors = require('cors');
app.use(cors());