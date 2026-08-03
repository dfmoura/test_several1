import { FormEvent, useEffect, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import {
  formatQty,
  getErrorMessage,
  lookupApi,
  produtosApi,
  type CestLookup,
  type CodeLabel,
  type CfopItem,
  type NcmLookupItem,
} from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow, TipoProduto, UnidadeProduto } from '../types';

const TIPOS: TipoProduto[] = ['INSUMO', 'ACABADO', 'SERVICO', 'REVENDA', 'EMBALAGEM'];
const UNIDADES: UnidadeProduto[] = ['M2', 'ML', 'UN', 'KG', 'RL'];

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function formatNcmDisplay(v: string) {
  const d = onlyDigits(v);
  if (d.length === 8) return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
  return v;
}

function formatCestDisplay(v: string) {
  const d = onlyDigits(v);
  if (d.length === 7) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  return v;
}

const emptyForm = {
  sku: '',
  descricao: '',
  tipo: 'INSUMO' as TipoProduto,
  unidade: 'M2' as UnidadeProduto,
  grupo: '',
  ncm: '',
  cest: '',
  origem: '0',
  tipo_item_sped: '',
  csosn: '102',
  cfop_entrada: '',
  cfop_saida_dentro: '',
  cfop_saida_fora: '',
  largura_mm: '',
  comprimento_m: '',
  controla_estoque: true,
  estoque_minimo: '0',
  ponto_pedido: '0',
  lote_compra: '0',
  observacao: '',
  ativo: true,
};

