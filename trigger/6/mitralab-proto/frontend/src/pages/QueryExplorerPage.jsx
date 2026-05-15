import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { api } from '../api.js';

export default function QueryExplorerPage() {
  const [connections, setConnections] = useState([]);
  const [connectionId, setConnectionId] = useState('');
  const [sql, setSql] = useState('SELECT * FROM demo_sales ORDER BY month_ord');
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/connections').then(setConnections).catch(() => {});
  }, []);

  async function run() {
    setErr('');
    try {
      const data = await api('/api/query/explore', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: connectionId === '' ? null : Number(connectionId),
          sql,
          maxRows: 500,
        }),
      });
      setRows(data);
      setCols(data.length ? Object.keys(data[0]) : []);
    } catch (e) {
      setErr(e.message);
      setRows([]);
      setCols([]);
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Query explorer
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Apenas <code>SELECT</code> ou <code>WITH</code>. Sem conexão, usa o PostgreSQL da aplicação.
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select
            label="Conexão (opcional)"
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            sx={{ maxWidth: 400 }}
          >
            <MenuItem value="">PostgreSQL (app)</MenuItem>
            {connections.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name} ({c.type})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="SQL"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            multiline
            minRows={4}
            fullWidth
            sx={{ fontFamily: 'monospace' }}
          />
          <Button variant="contained" onClick={run} sx={{ alignSelf: 'flex-start' }}>
            Executar
          </Button>
        </Box>
      </Paper>
      {rows.length > 0 && (
        <Paper sx={{ overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {cols.map((c) => (
                  <TableCell key={c}>{c}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {cols.map((c) => (
                    <TableCell key={c}>{String(r[c] ?? '')}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
