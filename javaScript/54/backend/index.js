const express = require('express');
const request = require('request');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let bearerToken = '';

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
    try {
      const data = JSON.parse(response.body);
      bearerToken = data.bearerToken;
      res.send({ success: true });
    } catch (e) {
      res.status(500).send({ error: 'Erro ao interpretar resposta de login' });
    }
  });
});

app.post('/cliente', (req, res) => {
  const { codparc } = req.body;

  const options = {
    method: 'POST',
    url: 'https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CLIENTE = ? and this.CODPARC = ?'
            },
            parameter: [
              { $: 'S', type: 'S' },
              { $: codparc, type: 'I' }
            ]
          },
          entity: {
            fieldset: {
              list: 'CODPARC,NOMEPARC,FORNECEDOR,CLIENTE,CODCID,CLASSIFICMS'
            }
          }
        }
      }
    })
  };

  request(options, function (error, response) {
    if (error) return res.status(500).send(error);
    try {
      const data = JSON.parse(response.body);
      res.send(data);
    } catch (e) {
      res.status(500).send({ error: 'Erro ao interpretar resposta do cliente' });
    }
  });
});

app.listen(3000, () => console.log('Backend rodando na porta 3000'));
