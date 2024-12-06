const faunadb = require('faunadb');
const q = faunadb.query;

// Crie um cliente do FaunaDB usando sua chave secreta
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET_KEY, // Defina sua chave de API do FaunaDB
});

exports.handler = async (event, context) => {
  if (event.httpMethod === 'POST') {
    const { ip } = JSON.parse(event.body);
    
    try {
      // Registra o IP na coleção 'accesses'
      const result = await client.query(
        q.Create(q.Collection('accesses'), {
          data: {
            ip: ip,
            ts: q.Now(),
          },
        })
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'IP registrado com sucesso!' }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Erro ao registrar IP no FaunaDB' }),
      };
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Método não permitido' }),
  };
};
