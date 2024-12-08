const faunadb = require('faunadb');
const q = faunadb.query;

const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET, // Chave de API do FaunaDB
});

exports.handler = async (event) => {
  const method = event.httpMethod;
  
  switch (method) {
    case 'GET':
      // Listar todos os acessos
      try {
        const result = await client.query(
          q.Map(
            q.Paginate(q.Match(q.Index('all_accesses'))),
            q.Lambda('ref', q.Get(q.Var('ref')))
          )
        );
        return {
          statusCode: 200,
          body: JSON.stringify(result.data.map((item) => item.data)),
        };
      } catch (error) {
        return { statusCode: 500, body: error.toString() };
      }

    case 'POST':
      // Adicionar novo acesso
      const data = JSON.parse(event.body);
      try {
        const result = await client.query(
          q.Create(q.Collection('Accesses'), { data })
        );
        return { statusCode: 200, body: JSON.stringify(result) };
      } catch (error) {
        return { statusCode: 500, body: error.toString() };
      }

    case 'DELETE':
      // Remover acesso por IP
      const { ip } = JSON.parse(event.body);
      try {
        const result = await client.query(
          q.Map(
            q.Paginate(q.Match(q.Index('all_accesses'))),
            q.Lambda('ref', q.Get(q.Var('ref')))
          )
        );
        const toDelete = result.data.find((item) => item.data.ip === ip);
        if (toDelete) {
          await client.query(q.Delete(toDelete.ref));
          return { statusCode: 200, body: 'Deleted' };
        } else {
          return { statusCode: 404, body: 'Not found' };
        }
      } catch (error) {
        return { statusCode: 500, body: error.toString() };
      }

    default:
      return { statusCode: 405, body: 'Method Not Allowed' };
  }
};
