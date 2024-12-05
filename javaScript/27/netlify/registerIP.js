const faunadb = require('faunadb');
const q = faunadb.query;

// Use a variável de ambiente para a chave secreta
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET_KEY // Variável de ambiente
});

exports.handler = async function(event, context) {
  const { ip } = JSON.parse(event.body);

  try {
    // Insere o IP na coleção "accesses"
    await client.query(
      q.Create(q.Collection('accesses'), {
        data: { ip }
      })
    );

    // Conta o número de acessos simultâneos
    const result = await client.query(
      q.Count(q.Documents(q.Collection('accesses')))
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ simultaneousAccesses: result }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao registrar acesso' }),
    };
  }
};
