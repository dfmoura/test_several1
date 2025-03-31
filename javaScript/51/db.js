const { Pool } = require('pg');

const pool = new Pool({
  user: 'meuusuario1',
  host: 'localhost',
  database: 'meubanco1',
  password: '123456senha',
  port: 5432,
});

module.exports = pool;
