const express = require('express');
const request = require('request');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/login', (req, res) => {
  const options = {
    method: 'POST',
    url: 'https://api.sandbox.sankhya.com.br/login',
    headers: {
      token: 'e9be5881-84dd-426b-96b0-d7963fd7db84',
      appkey: '9250975a-bcf3-4d27-84ab-ee8244866b1e',
      username: 'diogomou@gmail.com',
      password: 'Buc110t@20251'
    }
  };

  request(options, function (error, response) {
    if (error) return res.status(500).send(error);
    res.send(response.body);
  });
});

app.listen(3000, () => console.log('Backend rodando na porta 3000'));