export function ProdutosPage() {
  const etapa = ETAPAS[1];
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [editCodigo, setEditCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [ncmQuery, setNcmQuery] = useState('');
  const [ncmResults, setNcmResults] = useState<NcmLookupItem[]>([]);
  const [ncmDescricao, setNcmDescricao] = useState<string | null>(null);
  const [ncmSearching, setNcmSearching] = useState(false);
  const [showNcmList, setShowNcmList] = useState(false);
  const [cestInfo, setCestInfo] = useState<CestLookup | null>(null);
  const [fiscalHint, setFiscalHint] = useState<string | null>(null);
  const [origens, setOrigens] = useState<CodeLabel[]>([]);
  const [tiposSped, setTiposSped] = useState<CodeLabel[]>([]);
  const [cfops, setCfops] = useState<CfopItem[]>([]);
  const ncmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ncmBoxRef = useRef<HTMLDivElement | null>(null);

  async function carregar() {
    try {
      const rows = await produtosApi.list({ q: busca || undefined });
      setLista(rows as ApiRow[]);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
    void Promise.all([lookupApi.origens(), lookupApi.tiposItemSped(), lookupApi.cfopSearch()])
      .then(([o, t, c]) => {
        setOrigens(o);
        setTiposSped(t);
        setCfops(c);
      })
      .catch(() => {
        /* catálogo local opcional na abertura */
      });
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ncmBoxRef.current?.contains(e.target as Node)) setShowNcmList(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function resetFiscalUi() {
    setNcmQuery('');
    setNcmResults([]);
    setNcmDescricao(null);
    setShowNcmList(false);
    setCestInfo(null);
    setFiscalHint(null);
  }

  async function aplicarSugestaoFiscal(tipo: TipoProduto, overwrite = true) {
    try {
      const sug = await lookupApi.fiscalProduto(tipo);
      setFiscalHint(sug.mensagem);
      setForm((f) => ({
        ...f,
        tipo,
        origem: overwrite || !f.origem ? sug.origem : f.origem,
        tipo_item_sped:
          overwrite || !f.tipo_item_sped ? sug.tipo_item_sped : f.tipo_item_sped,
        csosn: overwrite || !f.csosn ? sug.csosn : f.csosn,
        cfop_entrada:
          overwrite || !f.cfop_entrada ? sug.cfop_entrada?.codigo || '' : f.cfop_entrada,
        cfop_saida_dentro:
          overwrite || !f.cfop_saida_dentro
            ? sug.cfop_saida_dentro?.codigo || ''
            : f.cfop_saida_dentro,
        cfop_saida_fora:
          overwrite || !f.cfop_saida_fora ? sug.cfop_saida_fora?.codigo || '' : f.cfop_saida_fora,
      }));
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  function abrirNovo() {
    setEditId(null);
    setEditCodigo('');
    setForm(emptyForm);
    resetFiscalUi();
    setFormOpen(true);
    setErro(null);
    void aplicarSugestaoFiscal('INSUMO', true);
  }

  function abrirEditar(p: ApiRow) {
    setEditId(p.id as number);
    setEditCodigo(String(p.codigo ?? ''));
    const ncm = String(p.ncm ?? '');
    const cest = String(p.cest ?? '');
    setForm({
      sku: String(p.sku ?? ''),
      descricao: String(p.descricao ?? ''),
      tipo: (p.tipo as TipoProduto) ?? 'INSUMO',
      unidade: (p.unidade as UnidadeProduto) ?? 'M2',
      grupo: String(p.grupo ?? ''),
      ncm,
      cest,
      origem: String(p.origem ?? '0'),
      tipo_item_sped: String(p.tipo_item_sped ?? ''),
      csosn: String(p.csosn ?? '102'),
      cfop_entrada: String(p.cfop_entrada ?? ''),
      cfop_saida_dentro: String(p.cfop_saida_dentro ?? ''),
      cfop_saida_fora: String(p.cfop_saida_fora ?? ''),
      largura_mm: p.largura_mm != null ? String(p.largura_mm) : '',
      comprimento_m: p.comprimento_m != null ? String(p.comprimento_m) : '',
      controla_estoque: Boolean(p.controla_estoque ?? true),
      estoque_minimo: String(p.estoque_minimo ?? '0'),
      ponto_pedido: String(p.ponto_pedido ?? '0'),
      lote_compra: String(p.lote_compra ?? '0'),
      observacao: String(p.observacao ?? ''),
      ativo: Boolean(p.ativo ?? true),
    });
    setNcmQuery(ncm ? formatNcmDisplay(ncm) : '');
    setNcmDescricao(null);
    setCestInfo(null);
    setFiscalHint(null);
    setFormOpen(true);
    setErro(null);
    if (onlyDigits(ncm).length === 8) {
      void carregarDetalheNcm(onlyDigits(ncm), { aplicarCest: false });
    }
  }

  async function carregarDetalheNcm(codigo: string, opts?: { aplicarCest?: boolean }) {
    const digits = onlyDigits(codigo);
    if (digits.length !== 8) return;
    try {
      const data = await lookupApi.ncmCodigo(digits);
      setNcmDescricao(data.descricao ?? null);
      if (data.cest) {
        setCestInfo(data.cest);
        if (opts?.aplicarCest !== false && data.cest.sugerir_vazio) {
          setForm((f) => ({ ...f, cest: '' }));
        }
      }
    } catch {
      try {
        const cest = await lookupApi.cest(digits);
        setCestInfo(cest);
      } catch {
        /* ignore */
      }
    }
  }

  function onNcmInput(value: string) {
    setNcmQuery(value);
    const digits = onlyDigits(value);
    setForm((f) => ({ ...f, ncm: digits.slice(0, 8) }));
    setShowNcmList(true);
    setNcmDescricao(null);

    if (ncmTimer.current) clearTimeout(ncmTimer.current);
    if (value.trim().length < 2) {
      setNcmResults([]);
      setCestInfo(null);
      return;
    }
    ncmTimer.current = setTimeout(async () => {
      setNcmSearching(true);
      try {
        const rows = await lookupApi.ncmSearch(value.trim());
        setNcmResults(rows);
        if (digits.length === 8) {
          await carregarDetalheNcm(digits, { aplicarCest: true });
        }
      } catch (e) {
        setErro(getErrorMessage(e));
        setNcmResults([]);
      } finally {
        setNcmSearching(false);
      }
    }, 450);
  }

  function selecionarNcm(item: NcmLookupItem) {
    const codigo = onlyDigits(item.codigo).slice(0, 8);
    setForm((f) => ({ ...f, ncm: codigo }));
    setNcmQuery(item.codigo_formatado || formatNcmDisplay(codigo));
    setNcmDescricao(item.descricao ?? null);
    setShowNcmList(false);
    setNcmResults([]);
    void carregarDetalheNcm(codigo, { aplicarCest: true });
  }

  async function validarNcm() {
    const digits = onlyDigits(form.ncm);
    if (digits.length !== 8) {
      setErro('NCM precisa ter 8 dígitos para validar na BrasilAPI.');
      return;
    }
    setPending(true);
    setErro(null);
    try {
      const data = await lookupApi.ncmCodigo(digits);
      setNcmQuery(data.codigo_formatado || formatNcmDisplay(digits));
      setNcmDescricao(data.descricao ?? null);
      setCestInfo(data.cest ?? null);
      if (data.cest?.sugerir_vazio) setForm((f) => ({ ...f, cest: '', ncm: digits }));
      else setForm((f) => ({ ...f, ncm: digits }));
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function sugerirPorLargura() {
    if (!form.largura_mm) {
      setErro('Informe a largura (mm) da bobina para sugerir o NCM 3919.');
      return;
    }
    setPending(true);
    setErro(null);
    try {
      const material = /bopp|pp|poli/i.test(`${form.grupo} ${form.descricao}`) ? 'PP' : 'OUTROS';
      const sug = await lookupApi.ncmPorLargura(parseFloat(form.largura_mm), material);
      setForm((f) => ({ ...f, ncm: sug.ncm, cest: '' }));
      setNcmQuery(sug.ncm_formatado || formatNcmDisplay(sug.ncm));
      setFiscalHint(sug.descricao_regra);
      await carregarDetalheNcm(sug.ncm, { aplicarCest: true });
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  function aplicarCestCandidato(codigo: string) {
    setForm((f) => ({ ...f, cest: onlyDigits(codigo).slice(0, 7) }));
  }

  function limparCest() {
    setForm((f) => ({ ...f, cest: '' }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setErro(null);
    const ncm = onlyDigits(form.ncm);
    const cest = onlyDigits(form.cest);
    if (ncm && ncm.length !== 8) {
      setErro('NCM inválido: use 8 dígitos.');
      setPending(false);
      return;
    }
    if (cest && cest.length !== 7) {
      setErro('CEST inválido: use 7 dígitos ou deixe vazio.');
      setPending(false);
      return;
    }
    const body: Record<string, unknown> = {
      sku: form.sku || null,
      descricao: form.descricao,
      tipo: form.tipo,
      unidade: form.unidade,
      grupo: form.grupo || null,
      ncm: ncm || null,
      cest: cest || null,
      origem: onlyDigits(form.origem).slice(0, 1) || '0',
      tipo_item_sped: onlyDigits(form.tipo_item_sped).slice(0, 2) || null,
      csosn: onlyDigits(form.csosn).slice(0, 3) || '102',
      cfop_entrada: onlyDigits(form.cfop_entrada).slice(0, 4) || null,
      cfop_saida_dentro: onlyDigits(form.cfop_saida_dentro).slice(0, 4) || null,
      cfop_saida_fora: onlyDigits(form.cfop_saida_fora).slice(0, 4) || null,
      largura_mm: form.largura_mm ? parseFloat(form.largura_mm) : null,
      comprimento_m: form.comprimento_m ? parseFloat(form.comprimento_m) : null,
      controla_estoque: form.controla_estoque,
      estoque_minimo: parseFloat(form.estoque_minimo) || 0,
      ponto_pedido: parseFloat(form.ponto_pedido) || 0,
      lote_compra: parseFloat(form.lote_compra) || 0,
      observacao: form.observacao || null,
      ativo: form.ativo,
    };
    try {
      if (editId) await produtosApi.update(editId, body);
      else await produtosApi.create(body);
      setFormOpen(false);
      await carregar();
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const cfopsEntrada = cfops.filter((c) => c.tipo === 'ENTRADA');
  const cfopsSaida = cfops.filter((c) => c.tipo === 'SAIDA');

  return (
    <>
      <PageHeader
        ordem={etapa.ordem}
        codigo={etapa.codigo}
        titulo="Produtos"
        modo={etapa.modo}
        regra={etapa.regra}
        actions={
          <button type="button" className="btn primary" onClick={abrirNovo}>
            Novo produto
          </button>
        }
      />

      {erro ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <div className="btn-row" style={{ marginBottom: '1rem' }}>
          <input
            placeholder="Buscar por descrição ou código…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ flex: 1, minWidth: '12rem' }}
          />
          <button type="button" className="btn" onClick={carregar}>
            Buscar
          </button>
        </div>

        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>SKU</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>NCM</th>
              <th>CEST</th>
              <th>Origem</th>
              <th>CFOP</th>
              <th>Unidade</th>
              <th>Saldo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={String(p.id)}>
                <td>{String(p.codigo)}</td>
                <td>{String(p.sku ?? '—')}</td>
                <td>{String(p.descricao)}</td>
                <td>{String(p.tipo)}</td>
                <td>{p.ncm ? formatNcmDisplay(String(p.ncm)) : '—'}</td>
                <td>{p.cest ? formatCestDisplay(String(p.cest)) : '—'}</td>
                <td>{String(p.origem ?? '—')}</td>
                <td>{String(p.cfop_saida_dentro ?? p.cfop_entrada ?? '—')}</td>
                <td>{String(p.unidade)}</td>
                <td>{formatQty(p.saldo_qtd as string | number)}</td>
                <td>
                  <button type="button" className="btn sm" onClick={() => abrirEditar(p)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {formOpen ? (
        <div className="modal-backdrop" onClick={() => setFormOpen(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Editar produto' : 'Novo produto'}</h2>
              <button type="button" className="btn ghost sm" onClick={() => setFormOpen(false)}>
                Fechar
              </button>
            </div>

            <form onSubmit={salvar}>
              <div className="form-grid">
                {editId ? (
                  <label>
                    Código
                    <input readOnly value={editCodigo} />
                  </label>
                ) : null}
                <label>
                  SKU
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </label>
                <label style={{ gridColumn: 'span 2' }}>
                  Descrição *
                  <input
                    required
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  />
                </label>
                <label>
                  Tipo
                  <select
                    value={form.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value as TipoProduto;
                      void aplicarSugestaoFiscal(tipo, true);
                    }}
                  >
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Unidade
                  <select
                    value={form.unidade}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value as UnidadeProduto })}
                  >
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Grupo
                  <input value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} />
                </label>
                <label>
                  Largura (mm)
                  <input
                    type="number"
                    value={form.largura_mm}
                    onChange={(e) => setForm({ ...form, largura_mm: e.target.value })}
                  />
                </label>
                <label>
                  Comprimento (m)
                  <input
                    type="number"
                    step="0.01"
                    value={form.comprimento_m}
                    onChange={(e) => setForm({ ...form, comprimento_m: e.target.value })}
                  />
                </label>

                <div className="section-title" style={{ gridColumn: '1 / -1' }}>
                  Classificação fiscal
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => void aplicarSugestaoFiscal(form.tipo, true)}
                  >
                    Reaplicar sugestão do estudo
                  </button>
                </div>
                {fiscalHint ? (
                  <p className="field-hint" style={{ gridColumn: '1 / -1' }}>
                    {fiscalHint}
                  </p>
                ) : null}

                <div className="lookup-field" style={{ gridColumn: '1 / -1' }} ref={ncmBoxRef}>
                  <div className="lookup-label-row">
                    <span>NCM (BrasilAPI)</span>
                    <div className="btn-row">
                      <button type="button" className="btn sm" disabled={pending} onClick={validarNcm}>
                        Validar NCM
                      </button>
                      <button type="button" className="btn sm" disabled={pending} onClick={sugerirPorLargura}>
                        Sugerir NCM 3919 pela largura
                      </button>
                    </div>
                  </div>
                  <input
                    value={ncmQuery}
                    placeholder="Código ou descrição (ex.: 3919 ou BOPP)"
                    onChange={(e) => onNcmInput(e.target.value)}
                    onFocus={() => ncmResults.length && setShowNcmList(true)}
                    autoComplete="off"
                  />
                  {ncmSearching ? <p className="field-hint">Consultando BrasilAPI…</p> : null}
                  {ncmDescricao ? <p className="field-hint ok">{ncmDescricao}</p> : null}
                  {showNcmList && ncmResults.length > 0 ? (
                    <ul className="lookup-dropdown">
                      {ncmResults.map((item) => (
                        <li key={`${item.codigo}-${item.descricao}`}>
                          <button type="button" onClick={() => selecionarNcm(item)}>
                            <strong>{item.codigo_formatado || formatNcmDisplay(item.codigo)}</strong>
                            <span>{item.descricao}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <label>
                  CEST
                  <input
                    value={form.cest ? formatCestDisplay(form.cest) : ''}
                    placeholder="vazio = sem ST (padrão RLP)"
                    onChange={(e) =>
                      setForm({ ...form, cest: onlyDigits(e.target.value).slice(0, 7) })
                    }
                  />
                </label>
                <div className="cest-panel">
                  {cestInfo ? (
                    <>
                      <p className="field-hint">{cestInfo.mensagem}</p>
                      <p className="field-hint muted">{cestInfo.fonte}</p>
                      <div className="btn-row">
                        {cestInfo.sugerir_vazio ? (
                          <button type="button" className="btn sm" onClick={limparCest}>
                            Manter CEST vazio (recomendado)
                          </button>
                        ) : null}
                        {cestInfo.candidatos.map((c) => (
                          <button
                            key={c.codigo}
                            type="button"
                            className={`btn sm ${c.recomendado_rlp ? 'primary' : ''}`}
                            onClick={() => aplicarCestCandidato(c.codigo)}
                            title={c.descricao}
                          >
                            Usar {c.codigo_formatado || formatCestDisplay(c.codigo)}
                            {!c.recomendado_rlp ? ' (só construção)' : ''}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="field-hint muted">
                      Selecione ou valide um NCM para obter sugestão de CEST (estudo RLP).
                    </p>
                  )}
                </div>

                <label>
                  Origem
                  <select
                    value={form.origem}
                    onChange={(e) => setForm({ ...form, origem: e.target.value })}
                  >
                    {(origens.length ? origens : [{ codigo: '0', descricao: 'Nacional' }]).map((o) => (
                      <option key={o.codigo} value={o.codigo}>
                        {o.codigo} — {o.descricao}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo item SPED
                  <select
                    value={form.tipo_item_sped}
                    onChange={(e) => setForm({ ...form, tipo_item_sped: e.target.value })}
                  >
                    <option value="">—</option>
                    {(tiposSped.length
                      ? tiposSped
                      : [
                          { codigo: '00', descricao: 'Revenda' },
                          { codigo: '01', descricao: 'Matéria-prima' },
                          { codigo: '02', descricao: 'Embalagem' },
                          { codigo: '04', descricao: 'Produto acabado' },
                          { codigo: '09', descricao: 'Serviços' },
                        ]
                    ).map((t) => (
                      <option key={t.codigo} value={t.codigo}>
                        {t.codigo} — {t.descricao}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  CSOSN
                  <input
                    value={form.csosn}
                    onChange={(e) =>
                      setForm({ ...form, csosn: onlyDigits(e.target.value).slice(0, 3) })
                    }
                    placeholder="102"
                  />
                </label>

                <label>
                  CFOP entrada
                  <select
                    value={form.cfop_entrada}
                    onChange={(e) => setForm({ ...form, cfop_entrada: e.target.value })}
                  >
                    <option value="">—</option>
                    {cfopsEntrada.map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.codigo} — {c.descricao}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  CFOP saída (MG)
                  <select
                    value={form.cfop_saida_dentro}
                    onChange={(e) => setForm({ ...form, cfop_saida_dentro: e.target.value })}
                  >
                    <option value="">—</option>
                    {cfopsSaida.map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.codigo} — {c.descricao}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  CFOP saída (outra UF)
                  <select
                    value={form.cfop_saida_fora}
                    onChange={(e) => setForm({ ...form, cfop_saida_fora: e.target.value })}
                  >
                    <option value="">—</option>
                    {cfopsSaida.map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.codigo} — {c.descricao}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Controla estoque
                  <select
                    value={form.controla_estoque ? '1' : '0'}
                    onChange={(e) => setForm({ ...form, controla_estoque: e.target.value === '1' })}
                  >
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </label>
                <label>
                  Estoque mínimo
                  <input
                    type="number"
                    step="0.0001"
                    value={form.estoque_minimo}
                    onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
                  />
                </label>
                <label>
                  Ponto de pedido
                  <input
                    type="number"
                    step="0.0001"
                    value={form.ponto_pedido}
                    onChange={(e) => setForm({ ...form, ponto_pedido: e.target.value })}
                  />
                </label>
                <label>
                  Lote de compra
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lote_compra}
                    onChange={(e) => setForm({ ...form, lote_compra: e.target.value })}
                  />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Observação
                  <textarea
                    rows={2}
                    value={form.observacao}
                    onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  />
                </label>
                <label>
                  Ativo
                  <select
                    value={form.ativo ? '1' : '0'}
                    onChange={(e) => setForm({ ...form, ativo: e.target.value === '1' })}
                  >
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </label>
              </div>

              <div className="btn-row" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn primary" disabled={pending}>
                  Salvar
                </button>
                <button type="button" className="btn" onClick={() => setFormOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
