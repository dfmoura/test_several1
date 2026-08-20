import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import {
  ApiError,
  api,
  type NaturezaGerencial,
  type NfeEntradaEspelho,
  type OrdemCompra,
  type ReceberXmlParcela,
  type ReceberXmlPreview,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { ocStatusLabel } from '../lib/comprasUi';
import { formatCurrency, formatDate } from '../lib/format';

function idDestLabel(id: string | null | undefined): string {
  if (id === '1') return 'Interna';
  if (id === '2') return 'Interestadual';
  if (id === '3') return 'Exterior';
  return id || '—';
}

function dash(value: string | null | undefined): string {
  return value && value !== '' ? value : '—';
}

function EspelhoFiscalPanel({
  espelho,
  titulo,
}: {
  espelho: NfeEntradaEspelho;
  titulo: string;
}) {
  return (
    <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
      <strong>{titulo}</strong>
      <div className="muted" style={{ margin: '0.35rem 0 0.75rem' }}>
        Impostos como no XML, sem recálculo. Guardado para o livro de entrada — o ERP não
        faz escrituração oficial.
      </div>
      <p style={{ marginBottom: '0.5rem' }}>
        NF {dash(espelho.numero)}
        {espelho.serie ? ` série ${espelho.serie}` : ''}
        {' · '}
        {dash(espelho.nat_op)}
        {' · '}
        {idDestLabel(espelho.id_dest)}
        {espelho.emit_uf ? ` · UF ${espelho.emit_uf}` : ''}
        {espelho.emit_crt ? ` · CRT ${espelho.emit_crt}` : ''}
      </p>
      <p style={{ marginBottom: '0.75rem' }}>
        BC {dash(espelho.totais.v_bc)}
        {' · ICMS '}
        {dash(espelho.totais.v_icms)}
        {' · IPI '}
        {dash(espelho.totais.v_ipi)}
        {' · PIS '}
        {dash(espelho.totais.v_pis)}
        {' · COFINS '}
        {dash(espelho.totais.v_cofins)}
        {' · ST '}
        {dash(espelho.totais.v_st)}
        {espelho.totais.v_nf ? ` · vNF ${espelho.totais.v_nf}` : ''}
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>CFOP</th>
              <th>NCM</th>
              <th>Orig</th>
              <th>CST</th>
              <th>Alíq.</th>
              <th>ICMS</th>
              <th>IPI</th>
              <th>PIS</th>
              <th>COFINS</th>
            </tr>
          </thead>
          <tbody>
            {espelho.itens.map((item) => (
              <tr key={item.n_item}>
                <td>{item.n_item}</td>
                <td>{dash(item.cfop)}</td>
                <td>{dash(item.ncm)}</td>
                <td>{dash(item.orig)}</td>
                <td>{dash(item.cst)}</td>
                <td>{dash(item.p_icms)}</td>
                <td>{dash(item.v_icms)}</td>
                <td>{dash(item.v_ipi)}</td>
                <td>{dash(item.v_pis)}</td>
                <td>{dash(item.v_cofins)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ComprasOrdemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [oc, setOc] = useState<OrdemCompra | null>(null);
  const [naturezas, setNaturezas] = useState<NaturezaGerencial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [xmlLoading, setXmlLoading] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<ReceberXmlPreview | null>(null);
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [lineMap, setLineMap] = useState<Record<number, string>>({});

  const [nfNumero, setNfNumero] = useState('');
  const [nfChave, setNfChave] = useState('');
  const [nfData, setNfData] = useState('');
  const [nfValor, setNfValor] = useState<string | null>(null);
  const [nfTotais, setNfTotais] = useState<Record<string, string | null> | null>(null);
  const [vencimento, setVencimento] = useState('');
  const [parcelas, setParcelas] = useState<ReceberXmlParcela[]>([]);
  const [naturezaId, setNaturezaId] = useState('');
  const [qtdes, setQtdes] = useState<Record<number, string>>({});
  const [loteForms, setLoteForms] = useState<
    Record<number, { codigo: string; data_entrada: string; data_validade: string; data_fabricacao: string }>
  >({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: OrdemCompra }>(`/ordens-compra/${id}`);
      setOc(res.data);
      const map: Record<number, string> = {};
      for (const item of res.data.itens ?? []) {
        const restante = Number(item.qtde_pedida) - Number(item.qtde_recebida || 0);
        map[item.id] = restante > 0 ? String(restante) : '0';
      }
      setQtdes(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void api
      .get<{ data: NaturezaGerencial[] }>('/consulta/naturezas-gerenciais')
      .then((res) => {
        setNaturezas(res.data);
        const def = res.data.find((n) => n.codigo === '5.06');
        if (def) setNaturezaId(String(def.id));
      });
  }, [id]);

  const canReceive =
    !!oc &&
    hasPermission('estoque.escrever') &&
    (oc.status === 'ABERTA' || oc.status === 'PARCIAL');

  const applyXmlPreview = (preview: ReceberXmlPreview) => {
    setXmlPreview(preview);
    const sug = preview.sugerido_receber;
    if (sug.nf_chave) setNfChave(sug.nf_chave);
    if (sug.nf_numero) setNfNumero(sug.nf_numero);
    if (sug.nf_data) setNfData(sug.nf_data);
    setNfValor(sug.nf_valor ?? preview.nf.valor_nf ?? null);
    setNfTotais(sug.nf_totais ?? preview.nf.totais ?? null);
    if (sug.vencimento) setVencimento(sug.vencimento);

    const pars = sug.parcelas ?? preview.nf.parcelas ?? [];
    setParcelas(pars.map((p) => ({ ...p })));

    const nextQtdes: Record<number, string> = { ...qtdes };
    for (const item of oc?.itens ?? []) {
      nextQtdes[item.id] = '0';
    }
    for (const item of sug.itens) {
      nextQtdes[item.ordem_compra_item_id] = item.qtde_recebida;
    }
    setQtdes(nextQtdes);

    setLoteForms((prev) => {
      const next = { ...prev };
      for (const item of sug.itens) {
        if (item.lote_codigo) {
          next[item.ordem_compra_item_id] = {
            codigo: item.lote_codigo,
            data_entrada: item.lote_data_entrada || sug.nf_data || '',
            data_validade: item.lote_data_validade || '',
            data_fabricacao: item.lote_data_fabricacao || '',
          };
        }
      }
      return next;
    });

    const map: Record<number, string> = {};
    for (const linha of preview.linhas) {
      map[linha.n_item] = linha.match.ordem_compra_item_id
        ? String(linha.match.ordem_compra_item_id)
        : '';
    }
    setLineMap(map);
  };

  const onXmlFile = async (file: File | null) => {
    if (!file || !oc) return;
    setError(null);
    setMsg(null);
    setXmlLoading(true);
    try {
      const text = await file.text();
      setXmlContent(text);
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.postForm<{ data: ReceberXmlPreview }>(
        `/ordens-compra/${oc.id}/receber/xml/preview`,
        fd,
      );
      applyXmlPreview(res.data);
      setMsg('XML lido — confira o de-para e confirme a entrada. Nada foi lançado ainda.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao ler XML.');
      setXmlPreview(null);
      setXmlContent(null);
    } finally {
      setXmlLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const rebuildQtdesFromMap = (map: Record<number, string>, preview: ReceberXmlPreview) => {
    const next: Record<number, string> = {};
    for (const item of oc?.itens ?? []) {
      next[item.id] = '0';
    }
    for (const linha of preview.linhas) {
      const ocItemId = Number(map[linha.n_item] || 0);
      if (!ocItemId) continue;
      const prev = next[ocItemId] || '0';
      const sum = (Number(prev) + Number(linha.q_com)).toFixed(4);
      next[ocItemId] = sum;
    }
    setQtdes(next);
  };

  const somaParcelas = parcelas.reduce((acc, p) => acc + Number(p.valor || 0), 0);

  const updateParcela = (idx: number, patch: Partial<ReceberXmlParcela>) => {
    setParcelas((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    );
    if (idx === 0 && patch.vencimento) {
      setVencimento(patch.vencimento);
    }
  };

  const addParcela = () => {
    setParcelas((prev) => [
      ...prev,
      {
        n_dup: String(prev.length + 1).padStart(3, '0'),
        vencimento: vencimento || '',
        valor: '0.00',
      },
    ]);
  };

  const removeParcela = (idx: number) => {
    setParcelas((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next[0]?.vencimento) setVencimento(next[0].vencimento);
      return next;
    });
  };

  const receber = async (e: FormEvent) => {
    e.preventDefault();
    if (!oc) return;
    setError(null);
    setMsg(null);
    setReceiving(true);
    try {
      const itens = (oc.itens ?? [])
        .map((item) => {
          const row: Record<string, unknown> = {
            ordem_compra_item_id: item.id,
            qtde_recebida: qtdes[item.id] || '0',
          };
          if (item.produto?.controla_lote) {
            const lote = loteForms[item.id];
            row.lote_codigo = lote?.codigo || '';
            row.lote_data_entrada = lote?.data_entrada || nfData || null;
            row.lote_data_validade = lote?.data_validade || null;
            row.lote_data_fabricacao = lote?.data_fabricacao || null;
          }
          return row;
        })
        .filter((i) => Number(i.qtde_recebida) > 0);

      const cprod_maps =
        xmlPreview?.linhas
          .map((linha) => {
            const ocItemId = Number(lineMap[linha.n_item] || linha.match.ordem_compra_item_id || 0);
            const ocItem = (oc.itens ?? []).find((i) => i.id === ocItemId);
            if (!ocItem) return null;
            return {
              c_prod: linha.c_prod,
              produto_id: ocItem.produto_id,
              x_prod: linha.x_prod,
            };
          })
          .filter((m): m is { c_prod: string; produto_id: number; x_prod: string | null } => !!m) ??
        [];

      const payload: Record<string, unknown> = {
        nf_numero: nfNumero || null,
        nf_chave: nfChave || null,
        nf_data: nfData || null,
        nf_valor: nfValor,
        nf_totais: nfTotais,
        natureza_id: naturezaId ? Number(naturezaId) : undefined,
        itens,
        cprod_maps: cprod_maps.length ? cprod_maps : undefined,
      };
      if (xmlContent) {
        payload.xml = xmlContent;
      }

      if (parcelas.length > 0) {
        payload.parcelas = parcelas.map((p, i) => ({
          n_dup: p.n_dup,
          vencimento: p.vencimento,
          valor: p.valor,
          parcela: i + 1,
        }));
        payload.vencimento = parcelas[0]?.vencimento || vencimento || null;
      } else {
        payload.vencimento = vencimento;
      }

      await api.post<{ data: { nfe_entrada?: { numero: string | null; xml_armazenado?: boolean } | null } }>(
        `/ordens-compra/${oc.id}/receber`,
        payload,
      ).then((res) => {
        const nfe = res.data.nfe_entrada;
        const titulosMsg =
          parcelas.length > 1
            ? `estoque atualizado e ${parcelas.length} títulos a pagar gerados`
            : 'estoque atualizado e título a pagar gerado';
        setMsg(
          nfe?.xml_armazenado
            ? `Entrada conferida: ${titulosMsg}. Espelho fiscal da NF ${nfe.numero ?? nfNumero} guardado.`
            : `Entrada conferida: ${titulosMsg}.`,
        );
      });
      setXmlPreview(null);
      setXmlContent(null);
      setParcelas([]);
      setNfValor(null);
      setNfTotais(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha no recebimento.');
    } finally {
      setReceiving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={oc?.codigo ?? 'Ordem de compra'}
        description={
          oc
            ? `${oc.fornecedor?.razao_social ?? 'Ordem de compra'}`
            : 'Carregando…'
        }
        actions={
          <div className="btn-row">
            <Link to="/compras/ordens" className="btn btn-secondary">
              Voltar
            </Link>
            {hasPermission('financeiro.ler') && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/financeiro/contas-a-pagar')}
              >
                Contas a pagar
              </button>
            )}
          </div>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {loading || !oc ? (
        <div className="loading">Carregando…</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
                <StatusPill status={ocStatusLabel(oc.status)} />
                {oc.urgente && <span className="muted">· urgente</span>}
                <span>Total {formatCurrency(oc.valor_total)}</span>
                <span className="muted">Previsão {formatDate(oc.previsao_entrega)}</span>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Pedida</th>
                      <th>Recebida</th>
                      <th>Unit.</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(oc.itens ?? []).map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.produto?.codigo} —{' '}
                          {item.produto?.descricao_comercial || item.produto?.descricao_fiscal}
                          <div className="muted">{item.unidade}</div>
                        </td>
                        <td>{item.qtde_pedida}</td>
                        <td>{item.qtde_recebida}</td>
                        <td>{formatCurrency(item.valor_unitario)}</td>
                        <td>{formatCurrency(item.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {(oc.nfe_entradas ?? [])
            .filter((n) => n.espelho)
            .map((n) => (
              <EspelhoFiscalPanel
                key={n.id}
                titulo={`Espelho fiscal guardado · NF ${n.numero ?? n.chave}`}
                espelho={n.espelho!}
              />
            ))}

          {canReceive && (
            <form onSubmit={(e) => void receber(e)}>
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-body">
                  <div className="form-section">
                    <h3>Receber e conferir (NF × OC)</h3>
                    <p className="muted" style={{ marginBottom: '1rem' }}>
                      Um ato: confere a nota com a OC e lança MOV no estoque + título(s) a pagar
                      (NAT 5.06). XML preenche itens e parcelas — a confirmação é humana. Estoque
                      usa preços da OC; pagar segue as duplicatas da NF. Com XML, o sistema guarda
                      o espelho fiscal (impostos como na nota) para o livro de entrada futuro.
                    </p>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label>XML da NF-e (opcional)</label>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".xml,text/xml,application/xml"
                        disabled={xmlLoading}
                        onChange={(e) => void onXmlFile(e.target.files?.[0] ?? null)}
                      />
                      {xmlLoading && <div className="muted">Lendo XML…</div>}
                      <p className="muted" style={{ marginTop: '0.35rem' }}>
                        Sem XML a entrada operacional segue; não fica matéria-prima fiscal desta
                        nota.
                      </p>
                    </div>

                    {xmlPreview && xmlPreview.warnings.length > 0 && (
                      <div style={{ marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>
                        {xmlPreview.warnings.map((w) => {
                          const cls =
                            w.nivel === 'INFO'
                              ? 'alert alert-info'
                              : w.nivel === 'CRITICO'
                                ? 'alert alert-error'
                                : 'alert alert-warning';
                          return (
                            <div key={w.codigo + w.mensagem.slice(0, 24)} className={cls}>
                              <strong>
                                {w.nivel === 'INFO'
                                  ? 'Informação fiscal'
                                  : w.nivel === 'CRITICO'
                                    ? 'Bloqueio'
                                    : 'Atenção'}
                              </strong>
                              <div>{w.mensagem}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {xmlPreview?.nf.totais && (
                      <p className="muted" style={{ marginBottom: '1rem' }}>
                        Totais NF: vProd {xmlPreview.nf.totais.v_prod ?? '—'}
                        {xmlPreview.nf.totais.v_ipi && Number(xmlPreview.nf.totais.v_ipi) > 0
                          ? ` · IPI ${xmlPreview.nf.totais.v_ipi}`
                          : ''}
                        {xmlPreview.nf.totais.v_frete && Number(xmlPreview.nf.totais.v_frete) > 0
                          ? ` · Frete ${xmlPreview.nf.totais.v_frete}`
                          : ''}
                        {' · '}
                        vNF {xmlPreview.nf.valor_nf ?? xmlPreview.nf.totais.v_nf ?? '—'}
                      </p>
                    )}

                    {xmlPreview?.espelho && (
                      <EspelhoFiscalPanel
                        titulo="Espelho fiscal da NF (será guardado na confirmação)"
                        espelho={xmlPreview.espelho}
                      />
                    )}

                    {xmlPreview && (
                      <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Item NF</th>
                              <th>cProd / descrição</th>
                              <th>Qtde</th>
                              <th>Sugestão</th>
                              <th>Item da OC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {xmlPreview.linhas.map((linha) => (
                              <tr key={linha.n_item}>
                                <td>{linha.n_item}</td>
                                <td>
                                  <strong>{linha.c_prod}</strong>
                                  <div className="muted">{linha.x_prod}</div>
                                </td>
                                <td>
                                  {linha.q_com} {linha.u_com}
                                </td>
                                <td className="muted">
                                  {linha.match.confianca}
                                  <div>{linha.match.motivo}</div>
                                </td>
                                <td>
                                  <select
                                    value={lineMap[linha.n_item] ?? ''}
                                    onChange={(e) => {
                                      const next = {
                                        ...lineMap,
                                        [linha.n_item]: e.target.value,
                                      };
                                      setLineMap(next);
                                      rebuildQtdesFromMap(next, xmlPreview);
                                    }}
                                  >
                                    <option value="">— não receber —</option>
                                    {(oc.itens ?? []).map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.produto?.codigo} (pend.{' '}
                                        {(
                                          Number(item.qtde_pedida) - Number(item.qtde_recebida || 0)
                                        ).toFixed(4)}
                                        )
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Nº NF</label>
                        <input value={nfNumero} onChange={(e) => setNfNumero(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Chave NF-e (44)</label>
                        <input
                          value={nfChave}
                          onChange={(e) => setNfChave(e.target.value)}
                          maxLength={44}
                        />
                      </div>
                      <div className="form-group">
                        <label>Data NF</label>
                        <input
                          type="date"
                          value={nfData}
                          onChange={(e) => setNfData(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Vencimento{parcelas.length > 1 ? ' (1ª parcela)' : ' do título'}</label>
                        <input
                          type="date"
                          required={parcelas.length === 0}
                          value={vencimento}
                          onChange={(e) => {
                            setVencimento(e.target.value);
                            if (parcelas.length === 1) {
                              updateParcela(0, { vencimento: e.target.value });
                            }
                          }}
                        />
                      </div>
                      <div className="form-group span-2">
                        <label>Natureza gerencial</label>
                        <select
                          required
                          value={naturezaId}
                          onChange={(e) => setNaturezaId(e.target.value)}
                        >
                          <option value="">Selecione…</option>
                          {naturezas.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.codigo_exibicao || `NAT-${n.codigo}`} — {n.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-section" style={{ marginTop: '1rem' }}>
                      <div className="btn-row" style={{ marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0 }}>Parcelas a pagar</h3>
                        <button type="button" className="btn btn-secondary" onClick={addParcela}>
                          Adicionar parcela
                        </button>
                      </div>
                      <p className="muted" style={{ marginBottom: '0.75rem' }}>
                        Vêm do XML (duplicatas) quando houver. Sem parcelas, gera 1 título com o
                        vencimento acima e o valor dos itens da OC.
                        {parcelas.length > 0 && (
                          <>
                            {' '}
                            Soma: <strong>{formatCurrency(somaParcelas)}</strong>
                            {nfValor != null && <> · vNF: {formatCurrency(Number(nfValor))}</>}
                          </>
                        )}
                      </p>
                      {parcelas.length > 0 && (
                        <div className="table-wrap">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>nDup</th>
                                <th>Vencimento</th>
                                <th>Valor</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {parcelas.map((p, idx) => (
                                <tr key={`${p.n_dup ?? 'p'}-${idx}`}>
                                  <td>{idx + 1}</td>
                                  <td>
                                    <input
                                      value={p.n_dup ?? ''}
                                      onChange={(e) =>
                                        updateParcela(idx, { n_dup: e.target.value || null })
                                      }
                                      style={{ width: '5rem' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="date"
                                      required
                                      value={p.vencimento}
                                      onChange={(e) =>
                                        updateParcela(idx, { vencimento: e.target.value })
                                      }
                                    />
                                  </td>
                                  <td>
                                    <input
                                      inputMode="decimal"
                                      required
                                      value={p.valor}
                                      onChange={(e) =>
                                        updateParcela(idx, { valor: e.target.value })
                                      }
                                      style={{ width: '7rem' }}
                                    />
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      onClick={() => removeParcela(idx)}
                                    >
                                      Remover
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Qtde a receber (un. comercial)</h3>
                    <div className="form-grid">
                      {(oc.itens ?? []).map((item) => (
                        <div className="form-group span-2" key={item.id}>
                          <label>{item.produto?.codigo}</label>
                          <input
                            inputMode="decimal"
                            value={qtdes[item.id] ?? ''}
                            onChange={(e) =>
                              setQtdes({ ...qtdes, [item.id]: e.target.value })
                            }
                          />
                          {item.produto?.controla_lote && (
                            <div className="form-grid" style={{ marginTop: '0.5rem' }}>
                              <div className="form-group">
                                <label>Lote do fornecedor</label>
                                <input
                                  value={loteForms[item.id]?.codigo ?? ''}
                                  onChange={(e) =>
                                    setLoteForms({
                                      ...loteForms,
                                      [item.id]: {
                                        codigo: e.target.value,
                                        data_entrada: loteForms[item.id]?.data_entrada || nfData,
                                        data_validade: loteForms[item.id]?.data_validade || '',
                                        data_fabricacao: loteForms[item.id]?.data_fabricacao || '',
                                      },
                                    })
                                  }
                                  required={Number(qtdes[item.id] || 0) > 0}
                                />
                              </div>
                              <div className="form-group">
                                <label>Data de entrada</label>
                                <input
                                  type="date"
                                  value={loteForms[item.id]?.data_entrada || nfData}
                                  onChange={(e) =>
                                    setLoteForms({
                                      ...loteForms,
                                      [item.id]: {
                                        codigo: loteForms[item.id]?.codigo || '',
                                        data_entrada: e.target.value,
                                        data_validade: loteForms[item.id]?.data_validade || '',
                                        data_fabricacao: loteForms[item.id]?.data_fabricacao || '',
                                      },
                                    })
                                  }
                                />
                              </div>
                              {item.produto.controla_validade && (
                                <div className="form-group">
                                  <label>Vencimento</label>
                                  <input
                                    type="date"
                                    value={loteForms[item.id]?.data_validade ?? ''}
                                    onChange={(e) =>
                                      setLoteForms({
                                        ...loteForms,
                                        [item.id]: {
                                          codigo: loteForms[item.id]?.codigo || '',
                                          data_entrada:
                                            loteForms[item.id]?.data_entrada || nfData,
                                          data_validade: e.target.value,
                                          data_fabricacao:
                                            loteForms[item.id]?.data_fabricacao || '',
                                        },
                                      })
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={receiving}>
                  {receiving ? 'Conferindo…' : 'Confirmar entrada no estoque'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </>
  );
}
