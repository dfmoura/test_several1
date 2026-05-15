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

export default function DataSourcesPage() {
  const [list, setList] = useState([]);
  const [connections, setConnections] = useState([]);
  const [err, setErr] = useState('');
  const [pg, setPg] = useState({ name: '', description: '', sql: 'SELECT * FROM demo_sales' });
  const [ext, setExt] = useState({
    name: '',
    description: '',
    connectionId: '',
    sql: 'SELECT 1 AS x',
  });

  async function load() {
    try {
      setList(await api('/api/data-sources'));
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    api('/api/connections').then(setConnections).catch(() => {});
  }, []);

  async function createPg(e) {
    e.preventDefault();
    setErr('');
    try {
      await api('/api/data-sources/postgres-query', {
        method: 'POST',
        body: JSON.stringify(pg),
      });
      setPg({ name: '', description: '', sql: 'SELECT * FROM demo_sales' });
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function createExt(e) {
    e.preventDefault();
    setErr('');
    try {
      await api('/api/data-sources/external-query', {
        method: 'POST',
        body: JSON.stringify({
          ...ext,
          connectionId: Number(ext.connectionId),
        }),
      });
      setExt({ name: '', description: '', connectionId: '', sql: 'SELECT 1 AS x' });
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Data sources lógicos
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Nova fonte: query no PostgreSQL da app
        </Typography>
        <form onSubmit={createPg}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
            <TextField
              label="Nome"
              value={pg.name}
              onChange={(e) => setPg({ ...pg, name: e.target.value })}
              required
            />
            <TextField
              label="Descrição"
              value={pg.description}
              onChange={(e) => setPg({ ...pg, description: e.target.value })}
            />
            <TextField
              label="SQL"
              value={pg.sql}
              onChange={(e) => setPg({ ...pg, sql: e.target.value })}
              sx={{ minWidth: 320 }}
              required
            />
            <Button type="submit" variant="contained">
              Criar
            </Button>
          </Box>
        </form>
      </Paper>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Nova fonte: query externa
        </Typography>
        <form onSubmit={createExt}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
            <TextField
              label="Nome"
              value={ext.name}
              onChange={(e) => setExt({ ...ext, name: e.target.value })}
              required
            />
            <TextField
              select
              label="Conexão"
              value={ext.connectionId}
              onChange={(e) => setExt({ ...ext, connectionId: e.target.value })}
              required
              sx={{ minWidth: 200 }}
            >
              {connections.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="SQL"
              value={ext.sql}
              onChange={(e) => setExt({ ...ext, sql: e.target.value })}
              sx={{ minWidth: 280 }}
              required
            />
            <Button type="submit" variant="contained">
              Criar
            </Button>
          </Box>
        </form>
      </Paper>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Modo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.id}</TableCell>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.mode}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
