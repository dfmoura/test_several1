/* global XLSX */

const els = {
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  chooseFilesBtn: document.getElementById('chooseFilesBtn'),

  pasteBox: document.getElementById('pasteBox'),
  usePasteBtn: document.getElementById('usePasteBtn'),
  clearPasteBtn: document.getElementById('clearPasteBtn'),

  inputsTableBody: document.querySelector('#inputsTable tbody'),
  parseBtn: document.getElementById('parseBtn'),

  includeBalance: document.getElementById('includeBalance'),
  includeIncome: document.getElementById('includeIncome'),
  maxRows: document.getElementById('maxRows'),

  openaiKey: document.getElementById('openaiKey'),
  model: document.getElementById('model'),
  promptExtra: document.getElementById('promptExtra'),
  generateBtn: document.getElementById('generateBtn'),
  statusBox: document.getElementById('statusBox'),

  reportCard: document.getElementById('reportCard'),
  reportContainer: document.getElementById('reportContainer'),
  downloadBtn: document.getElementById('downloadBtn'),
  printBtn: document.getElementById('printBtn'),
};

function setStatus(msg, type = 'info') {
  const prefix =
    type === 'success' ? '[OK] ' : type === 'error' ? '[ERRO] ' : type === 'warn' ? '[AVISO] ' : '[INFO] ';
  els.statusBox.textContent = prefix + msg;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function clampText(s, maxChars) {
  const str = String(s ?? '');
  if (str.length <= maxChars) return str;
  return str.slice(0, maxChars) + '...';
}

function guessTypeFromNameAndText(filename, text) {
  const t = `${filename || ''} ${text || ''}`.toLowerCase();
  const balanceHints = ['balanco', 'patrimonial', 'patrimonio', 'ativo', 'passivo', 'pl', 'passivos'];
  const incomeHints = ['resultado', 'demonstra', 'dre', 'receita', 'lucro', 'despesa', 'custo', 'ebitda', 'margem'];

  let b = 0;
  let i = 0;
  for (const h of balanceHints) if (t.includes(h)) b += 1;
  for (const h of incomeHints) if (t.includes(h)) i += 1;

  if (b === 0 && i === 0) return 'unknown';
  return i > b ? 'income' : 'balance';
}

function detectDelimiter(line) {
  const candidates = [';', ',', '\t', '|'];
  let best = ';';
  let bestCount = -1;
  for (const c of candidates) {
    const count = line.split(c).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  // se nao tiver delimitador claro, retorna ';' por padrao
  return bestCount <= 0 ? ';' : best;
}

function parseDelimitedText(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return [];

  // tenta pegar primeira linha "cabecalho"
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const delim = detectDelimiter(lines[0]);
  const header = lines[0].split(delim).map((x) => x.trim());
  const rows = [];
  for (let idx = 1; idx < lines.length; idx++) {
    const parts = lines[idx].split(delim).map((x) => x.trim());
    if (parts.length === 0) continue;
    const obj = {};
    for (let j = 0; j < header.length; j++) obj[header[j] || `col_${j + 1}`] = parts[j] ?? '';
    rows.push(obj);
    if (rows.length >= 80) break; // limite para nao explodir contexto
  }
  return rows;
}

function parseKeyValueText(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return {};
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = {};
  let pairs = 0;
  for (const line of lines) {
    const sep = line.includes(':') ? ':' : line.includes('=') ? '=' : null;
    if (!sep) continue;
    const [k, ...rest] = line.split(sep);
    const key = (k ?? '').trim();
    const val = rest.join(sep).trim();
    if (!key) continue;
    out[key] = val;
    pairs += 1;
    if (pairs >= 80) break;
  }
  return pairs ? out : {};
}

function summariseExtracted(data) {
  // data pode ser array de objetos ou objeto simples
  if (Array.isArray(data)) {
    if (data.length === 0) return 'Sem linhas';
    const keys = Object.keys(data[0] || {});
    return `${data.length} linhas | colunas: ${keys.slice(0, 6).join(', ')}${keys.length > 6 ? '...' : ''}`;
  }
  if (data && typeof data === 'object') {
    const keys = Object.keys(data);
    return `Chaves: ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? '...' : ''}`;
  }
  return 'Conteudo textual';
}

function pillForType(type) {
  if (type === 'balance') return `<span class="pill pill--balance">Balanco Patrimonial</span>`;
  if (type === 'income') return `<span class="pill pill--income">Demonstracao de Resultado (DRE)</span>`;
  return `<span class="pill pill--unknown">Desconhecido</span>`;
}

function makeInputRow(item) {
  const select = `
    <select class="typeSelect input" data-id="${item.id}">
      <option value="balance" ${item.type === 'balance' ? 'selected' : ''}>Balanco Patrimonial</option>
      <option value="income" ${item.type === 'income' ? 'selected' : ''}>Demonstracao de Resultado (DRE)</option>
      <option value="unknown" ${item.type === 'unknown' ? 'selected' : ''}>Desconhecido</option>
    </select>
  `;

  const summary = escapeHtml(summariseExtracted(item.data));
  return `
    <tr>
      <td>
        <div style="font-weight:900;">${escapeHtml(item.displayName)}</div>
        <div class="muted small">${escapeHtml(item.sourceLabel)}</div>
      </td>
      <td>${select}</td>
      <td>${summary}</td>
      <td>
        <button class="iconBtn" type="button" data-action="remove" data-id="${item.id}">Remover</button>
      </td>
    </tr>
  `;
}

function uuid() {
  return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);
}

const inputs = []; // {id, source:'file'|'paste', file, text, data, type, displayName, sourceLabel}
let cachedLogoDataUrl = null;
let cachedIndicatorsGuide = null;

async function loadLogoAsDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  const res = await fetch('./logo.png');
  const blob = await res.blob();
  cachedLogoDataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
  return cachedLogoDataUrl;
}

async function loadIndicatorsGuide() {
  if (cachedIndicatorsGuide) return cachedIndicatorsGuide;
  try {
    const res = await fetch('./teste.txt');
    if (!res.ok) {
      cachedIndicatorsGuide = '';
      return cachedIndicatorsGuide;
    }
    const text = await res.text();
    cachedIndicatorsGuide = String(text || '').trim();
    return cachedIndicatorsGuide;
  } catch {
    cachedIndicatorsGuide = '';
    return cachedIndicatorsGuide;
  }
}

