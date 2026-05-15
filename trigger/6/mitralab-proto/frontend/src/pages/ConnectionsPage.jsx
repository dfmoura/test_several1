import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { api } from '../api.js';

const types = ['POSTGRESQL', 'ORACLE', 'SQLSERVER'];

export default function ConnectionsPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: 'POSTGRESQL',
    host: '',
    port: 5432,
    databaseName: '',
    username: '',
    passwordEnvKey: '',
    devPassword: '',
  });

  async function load() {
    setErr('');
    try {
      const data = await api('/api/connections');
      setRows(data);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      await api('/api/connections', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          port: Number(form.port),
        }),
      });
      setForm({
        name: '',
        type: 'POSTGRESQL',
        host: '',
        port: 5432,
        databaseName: '',
        username: '',
        passwordEnvKey: '',
        devPassword: '',
      });
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Conexões externas
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Preferência: defina <strong>passwordEnvKey</strong> com o nome da variável de ambiente (Docker / CI).
        Para dev local com <code>ALLOW_INLINE_DB_PASSWORD=true</code>, pode enviar <strong>devPassword</strong> uma
        vez (nunca é devolvido nas leituras).
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <Paper sx={{ p: 2, mb: 3 }}>
        <form onSubmit={submit}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <TextField
              select
              label="Tipo"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              sx={{ minWidth: 160 }}
            >
              {types.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Host"
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              required
            />
            <TextField
              label="Porta"
              type="number"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
              required
            />
            <TextField
              label="Database / service"
              value={form.databaseName}
              onChange={(e) => setForm({ ...form, databaseName: e.target.value })}
              required
            />
            <TextField
              label="Usuário"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
            <TextField
              label="passwordEnvKey"
              value={form.passwordEnvKey}
              onChange={(e) => setForm({ ...form, passwordEnvKey: e.target.value })}
              placeholder="ORACLE_APP_PASSWORD"
              sx={{ minWidth: 220 }}
            />
            <TextField
              label="devPassword (opcional)"
              type="password"
              value={form.devPassword}
              onChange={(e) => setForm({ ...form, devPassword: e.target.value })}
              sx={{ minWidth: 200 }}
            />
            <Box sx={{ alignSelf: 'flex-end' }}>
              <Button type="submit" variant="contained">
                Salvar
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Host</TableCell>
              <TableCell>DB</TableCell>
              <TableCell>Env key</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>
                  {r.host}:{r.port}
                </TableCell>
                <TableCell>{r.databaseName}</TableCell>
                <TableCell>{r.passwordEnvKey || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
