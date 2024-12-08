const faunadb = require('faunadb');
const q = faunadb.query;

exports.handler = async () => {
  const { FAUNADB_SECRET } = process.env;
  const client = new faunadb.Client({ secret: FAUNADB_SECRET });

  try {
    const now = Date.now();
    const threshold = 30000; // 30 segundos

    const devices = await client.query(
      q.Map(
        q.Paginate(q.Match(q.Index('online_devices'))),
        q.Lambda('X', q.Get(q.Var('X')))
      )
    );

    const onlineDevices = devices.data
      .map((d) => d.data)
      .filter((device) => now - device.timestamp <= threshold);

    return { statusCode: 200, body: JSON.stringify(onlineDevices) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