function setGenerateEnabled(ok) {
  els.generateBtn.disabled = !ok;
}

async function extractFromFile(file) {
  const name = file.name || 'arquivo';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';

  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return { ext, data: json, text: '' };
  }

  if (ext === 'json') {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { ext, data: null, text };
    }
    // aceita formas comuns: array, {rows:[...]} , {data:[...]}
    const data = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.rows)
        ? parsed.rows
        : Array.isArray(parsed?.data)
          ? parsed.data
          : parsed;
    return { ext, data, text };
  }

  // txt ou outro: texto "livre" e tentativas de parse
  const text = await file.text();
  const maybeRows = parseDelimitedText(text);
  const maybeKV = parseKeyValueText(text);
  if (maybeRows.length) return { ext, data: maybeRows, text };
  if (Object.keys(maybeKV).length) return { ext, data: maybeKV, text };
  return { ext, data: null, text };
}

function addInputSync({ source, displayName, sourceLabel, type, data, text, file }) {
  const id = uuid();
  inputs.push({
    id,
    source,
    file,
    displayName,
    sourceLabel,
    type,
    data,
    text,
  });
}

async function addFiles(files) {
  if (!files || files.length === 0) return;
  setStatus(`Lendo ${files.length} arquivo(s)...`, 'info');

  for (const file of files) {
    try {
      const extracted = await extractFromFile(file);
      const guessText = extracted.text || (Array.isArray(extracted.data) ? JSON.stringify(extracted.data.slice(0, 3)) : '');
      const guessType = guessTypeFromNameAndText(file.name, guessText);
      addInputSync({
        source: 'file',
        file,
        displayName: file.name,
        sourceLabel: extracted.ext ? `Ext: .${extracted.ext}` : 'Arquivo',
        type: guessType,
        data: extracted.data,
        text: extracted.text,
      });
    } catch (err) {
      addInputSync({
        source: 'file',
        file,
        displayName: file.name,
        sourceLabel: 'Falha ao processar',
        type: 'unknown',
        data: null,
        text: '',
      });
      console.error('extractFromFile error', err);
    }
  }

  renderInputs();
  setGenerateEnabled(false);
  setStatus('Arquivos adicionados. Ajuste o tipo se necessario e gere o relatorio.', 'success');
}

function addPasteContent() {
  const text = els.pasteBox.value.trim();
  if (!text) {
    setStatus('Cole algum conteudo antes de adicionar.', 'warn');
    return;
  }
  const guessType = guessTypeFromNameAndText('paste', text);
  const rows = parseDelimitedText(text);
  const kv = Object.keys(parseKeyValueText(text)).length ? parseKeyValueText(text) : {};
  const data = rows.length ? rows : Object.keys(kv).length ? kv : null;
  addInputSync({
    source: 'paste',
    displayName: 'Conteudo colado',
    sourceLabel: 'Ctrl+V / textarea',
    type: guessType,
    data,
    text,
  });
  els.pasteBox.value = '';
  renderInputs();
  setGenerateEnabled(false);
  setStatus('Conteudo colado adicionado.', 'success');
}

function renderInputs() {
  if (!inputs.length) {
    els.inputsTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="muted small" style="padding: 14px;">
          Nenhum arquivo ou conteudo colado adicionado ainda.
        </td>
      </tr>
    `;
    return;
  }
  els.inputsTableBody.innerHTML = inputs.map(makeInputRow).join('');

  // listeners locais para seletor e remover
  els.inputsTableBody.querySelectorAll('.typeSelect').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-id');
      const item = inputs.find((x) => x.id === id);
      if (item) item.type = e.target.value;
      setGenerateEnabled(false);
    });
  });
  els.inputsTableBody.querySelectorAll('button[data-action="remove"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const idx = inputs.findIndex((x) => x.id === id);
      if (idx >= 0) inputs.splice(idx, 1);
      renderInputs();
      setGenerateEnabled(inputs.length > 0);
    });
  });
}

function buildDataSample(obj) {
  if (!obj) return '';
  if (Array.isArray(obj)) {
    const slice = obj.slice(0, 25);
    return JSON.stringify(slice, null, 2);
  }
  if (typeof obj === 'object') return JSON.stringify(obj, null, 2);
  return String(obj);
}

function buildContextForAI() {
  const maxRows = Math.max(1, Number(els.maxRows.value || 25));
  const includeBalance = els.includeBalance.checked;
  const includeIncome = els.includeIncome.checked;

  const chosen = inputs.filter((it) => {
    if (it.type === 'balance') return includeBalance;
    if (it.type === 'income') return includeIncome;
    return false;
  });

  const chunks = [];
  for (const it of chosen) {
    let sample = '';
    if (Array.isArray(it.data)) {
      sample = JSON.stringify(it.data.slice(0, maxRows), null, 2);
    } else if (it.data && typeof it.data === 'object') {
      // para objetos, mantem tudo (limita por chars no final)
      sample = JSON.stringify(it.data, null, 2);
    } else if (it.text) {
      sample = it.text;
    } else {
      sample = '';
    }
    chunks.push(
      `Fonte: ${it.displayName}\n` +
        `Tipo: ${it.type}\n` +
        `Amostra:\n${clampText(sample, 12000)}\n` +
        `---`
    );
  }

  if (!chunks.length) {
    return { context: '', chosenCount: 0 };
  }

  const context =
    `Voce vai receber dados (tabelas ou JSON/texto) sobre: \n` +
    `- Balanco Patrimonial (se houver)\n` +
    `- Demonstracao de Resultado / DRE (se houver)\n\n` +
    `Dados:\n${chunks.join('\n\n')}`;

  return { context, chosenCount: chosen.length };
}

async function callOpenAIForReport(context) {
  const token = els.openaiKey.value.trim();

  const extra = (els.promptExtra.value || '').trim();
  const model = els.model.value || 'gpt-4o-mini';
  const indicatorsGuide = await loadIndicatorsGuide();

  // IMPORTANTE: retornaremos HTML para colocar no relatorio.
  const system = [
    'Voce e um analista financeiro experiente e um redator de relatorios executivos.',
    'Voce deve interpretar os dados fornecidos pelo usuario.',
    'Quando algum dado estiver ausente, informe explicitamente e evite inventar valores.',
    'Gere o relatorio em HTML (somente o conteudo do body), com secoes e topicos.',
    'Use tags: h2, h3, p, ul, li, table, strong, em e hr.',
    'Inclua uma secao final chamada "Avisos e Limites".',
    'Se for possivel, apresente indicadores (ex.: liquidez, endividamento, margens) apenas se houver dados que permitam calcular.',
    'Se nao for possivel calcular indicadores, sugira quais colunas/contas seriam necessarias.',
    'Priorize os indicadores recebidos no guia (teste.txt), incluindo sigla, formula e interpretacao.'
  ].join('\n');

  const baseAliases = [
    'AC = Ativo Circulante',
    'PC = Passivo Circulante',
    'RLP = Realizavel a Longo Prazo',
    'PNC = Passivo Nao Circulante',
    'ANC = Ativo Nao Circulante',
    'PL = Patrimonio Liquido',
    'DISPONIBILIDADES = Caixa/Equivalentes',
    'RECEITA LIQUIDA = Receita operacional liquida',
    'LUCRO LIQUIDO = Lucro do periodo'
  ].join('\n');

  const userPrompt =
    `Gere um relatorio financeiro com base no contexto abaixo.\n\n` +
    `Requisitos:\n` +
    `1) Sempre produza: "Resumo executivo" e "Principais observacoes".\n` +
    `2) Se houver Balanco Patrimonial: faca uma analise por classes (Ativo/Passivo/PL) e comente estrutura de capital e riscos.\n` +
    `3) Se houver DRE: analise receitas, custos/despesas, margens e resultado.\n` +
    `4) Crie uma secao "Conclusoes e recomendacoes".\n` +
    `5) Considere a possibilidade de o dado estar em formatos variados (CSV/planilha/JSON/texto).\n` +
    `6) Separe claramente as secoes do que e Balanco vs DRE.\n\n` +
    `7) Crie uma secao obrigatoria: "Indicadores Prioritarios (base teste.txt)".\n` +
    `8) Nessa secao, priorize os indicadores do guia e tente calcular usando siglas/aliases (AC, PC etc.).\n` +
    `9) Para cada indicador, mostre: formula, valores usados (se encontrados), resultado e interpretacao.\n` +
    `10) Quando faltar dado, liste exatamente qual conta/coluna faltou para o calculo.\n\n` +
    `Aliases base de contas/siglas:\n${baseAliases}\n\n` +
    `Guia de indicadores (arquivo teste.txt):\n${indicatorsGuide || '(guia indisponivel)'}\n\n` +
    `Instrucoes adicionais do usuario:\n${extra ? extra : '(nenhuma)'}\n\n` +
    `Contexto:\n${context}`;

  setStatus('Chamando ChatGPT para gerar a interpretacao...', 'info');

  // Usa backend local para evitar erros de CORS/rede no browser.
  // Se token for informado aqui, ele sera enviado para o backend.
  const response = await fetch('/api/openai-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      model,
      system,
      userPrompt,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Falha no backend/OpenAI. HTTP ${response.status}. ${text ? 'Detalhes: ' + text : ''}`);
  }

  const data = await response.json();
  const content = data?.content;
  if (!content) throw new Error('Resposta vazia do modelo.');
  return content;
}

