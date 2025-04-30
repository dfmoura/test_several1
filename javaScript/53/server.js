const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Endpoint somente para login
app.post('/api/login', async (req, res) => {
  const loginUrl = 'https://api.sandbox.sankhya.com.br/login';

  const loginData = {
    token: "e9be5881-84dd-426b-96b0-d7963fd7db84",
    appkey: "9250975a-bcf3-4d27-84ab-ee8244866b1e",
    username: "diogomou@gmail.com",
    password: "Buc110t@20251"
  };

  try {
    const loginResp = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });

    if (!loginResp.ok) {
      throw new Error('Erro na autenticação');
    }

    const loginResult = await loginResp.json();
    res.json(loginResult);
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
