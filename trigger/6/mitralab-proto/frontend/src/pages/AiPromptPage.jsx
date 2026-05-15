import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { api } from '../api.js';
import ChartWidget from '../components/ChartWidget.jsx';

export default function AiPromptPage() {
  const [connections, setConnections] = useState([]);
  const [prompt, setPrompt] = useState('Mostre vendas por mês em um gráfico de barras');
  const [connectionId, setConnectionId] = useState('');
  const [schemaHint, setSchemaHint] = useState('');
  const [result, setResult] = useState(null);
  const [saveName, setSaveName] = useState('Dashboard IA');
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/connections').then(setConnections).catch(() => {});
  }, []);

  async function run() {
    setErr('');
    setResult(null);
    try {
      const data = await api('/api/ai/dashboard-prompt', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          connectionId: connectionId === '' ? null : Number(connectionId),
          schemaHint: schemaHint || null,
        }),
      });
      setResult(data);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function saveDash() {
    setErr('');
    try {
      await api('/api/ai/save-dashboard-from-prompt', {
        method: 'POST',
        body: JSON.stringify({
          name: saveName,
          description: 'Gerado por prompt',
          prompt,
          connectionId: connectionId === '' ? null : Number(connectionId),
          schemaHint: schemaHint || null,
        }),
      });
      alert('Dashboard salvo. Abra a página Dashboards.');
    } catch (e) {
      setErr(e.message);
    }
  }

  const plan = result?.plan;
  const rows = result?.rows || [];
  const chartConfig = result?.chartConfig || {};

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        IA — dashboard por prompt
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        O backend usa o <strong>AI Engine</strong> (mock, OpenAI ou Ollama). O fluxo: interpretar o pedido → gerar SQL
        → executar → devolver dados + tipo de gráfico.
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            select
            label="Conexão para executar SQL (opcional)"
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            sx={{ maxWidth: 400 }}
          >
            <MenuItem value="">PostgreSQL (app)</MenuItem>
            {connections.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Schema hint (opcional, para o LLM)"
            value={schemaHint}
            onChange={(e) => setSchemaHint(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            placeholder="Tabelas e colunas do seu DW..."
          />
          <Button variant="contained" onClick={run} sx={{ alignSelf: 'flex-start' }}>
            Gerar e executar
          </Button>
        </Box>
      </Paper>
      {plan && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">Plano da IA</Typography>
          <Typography variant="body2" color="text.secondary">
            {plan.explanation}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            SQL: {plan.sql}
          </Typography>
          <Typography variant="caption" display="block">
            Gráfico: {plan.chartType} · x={plan.xKey} · y={plan.yKey}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <ChartWidget chartType={plan.chartType} rows={rows} chartConfig={chartConfig} />
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Nome ao salvar"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              size="small"
            />
            <Button variant="outlined" onClick={saveDash}>
              Salvar como dashboard
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