function buildFinalReportHtml(bodyHtml, logoDataUrl) {
  // Um HTML autocontido o suficiente para download/print.
  // Observacao: se o usuario baixar e abrir fora da pasta, o logo fica embutido via data URL.
  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Relatorio - Balanco e DRE</title>
    <style>
      :root{ --text:#111827; --muted:#6b7280; --border:#e5e7eb; }
      body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:var(--text); }
      .page{ padding: 26px 18px 40px; max-width: 980px; margin: 0 auto; }
      .head{ display:flex; gap:14px; align-items:flex-start; border:1px solid var(--border); border-radius:16px; padding:14px 14px; margin-bottom: 16px; }
      .logo{ width:68px; height:68px; object-fit: contain; border:1px solid var(--border); border-radius:14px; background:#fff; }
      .h{ font-weight: 900; font-size: 18px; }
      .sub{ color: var(--muted); font-size: 13px; margin-top: 4px; }
      hr{ border:none; border-top: 1px solid var(--border); margin: 18px 0; }
      table{ width:100%; border-collapse: collapse; }
      th,td{ border:1px solid var(--border); padding: 8px 10px; text-align:left; font-size: 13px; }
      th{ background:#f8fafc; }
      ul{ padding-left: 20px; }
      code{ background:#f3f4f6; padding:2px 6px; border-radius: 8px; }
      .meta{ margin-top: 8px; color: var(--muted); font-size: 12.5px; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="head">
        <img class="logo" src="${logoDataUrl}" alt="Logo" />
        <div>
          <div class="h">Relatorio Financeiro</div>
          <div class="sub">Balanco Patrimonial e Demonstracao de Resultado (DRE) - gerado a partir dos arquivos do usuario</div>
          <div class="meta">Data: ${escapeHtml(new Date().toLocaleString('pt-BR'))}</div>
        </div>
      </div>
      <div class="content">
        ${bodyHtml}
      </div>
    </div>
  </body>
</html>
    `.trim();
}

function enableReportButtons() {
  els.downloadBtn.disabled = false;
  els.printBtn.disabled = false;
}

function sanitizePdfFilename(name) {
  return String(name || 'relatorio_financeiro')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function exportReportToPdf() {
  if (typeof window.html2pdf === 'undefined') {
    setStatus('Biblioteca de PDF indisponivel. Tente recarregar a pagina.', 'error');
    return;
  }

  const source = els.reportContainer;
  if (!source || !source.innerHTML.trim()) {
    setStatus('Nao ha relatorio para exportar.', 'warn');
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'pdf-page';
  wrap.style.padding = '18mm 14mm 16mm';
  wrap.style.background = '#fff';
  wrap.style.color = '#111827';
  wrap.style.maxWidth = '190mm';
  wrap.style.margin = '0 auto';
  wrap.innerHTML = source.innerHTML;

  const now = new Date();
  const filename = sanitizePdfFilename(
    `relatorio_financeiro_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );

  setStatus('Gerando PDF...', 'info');

  const opt = {
    margin: [0, 0, 0, 0],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  try {
    await window.html2pdf().set(opt).from(wrap).save();
    setStatus('PDF gerado com sucesso.', 'success');
  } catch (err) {
    console.error(err);
    setStatus('Falha ao gerar PDF. Tente novamente.', 'error');
  }
}

// ============================================================
// MOTOR DE INDICADORES FINANCEIROS (calculo local, sem OpenAI)
// ============================================================

function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumericValue(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  let s = String(v).trim();
  const neg = s.startsWith('(') && s.endsWith(')');
  if (neg) s = s.slice(1, -1);
  s = s.replace(/[R$\s]/g, '');
  if (/\.\d{3},/.test(s) || (s.includes(',') && !s.includes('.'))) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/,\d{3}\./.test(s) || (s.includes('.') && !s.includes(','))) {
    s = s.replace(/,/g, '');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

// Sinonimos: sigla -> frases para buscar nas contas do arquivo
const ACCOUNT_MAP = {
  AC:              ['ativo circulante','total ativo circulante','total do ativo circulante','ativo corrente','circulante ativo'],
  PC:              ['passivo circulante','total passivo circulante','total do passivo circulante','passivo corrente','circulante passivo'],
  PNC:             ['passivo nao circulante','passivo nao corrente','exigivel longo prazo','exigivel a longo prazo','passivo longo prazo','nao circulante passivo'],
  ANC:             ['ativo nao circulante','ativo nao corrente','ativo permanente','nao circulante ativo'],
  PL:              ['patrimonio liquido','total patrimonio liquido','patrimonio liquido total','capital proprio','pl total','total do patrimonio liquido'],
  RLP:             ['realizavel longo prazo','realizavel a longo prazo','ativo realizavel longo prazo','realizavel a longo prazo ativo'],
  DISPONIBILIDADES:['disponibilidades','caixa e equivalentes de caixa','caixa equivalentes','caixa e bancos','caixa bancos','caixa e equivalentes','disponivel','caixa'],
  ESTOQUE:         ['estoque','estoques','mercadorias','produtos acabados','materias primas','almoxarifado'],
  RECEITA_LIQUIDA: ['receita liquida','receita operacional liquida','receita liquida vendas','receita liquida de vendas','receita liquida de servicos'],
  RECEITA_BRUTA:   ['receita bruta','faturamento bruto','receita total','receita bruta de vendas','faturamento','receita de vendas'],
  LUCRO_BRUTO:     ['lucro bruto','resultado bruto','lucro bruto de vendas'],
  LUCRO_LIQUIDO:   ['lucro liquido','resultado liquido','lucro do exercicio','lucro do periodo','resultado do exercicio','resultado do periodo','lucro liquido do exercicio'],
  LUCRO_OPERACIONAL:['lucro operacional','resultado operacional','ebit','lucro antes juros impostos','lajir','resultado antes financeiro'],
  DEPRECIACAO:     ['depreciacao','depreciacao e amortizacao','depreciacao amortizacao','depreciacao exaustao e amortizacao'],
  AMORTIZACAO:     ['amortizacao'],
  ATIVO_TOTAL:     ['ativo total','total ativo','total do ativo','total dos ativos','total ativos'],
  EMPRESTIMOS:     ['emprestimos e financiamentos','emprestimos','financiamentos','dividas financeiras','divida financeira','emprestimos financiamentos'],
  CSP:             ['csp','custo servicos prestados','custo dos servicos prestados','cpv','custo produtos vendidos','custo das mercadorias vendidas','cmv','cmo','custo das vendas'],
};

function findAccountInRows(rows, sigla) {
  const aliases = ACCOUNT_MAP[sigla] || [];
  if (!aliases.length || !Array.isArray(rows) || !rows.length) return null;

  for (const row of rows) {
    const keys = Object.keys(row);

    // Identifica coluna "nome/conta" pelo header
    const nameCol = keys.find((k) => {
      const kn = normalizeText(k);
      return ['conta','descri','nome','historico','rubrica','item','descricao'].some((h) => kn.includes(h));
    });
    // Fallback: primeira coluna cujo valor parece texto (nao numero)
    const firstStrCol = keys.find((k) => {
      const val = row[k];
      return typeof val === 'string' && parseNumericValue(val) === null && val.trim().length > 0;
    });

    const candidateCol = nameCol || firstStrCol || keys[0];
    if (!candidateCol) continue;

    const cellText = normalizeText(String(row[candidateCol] ?? ''));
    if (!cellText) continue;

    for (const alias of aliases) {
      const aliasN = normalizeText(alias);
      if (cellText === aliasN || cellText.startsWith(aliasN) || cellText.includes(aliasN)) {
        // Encontrou o nome; busca coluna de valor
        const valueCol = keys.find((k) => {
          if (k === candidateCol) return false;
          const kn = normalizeText(k);
          return ['valor','saldo','total','montante','2020','2021','2022','2023','2024','2025','exercicio','periodo'].some((h) => kn.includes(h));
        });
        const firstNumCol = keys.find((k) => k !== candidateCol && parseNumericValue(row[k]) !== null);
        const col = valueCol || firstNumCol;
        if (!col) continue;
        const val = parseNumericValue(row[col]);
        if (val !== null) return val;
      }
    }
  }
  return null;
}

function findAccountInKV(kv, sigla) {
  const aliases = ACCOUNT_MAP[sigla] || [];
  if (!aliases.length || !kv || typeof kv !== 'object') return null;
  for (const [k, v] of Object.entries(kv)) {
    const kn = normalizeText(k);
    for (const alias of [sigla, ...aliases]) {
      if (kn === normalizeText(alias) || kn.includes(normalizeText(alias))) {
        const val = parseNumericValue(v);
        if (val !== null) return val;
      }
    }
  }
  return null;
}

function extractAccountValues() {
  const result = {};
  const allRows = [];
  const allKV = {};

  for (const it of inputs) {
    if (Array.isArray(it.data)) allRows.push(...it.data);
    else if (it.data && typeof it.data === 'object') Object.assign(allKV, it.data);
    if (it.text) {
      const rows = parseDelimitedText(it.text);
      if (rows.length) allRows.push(...rows);
      const kv = parseKeyValueText(it.text);
      if (Object.keys(kv).length) Object.assign(allKV, kv);
    }
  }

  for (const sigla of Object.keys(ACCOUNT_MAP)) {
    let val = findAccountInRows(allRows, sigla);
    if (val === null) val = findAccountInKV(allKV, sigla);
    if (val !== null) result[sigla] = val;
  }

  // Estrategia extra: cabecalhos das colunas sao os proprios nomes/siglas das contas
  if (allRows.length) {
    const headers = Object.keys(allRows[0] || {});
    for (const sigla of Object.keys(ACCOUNT_MAP)) {
      if (result[sigla] !== undefined) continue;
      const aliases = [sigla, ...ACCOUNT_MAP[sigla]];
      for (const h of headers) {
        const hn = normalizeText(h);
        if (aliases.some((a) => hn === normalizeText(a))) {
          for (const row of allRows) {
            const val = parseNumericValue(row[h]);
            if (val !== null) { result[sigla] = val; break; }
          }
          if (result[sigla] !== undefined) break;
        }
      }
    }
  }

  return result;
}

// Definicao dos 22 indicadores (formulas, categorias, interpretacoes)
const INDICATORS = {
  // LIQUIDEZ
  LC: {
    nome: 'Liquidez Corrente', categoria: 'Liquidez', formula: 'AC / PC', vars: ['AC','PC'],
    compute: (v) => (v.PC && v.PC !== 0 && v.AC !== undefined) ? v.AC / v.PC : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 2 ? 'Excelente — alta capacidade de pagamento no curto prazo.' : r >= 1.5 ? 'Bom — boa folga para honrar compromissos correntes.' : r >= 1 ? 'Aceitavel — cobre o PC, mas com pouca margem.' : 'Critico — PC supera o AC; risco de insolvencia no curto prazo.',
  },
  LS: {
    nome: 'Liquidez Seca', categoria: 'Liquidez', formula: '(AC - ESTOQUE) / PC', vars: ['AC','ESTOQUE','PC'],
    compute: (v) => (v.PC && v.PC !== 0 && v.AC !== undefined) ? (v.AC - (v.ESTOQUE || 0)) / v.PC : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 1 ? 'Bom — cobre o PC sem precisar vender estoques.' : r >= 0.7 ? 'Aceitavel — cobre boa parte do PC sem estoques.' : 'Atencao — depende da venda de estoques para cumprir obrigacoes correntes.',
  },
  LG: {
    nome: 'Liquidez Geral', categoria: 'Liquidez', formula: '(AC + RLP) / (PC + PNC)', vars: ['AC','RLP','PC','PNC'],
    compute: (v) => { const d = (v.PC||0)+(v.PNC||0); return d ? ((v.AC||0)+(v.RLP||0))/d : null; },
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 1 ? 'Positivo — ativos de curto e longo prazo cobrem todas as dividas.' : 'Atencao — dividas totais superam os ativos disponiveis.',
  },
  LI: {
    nome: 'Liquidez Imediata', categoria: 'Liquidez', formula: 'DISPONIBILIDADES / PC', vars: ['DISPONIBILIDADES','PC'],
    compute: (v) => (v.PC && v.PC !== 0 && v.DISPONIBILIDADES !== undefined) ? v.DISPONIBILIDADES / v.PC : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 0.5 ? 'Bom — alto volume de caixa em relacao ao PC.' : r >= 0.2 ? 'Razoavel — disponibilidades cobrem parte relevante do PC.' : 'Baixo — disponibilidades muito reduzidas frente ao PC.',
  },
  // ESTRUTURA DE CAPITAL
  EG: {
    nome: 'Endividamento Geral', categoria: 'Estrutura de Capital', formula: '((PC + PNC) / ATIVO_TOTAL) x 100', vars: ['PC','PNC','ATIVO_TOTAL'],
    compute: (v) => { const at = v.ATIVO_TOTAL||((v.AC||0)+(v.ANC||0)); return at ? (((v.PC||0)+(v.PNC||0))/at)*100 : null; },
    interpretar: (r) => r === null ? 'Indisponivel' : r <= 40 ? 'Baixo — empresa financiada predominantemente por capital proprio.' : r <= 60 ? 'Moderado — equilibrio razoavel entre divida e capital proprio.' : r <= 80 ? 'Alto — elevada dependencia de capital de terceiros.' : 'Critico — divida supera 80% dos ativos; alto risco financeiro.',
  },
  PCT: {
    nome: 'Participacao de Capital de Terceiros', categoria: 'Estrutura de Capital', formula: '((PC + PNC) / PL) x 100', vars: ['PC','PNC','PL'],
    compute: (v) => (v.PL && v.PL !== 0) ? (((v.PC||0)+(v.PNC||0))/v.PL)*100 : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r <= 100 ? 'Saudavel — capital proprio supera ou iguala capital de terceiros.' : r <= 200 ? 'Atencao — capital de terceiros supera o PL.' : 'Critico — empresa altamente alavancada.',
  },
  CE: {
    nome: 'Composicao do Endividamento', categoria: 'Estrutura de Capital', formula: '(PC / (PC + PNC)) x 100', vars: ['PC','PNC'],
    compute: (v) => { const t = (v.PC||0)+(v.PNC||0); return t ? ((v.PC||0)/t)*100 : null; },
    interpretar: (r) => r === null ? 'Indisponivel' : r <= 30 ? 'Bom — dividas concentradas no longo prazo.' : r <= 60 ? 'Moderado — equilibrio entre curto e longo prazo.' : 'Atencao — dividas concentradas no curto prazo; pressao imediata de caixa.',
  },
  IPL: {
    nome: 'Imobilizacao do Patrimonio Liquido', categoria: 'Estrutura de Capital', formula: '((ANC - RLP) / PL) x 100', vars: ['ANC','RLP','PL'],
    compute: (v) => (v.PL && v.PL !== 0) ? (((v.ANC||0)-(v.RLP||0))/v.PL)*100 : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r <= 50 ? 'Bom — mais da metade do PL disponivel como capital de giro.' : r <= 100 ? 'Moderado — maior parte do PL imobilizada.' : 'Critico — PL insuficiente para financiar ativos fixos.',
  },
  IRNC: {
    nome: 'Imobilizacao do Recurso Nao Corrente', categoria: 'Estrutura de Capital', formula: '((ANC - RLP) / (PNC + PL)) x 100', vars: ['ANC','RLP','PNC','PL'],
    compute: (v) => { const d = (v.PNC||0)+(v.PL||0); return d ? (((v.ANC||0)-(v.RLP||0))/d)*100 : null; },
    interpretar: (r) => r === null ? 'Indisponivel' : r <= 100 ? 'Adequado — recursos nao correntes suficientes para financiar ativos fixos.' : 'Atencao — parte dos ativos fixos financiada por recursos de curto prazo.',
  },
  DL: {
    nome: 'Divida Liquida', categoria: 'Estrutura de Capital', formula: '(PC + PNC) - DISPONIBILIDADES', vars: ['PC','PNC','DISPONIBILIDADES'],
    compute: (v) => ((v.PC||0)+(v.PNC||0))-(v.DISPONIBILIDADES||0),
    interpretar: (r) => r === null ? 'Indisponivel' : r < 0 ? 'Caixa liquido positivo — disponibilidades superam a divida total.' : 'Divida liquida positiva — monitorar geracao de caixa para amortizacao.',
  },
  DB: {
    nome: 'Divida Bruta', categoria: 'Estrutura de Capital', formula: 'PC + PNC', vars: ['PC','PNC'],
    compute: (v) => (v.PC !== undefined || v.PNC !== undefined) ? (v.PC||0)+(v.PNC||0) : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r === 0 ? 'Empresa sem dividas financeiras registradas.' : 'Divida bruta total registrada.',
  },
  EO: {
    nome: 'Endividamento Oneroso', categoria: 'Estrutura de Capital', formula: 'EMPRESTIMOS / ATIVO_TOTAL', vars: ['EMPRESTIMOS','ATIVO_TOTAL'],
    compute: (v) => { const at = v.ATIVO_TOTAL||((v.AC||0)+(v.ANC||0)); return (at && v.EMPRESTIMOS !== undefined) ? v.EMPRESTIMOS/at : null; },
    interpretar: (r) => r === null ? 'Indisponivel' : r <= 0.2 ? 'Baixo — divida financeira controlada.' : r <= 0.4 ? 'Moderado.' : 'Alto — parcela significativa dos ativos financiada por divida onerosa.',
  },
  SG: {
    nome: 'Solvencia Geral', categoria: 'Estrutura de Capital', formula: 'ATIVO_TOTAL / (PC + PNC)', vars: ['ATIVO_TOTAL','PC','PNC'],
    compute: (v) => { const d = (v.PC||0)+(v.PNC||0); const at = v.ATIVO_TOTAL||((v.AC||0)+(v.ANC||0)); return (d && at) ? at/d : null; },
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 2 ? 'Excelente solvencia — ativos cobrem dobro das dividas.' : r >= 1 ? 'Solvente — ativos cobrem as dividas totais.' : 'Insolvente — dividas superam o total de ativos.',
  },
  // RENTABILIDADE
  MB: {
    nome: 'Margem Bruta', categoria: 'Rentabilidade', formula: '(LUCRO_BRUTO / RECEITA_LIQUIDA) x 100', vars: ['LUCRO_BRUTO','RECEITA_LIQUIDA'],
    compute: (v) => (v.RECEITA_LIQUIDA && v.LUCRO_BRUTO !== undefined) ? (v.LUCRO_BRUTO/v.RECEITA_LIQUIDA)*100 : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 40 ? 'Alta — boa eficiencia na producao/prestacao de servicos.' : r >= 20 ? 'Razoavel.' : 'Baixa — custo de produtos/servicos consome grande parte da receita.',
  },
  ML: {
    nome: 'Margem Liquida', categoria: 'Rentabilidade', formula: '(LUCRO_LIQUIDO / RECEITA_LIQUIDA) x 100', vars: ['LUCRO_LIQUIDO','RECEITA_LIQUIDA'],
    compute: (v) => (v.RECEITA_LIQUIDA && v.LUCRO_LIQUIDO !== undefined) ? (v.LUCRO_LIQUIDO/v.RECEITA_LIQUIDA)*100 : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 15 ? 'Excelente lucratividade.' : r >= 5 ? 'Aceitavel.' : r >= 0 ? 'Baixa — empresa pouco rentavel.' : 'Negativa — empresa operando com prejuizo liquido.',
  },
  MO: {
    nome: 'Margem Operacional', categoria: 'Rentabilidade', formula: '(LUCRO_OPERACIONAL / RECEITA_LIQUIDA) x 100', vars: ['LUCRO_OPERACIONAL','RECEITA_LIQUIDA'],
    compute: (v) => (v.RECEITA_LIQUIDA && v.LUCRO_OPERACIONAL !== undefined) ? (v.LUCRO_OPERACIONAL/v.RECEITA_LIQUIDA)*100 : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 15 ? 'Alta eficiencia operacional.' : r >= 5 ? 'Razoavel.' : r >= 0 ? 'Baixa — despesas operacionais pesadas.' : 'Negativa — operacao deficitaria.',
  },
  EBT: {
    nome: 'EBITDA', categoria: 'Rentabilidade', formula: 'LUCRO_OPERACIONAL + DEPRECIACAO + AMORTIZACAO', vars: ['LUCRO_OPERACIONAL','DEPRECIACAO','AMORTIZACAO'],
    compute: (v) => v.LUCRO_OPERACIONAL !== undefined ? v.LUCRO_OPERACIONAL+(v.DEPRECIACAO||0)+(v.AMORTIZACAO||0) : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r > 0 ? 'EBITDA positivo — geracao operacional de caixa antes de impostos e amortizacoes.' : 'EBITDA negativo — operacao nao gera caixa suficiente.',
  },
  MEBT: {
    nome: 'Margem EBITDA', categoria: 'Rentabilidade', formula: '(EBITDA / RECEITA_BRUTA) x 100', vars: ['LUCRO_OPERACIONAL','DEPRECIACAO','AMORTIZACAO','RECEITA_BRUTA'],
    compute: (v) => { const e = v.LUCRO_OPERACIONAL !== undefined ? v.LUCRO_OPERACIONAL+(v.DEPRECIACAO||0)+(v.AMORTIZACAO||0) : null; const f = v.RECEITA_BRUTA||v.RECEITA_LIQUIDA; return (e !== null && f) ? (e/f)*100 : null; },
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 20 ? 'Alta — empresa muito eficiente na geracao de caixa operacional.' : r >= 10 ? 'Razoavel.' : 'Baixa — margem EBITDA reduzida.',
  },
  LUC: {
    nome: 'Lucratividade', categoria: 'Rentabilidade', formula: '(LUCRO_LIQUIDO / RECEITA_BRUTA) x 100', vars: ['LUCRO_LIQUIDO','RECEITA_BRUTA'],
    compute: (v) => { const rb = v.RECEITA_BRUTA||v.RECEITA_LIQUIDA; return (rb && v.LUCRO_LIQUIDO !== undefined) ? (v.LUCRO_LIQUIDO/rb)*100 : null; },
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 10 ? 'Boa lucratividade.' : r >= 3 ? 'Aceitavel.' : r >= 0 ? 'Baixa.' : 'Negativa — prejuizo sobre a receita bruta.',
  },
  ROE: {
    nome: 'Retorno sobre o Patrimonio (ROE)', categoria: 'Rentabilidade', formula: '(LUCRO_LIQUIDO / PL) x 100', vars: ['LUCRO_LIQUIDO','PL'],
    compute: (v) => (v.PL && v.PL !== 0 && v.LUCRO_LIQUIDO !== undefined) ? (v.LUCRO_LIQUIDO/v.PL)*100 : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 15 ? 'Alto retorno para os acionistas.' : r >= 8 ? 'Razoavel.' : r >= 0 ? 'Baixo.' : 'Negativo — patrimonio sendo corroido por prejuizos.',
  },
  ROA: {
    nome: 'Retorno sobre o Ativo (ROA)', categoria: 'Rentabilidade', formula: '(LUCRO_LIQUIDO / ATIVO_TOTAL) x 100', vars: ['LUCRO_LIQUIDO','ATIVO_TOTAL'],
    compute: (v) => { const at = v.ATIVO_TOTAL||((v.AC||0)+(v.ANC||0)); return (at && v.LUCRO_LIQUIDO !== undefined) ? (v.LUCRO_LIQUIDO/at)*100 : null; },
    interpretar: (r) => r === null ? 'Indisponivel' : r >= 10 ? 'Excelente eficiencia no uso dos ativos.' : r >= 5 ? 'Razoavel.' : r >= 0 ? 'Baixo.' : 'Negativo — ativos gerando prejuizo.',
  },
  MC: {
    nome: 'Margem de Contribuicao', categoria: 'Rentabilidade', formula: 'RECEITA_LIQUIDA - CSP', vars: ['RECEITA_LIQUIDA','CSP'],
    compute: (v) => (v.RECEITA_LIQUIDA !== undefined && v.CSP !== undefined) ? v.RECEITA_LIQUIDA-v.CSP : null,
    interpretar: (r) => r === null ? 'Indisponivel' : r > 0 ? 'Margem de contribuicao positiva — receita cobre o custo dos produtos/servicos.' : 'Margem de contribuicao negativa — receita nao cobre os custos.',
  },
};

function calcularTodosIndicadores(valores) {
  const results = {};
  for (const [sigla, ind] of Object.entries(INDICATORS)) {
    const missing = ind.vars.filter((v) => valores[v] === undefined);
    let value = null;
    let error = null;
    try {
      if (missing.length < ind.vars.length) value = ind.compute(valores);
    } catch (e) { error = e?.message || 'Erro no calculo'; }
    results[sigla] = { ...ind, value, missing, error };
  }
  return results;
}

function fmtNum(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '--';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function getDisplayValue(sigla, value) {
  if (value === null || value === undefined) return '--';
  const pct  = ['EG','PCT','CE','IPL','IRNC','MB','ML','MO','MEBT','LUC','ROE','ROA'];
  const money = ['DL','DB','MC','EBT'];
  if (pct.includes(sigla))   return fmtNum(value, 2) + '%';
  if (money.includes(sigla)) return 'R$ ' + fmtNum(value, 2);
  return fmtNum(value, 4);
}

function buildLocalIndicatorsReport(valores, results) {
  const cats = ['Liquidez','Estrutura de Capital','Rentabilidade'];

  const extractedEntries = Object.entries(valores);
  const extractedHtml = extractedEntries.length
    ? '<div class="val-cards">' + extractedEntries.map(([k, v]) =>
        '<div class="val-card"><span class="val-label">' + escapeHtml(k) + '</span><span class="val-num">R$ ' + fmtNum(v, 2) + '</span></div>'
      ).join('') + '</div>'
    : '<p class="muted-msg">Nenhum valor extraido automaticamente. Verifique os nomes das colunas/contas no arquivo.</p>';

  const catHtml = cats.map((cat) => {
    const items = Object.entries(results).filter(([, r]) => r.categoria === cat);
    const rows = items.map(([sigla, r]) => {
      const hasVal = r.value !== null && r.value !== undefined;
      const dispVal = getDisplayValue(sigla, r.value);
      const missHint = r.missing.length
        ? '<br><small class="missing-vars">Falta: ' + escapeHtml(r.missing.join(', ')) + '</small>'
        : '';
      return '<tr class="' + (hasVal ? '' : 'st-missing') + '">' +
        '<td><strong>' + escapeHtml(sigla) + '</strong></td>' +
        '<td>' + escapeHtml(r.nome) + '</td>' +
        '<td class="formula-cell"><code>' + escapeHtml(r.formula) + '</code></td>' +
        '<td class="val-cell">' + dispVal + '</td>' +
        '<td>' + escapeHtml(r.interpretar(r.value)) + missHint + '</td>' +
        '</tr>';
    }).join('');
    return '<h3 class="cat-title">' + escapeHtml(cat) + '</h3>' +
      '<table class="ind-table"><thead><tr><th>Sigla</th><th>Indicador</th><th>Formula</th><th>Valor</th><th>Interpretacao</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>';
  }).join('');

  const calculated = Object.values(results).filter((r) => r.value !== null).length;
  const total = Object.keys(results).length;

  return '<style>' +
    '.ind-section h2{font-size:20px;font-weight:900;margin:24px 0 8px}' +
    '.cat-title{font-size:16px;font-weight:700;margin:20px 0 6px;color:#1e40af}' +
    '.val-cards{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}' +
    '.val-card{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:8px 12px;min-width:160px}' +
    '.val-label{display:block;font-size:11px;font-weight:700;color:#0369a1;text-transform:uppercase}' +
    '.val-num{display:block;font-size:14px;font-weight:900;color:#0c4a6e}' +
    '.muted-msg{color:#6b7280;font-size:13px;font-style:italic}' +
    '.ind-table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px}' +
    '.ind-table th,.ind-table td{border:1px solid #e5e7eb;padding:7px 10px}' +
    '.ind-table th{background:#f8fafc;font-weight:700}' +
    '.ind-table tr.st-missing{background:#fafafa;color:#9ca3af}' +
    '.formula-cell code{background:#f3f4f6;padding:2px 6px;border-radius:6px;font-size:12px}' +
    '.val-cell{font-weight:900;white-space:nowrap}' +
    '.missing-vars{color:#ef4444}' +
    '.summary-bar{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:14px}' +
    '</style>' +
    '<div class="ind-section">' +
    '<h2>Relatorio de Indicadores Financeiros</h2>' +
    '<div class="summary-bar"><strong>' + calculated + ' de ' + total + ' indicadores calculados</strong>' +
    (calculated < total ? ' — os demais ' + (total - calculated) + ' nao puderam ser calculados por falta de dados.' : ' — todos calculados com sucesso.') +
    '</div>' +
    '<h3 class="cat-title">Valores Extraidos dos Dados</h3>' +
    extractedHtml +
    catHtml +
    '<hr/>' +
    '<h3 class="cat-title">Avisos e Limites</h3>' +
    '<ul>' +
    '<li>Valores extraidos automaticamente por correspondencia de nomes de conta. Verifique se os dados estao corretos.</li>' +
    '<li>Indicadores com "--" indicam ausencia de dados necessarios para o calculo.</li>' +
    '<li>Benchmarks sao genericos — considere o setor e porte da empresa para interpretacao adequada.</li>' +
    '<li>Relatorio gerado localmente, sem envio de dados para servidores externos.</li>' +
    '</ul>' +
    '</div>';
}

// ============================================================
// FIM DO MOTOR DE INDICADORES
// ============================================================

async function generateReport() {
  if (!inputs.length) {
    setStatus('Adicione arquivos ou conteudo colado antes de gerar o relatorio.', 'warn');
    return;
  }

  try {
    setStatus('Extraindo valores e calculando indicadores...', 'info');
    const logoDataUrl = await loadLogoAsDataUrl().catch(() => '');

    // PASSO 1: Calculo local (sempre executado, sem necessidade de API key)
    const valores = extractAccountValues();
    const results = calcularTodosIndicadores(valores);
    const localHtml = buildLocalIndicatorsReport(valores, results);

    // PASSO 2: Narrativa ChatGPT (opcional — so executa se token informado)
    let aiHtml = '';
    const hasKey = els.openaiKey.value.trim();
    if (hasKey) {
      try {
        setStatus('Indicadores calculados. Gerando narrativa com ChatGPT...', 'info');
        const { context, chosenCount } = buildContextForAI();
        if (context && chosenCount > 0) {
          aiHtml = await callOpenAIForReport(context);
        }
      } catch (err) {
        console.warn('OpenAI indisponivel — usando apenas calculo local:', err);
        setStatus('OpenAI indisponivel — exibindo apenas indicadores locais.', 'warn');
      }
    }

    const bodyHtml = aiHtml
      ? localHtml + '<hr/><h2 style="font-size:18px;font-weight:900;margin:24px 0 8px;">Analise Narrativa (ChatGPT)</h2>' + aiHtml
      : localHtml;

    const finalHtml = buildFinalReportHtml(bodyHtml, logoDataUrl);

    els.reportCard.hidden = false;
    els.reportContainer.innerHTML =
      '<div style="display:flex;gap:14px;align-items:flex-start;border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin-bottom:14px;">' +
      (logoDataUrl ? '<img src="' + logoDataUrl + '" alt="Logo" style="width:62px;height:62px;object-fit:contain;border:1px solid #e5e7eb;border-radius:14px;background:#fff;" />' : '') +
      '<div>' +
      '<div style="font-weight:900;font-size:18px;">Relatorio Financeiro</div>' +
      '<div style="color:#6b7280;font-size:12.5px;margin-top:4px;">Indicadores Financeiros — calculados localmente' + (aiHtml ? ' + Narrativa ChatGPT' : '') + '</div>' +
      '<div style="color:#6b7280;font-size:12.5px;margin-top:6px;">Data: ' + escapeHtml(new Date().toLocaleString('pt-BR')) + '</div>' +
      '</div></div>' +
      '<div class="content">' + bodyHtml + '</div>' +
      '<hr/><div class="muted small">Relatorio gerado em: ' + escapeHtml(new Date().toLocaleString('pt-BR')) + '</div>';

    enableReportButtons();
    setStatus('Relatorio gerado com sucesso.', 'success');

    els.downloadBtn.onclick = () => {
      const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio_financeiro.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    els.printBtn.onclick = () => { void exportReportToPdf(); };
  } catch (err) {
    console.error(err);
    setStatus(err?.message || 'Erro ao gerar relatorio.', 'error');
  }
}

async function onParseContext() {
  if (!inputs.length) {
    setStatus('Adicione pelo menos um arquivo ou conteudo colado.', 'warn');
    setGenerateEnabled(false);
    return;
  }
  setGenerateEnabled(true);
  setStatus('Contexto preparado. Clique em "Gerar relatorio".', 'success');
}

function setupEventListeners() {
  els.chooseFilesBtn.addEventListener('click', () => els.fileInput.click());

  els.fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    void addFiles(files);
    e.target.value = '';
  });

  // Drag & drop
  const dz = els.dropZone;
  const prevent = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
  };
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((name) => {
    dz.addEventListener(name, (e) => {
      prevent(e);
      if (name === 'dragenter' || name === 'dragover') dz.style.borderColor = '#60a5fa';
      else dz.style.borderColor = '#c7d2fe';
    });
  });
  dz.addEventListener('drop', (e) => {
    prevent(e);
    const files = Array.from(e.dataTransfer?.files || []);
    void addFiles(files);
  });

  // Paste buttons
  els.usePasteBtn.addEventListener('click', () => addPasteContent());
  els.clearPasteBtn.addEventListener('click', () => (els.pasteBox.value = ''));

  // Generate flow
  els.parseBtn.addEventListener('click', () => void onParseContext());
  els.generateBtn.addEventListener('click', () => void generateReport());

  // Se o usuario alterar parametros depois de preparar contexto,
  // forca ele a clicar novamente em "Preparar contexto".
  [els.includeBalance, els.includeIncome].forEach((cb) => {
    cb.addEventListener('change', () => setGenerateEnabled(false));
  });
  els.maxRows.addEventListener('input', () => setGenerateEnabled(false));
}

function init() {
  renderInputs();
  setGenerateEnabled(false);
  els.reportCard.hidden = true;
  els.downloadBtn.disabled = true;
  els.printBtn.disabled = true;
  setupEventListeners();
  setStatus('Pronto. Faca upload ou cole dados para iniciar.', 'info');
}

document.addEventListener('DOMContentLoaded', init);

