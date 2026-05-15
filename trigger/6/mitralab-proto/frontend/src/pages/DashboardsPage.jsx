import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import { api } from '../api.js';
import ChartWidget from '../components/ChartWidget.jsx';

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState([]);
  const [sel, setSel] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  async function loadList() {
    try {
      const d = await api('/api/dashboards');
      setDashboards(d);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function loadData(id) {
    setErr('');
    try {
      setData(await api(`/api/dashboards/${id}/data`));
    } catch (e) {
      setErr(e.message);
      setData(null);
    }
  }

  useEffect(() => {
    if (sel) loadData(sel);
  }, [sel]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Dashboards salvos
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            label="Dashboard"
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            sx={{ minWidth: 280 }}
          >
            <MenuItem value="">Selecione…</MenuItem>
            {dashboards.map((d) => (
              <MenuItem key={d.id} value={String(d.id)}>
                {d.name} (#{d.id})
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            disabled={!sel}
            onClick={async () => {
              await api(`/api/dashboards/${sel}`, { method: 'DELETE' });
              setSel('');
              setData(null);
              loadList();
            }}
          >
            Excluir
          </Button>
        </Box>
      </Paper>
      {data?.widgets?.map((w) => (
        <Paper key={w.widgetId} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">{w.title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {w.chartType}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <ChartWidget chartType={w.chartType} rows={w.rows} chartConfig={w.chartConfig} />
        </Paper>
      ))}
    </Box>
  );
}
