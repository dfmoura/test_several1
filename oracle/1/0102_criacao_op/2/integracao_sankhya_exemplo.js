// Exemplo de integração backend Node.js/Express com SankhyaJX
// Instale as dependências: express, body-parser, sankhyajx (npm install express body-parser sankhyajx)

const express = require('express');
const bodyParser = require('body-parser');
const { SankhyaJX } = require('sankhyajx'); // Supondo que a lib siga esse padrão

const app = express();
app.use(bodyParser.json());

// Configuração de conexão com o Sankhya
const sankhya = new SankhyaJX({
  url: 'http://SEU_SERVIDOR_SANKHYA:8080',
  user: 'USUARIO',
  password: 'SENHA',
});

// Endpoint para receber dados do front-end e inserir ordem de produção
app.post('/ordem-producao', async (req, res) => {
  try {
    const dadosOrdem = req.body;
    // Exemplo: dadosOrdem = { campo1: valor1, campo2: valor2, ... }

    // Autentica na API Sankhya
    await sankhya.login();

    // Insere a ordem de produção usando a SankhyaJX
    const resultado = await sankhya.crud.insert({
      entity: 'OrdemProducao', // Ajuste para o nome correto da entidade no Sankhya
      data: dadosOrdem,
    });

    // Logout por segurança
    await sankhya.logout();

    res.status(201).json({ sucesso: true, resultado });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});

// Observações:
// - Ajuste os campos de conexão e a entidade conforme sua configuração Sankhya.
// - No front-end, envie os dados via fetch/axios para http://localhost:3000/ordem-producao.
// - Consulte a documentação da SankhyaJX para métodos e entidades disponíveis. 