const faunadb = require('faunadb');
const q = faunadb.query;

exports.handler = async (event) => {
  const { FAUNADB_SECRET } = process.env;
  const client = new faunadb.Client({ secret: FAUNADB_SECRET });

  try {
    const { ip } = JSON.parse(event.body);
    const timestamp = Date.now();

    await client.query(
      q.Let(
        { match: q.Match(q.Index('online_devices'), ip) },
        q.If(
          q.Exists(q.Var('match')),
          q.Update(q.Select(['ref'], q.Get(q.Var('match'))), { data: { timestamp } }),
          q.Create(q.Collection('OnlineDevices'), { data: { ip, timestamp } })
        )
      )
    );

    return { statusCode: 200, body: JSON.stringify({ message: 'Device registered successfully' }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
