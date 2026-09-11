import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { onAbrirFichaClick } from '../lib/fichaNav';
import {
  clampDecimalScale,
  comprimentoFromAreaLargura,
  DECIMAL_SCALE,
  formatCnpjCpf,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
} from '../lib/format';
import { amarrarDimensoesVolumes } from '../lib/nfeExactDimensoes';

function formatEndereco(parts: {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
}): string | null {
  const line1 = [parts.logradouro, parts.numero ? `nº ${parts.numero}` : null, parts.complemento]
    .filter(Boolean)
    .join(', ');
  const line2 = [parts.bairro, [parts.municipio, parts.uf].filter(Boolean).join('/'), parts.cep]
    .filter(Boolean)
    .join(' · ');
  const full = [line1, line2].filter(Boolean).join(' · ');
  return full || null;
}

type VolumeFormRow = {
  codigo: string;
  qtde: string;
  data_entrada: string;
  data_validade: string;
  data_fabricacao: string;
  largura_mm: string;
  comprimento_m: string;
};

function volumesFromLinhasMapped(
  map: Record<number, string>,
  preview: ReceberXmlPreview,
  dataEntrada: string,
): Record<number, VolumeFormRow[]> {
  const next: Record<number, VolumeFormRow[]> = {};
  for (const linha of preview.linhas) {
    const ocItemId = Number(map[linha.n_item] || 0);
    if (!ocItemId) continue;
    const rastros = linha.rastros ?? [];
    if (rastros.length === 0) continue;

    const seenNoDet: Record<string, number> = {};
    const volumesDet: VolumeFormRow[] = [];
    for (const rastro of rastros) {
      const codigo = (rastro.codigo || '').trim();
      if (!codigo) continue;
      let qtdeRastro = rastro.qtde || '0';
      if (Number(qtdeRastro) <= 0) qtdeRastro = linha.q_com;
      if (seenNoDet[codigo] !== undefined) {
        const idx = seenNoDet[codigo];
        const sum = (Number(volumesDet[idx].qtde) + Number(qtdeRastro)).toFixed(4);
        volumesDet[idx] = {
          ...volumesDet[idx],
          qtde: clampDecimalScale(sum, DECIMAL_SCALE.qty),
        };
        continue;
      }
      seenNoDet[codigo] = volumesDet.length;
      const qtde = clampDecimalScale(qtdeRastro, DECIMAL_SCALE.qty);
      volumesDet.push({
        codigo,
        qtde,
        data_entrada: dataEntrada,
        data_validade: rastro.data_validade || '',
        data_fabricacao: rastro.data_fabricacao || '',
        largura_mm: '',
        comprimento_m: '',
      });
    }
    if (volumesDet.length === 0) continue;
    const comDim = amarrarDimensoesVolumes(
      volumesDet,
      linha.inf_ad_prod,
      linha.x_prod,
      linha.c_prod,
    );
    next[ocItemId] = [...(next[ocItemId] ?? []), ...comDim];
  }
  return next;
}

function somaVolumes(vols: VolumeFormRow[] | undefined): number {
  if (!vols?.length) return 0;
  return vols.reduce((acc, v) => acc + Number(v.qtde || 0), 0);
}

function emailMotivoLabel(motivo: string | null | undefined): string {
  if (motivo === 'sem_email_cadastro') return 'fornecedor sem e-mail no cadastro';
  if (motivo === 'desligado') return 'envio de e-mail desligado na instalação';
  if (motivo === 'falha_envio') return 'falha no envio (OC formalizada mesmo assim)';
  if (motivo === 'sem_fornecedor') return 'fornecedor ausente';
  return motivo || 'não enviado';
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  if (err.details) {
    const msgs = Object.values(err.details).flat().filter(Boolean);
    const unique = [...new Set(msgs)];
    if (unique.length === 1) return unique[0]!;
    if (unique.length > 1) {
      return `${unique[0]} (+${unique.length - 1} validações).`;
    }
  }
  return err.message || fallback;
}

function idDestLabel(id: string | null | undefined): string {
  if (id === '1') return 'Interna';
  if (id === '2') return 'Interestadual';
  if (id === '3') return 'Exterior';
  return id || '—';
}

function dash(value: string | null | undefined): string {
  return value && value !== '' ? value : '—';
}

function modFreteLabel(mod: string | null | undefined): string {
  if (mod === '0') return 'CIF (emitente)';
  if (mod === '1') return 'FOB (destinatário)';
  if (mod === '2') return 'Terceiros';
  if (mod === '3') return 'Próprio remetente';
  if (mod === '4') return 'Próprio destinatário';
  if (mod === '9') return 'Sem frete';
  return mod || '—';
}

function tPagLabel(t: string | null | undefined): string {
  const map: Record<string, string> = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão crédito',
    '04': 'Cartão débito',
    '05': 'Crédito loja',
    '15': 'Boleto',
    '16': 'Depósito',
    '17': 'PIX',
    '18': 'Transferência',
    '90': 'Sem pagamento',
    '99': 'Outros',
  };
  if (!t) return '—';
  return map[t] ? `${map[t]} (${t})` : t;
}

function EspelhoFiscalPanel({
  espelho,
  titulo,
}: {
  espelho: NfeEntradaEspelho;
  titulo: string;
}) {
  const c = espelho.complementos;
  const resp = c?.resp_tec;
  const infAdic = c?.inf_adic;
  const transp = c?.transporte;
  const fat = c?.fat;
  const pag = c?.pag;
  const destComp = c?.dest;
  const ideExtra = c?.ide_extra;
  const vols = transp?.vol ?? [];
  const detPag = pag?.det_pag ?? [];

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
      {destComp?.nome || destComp?.email ? (
        <p style={{ marginBottom: '0.5rem' }}>
          Destinatário {dash(destComp?.nome)}
          {destComp?.email ? ` · ${destComp.email}` : ''}
        </p>
      ) : null}
      {ideExtra?.d_prev_entrega || ideExtra?.dh_sai_ent ? (
        <p style={{ marginBottom: '0.5rem' }}>
          {ideExtra.d_prev_entrega ? `Prev. entrega ${ideExtra.d_prev_entrega}` : null}
          {ideExtra.d_prev_entrega && ideExtra.dh_sai_ent ? ' · ' : null}
          {ideExtra.dh_sai_ent ? `Saída/entrada ${ideExtra.dh_sai_ent}` : null}
        </p>
      ) : null}
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
      {(espelho.totais.v_ibs || espelho.totais.v_cbs || espelho.totais.v_bc_ibs_cbs) && (
        <p style={{ marginBottom: '0.75rem' }}>
          IBS/CBS BC {dash(espelho.totais.v_bc_ibs_cbs)}
          {' · IBS '}
          {dash(espelho.totais.v_ibs)}
          {' · CBS '}
          {dash(espelho.totais.v_cbs)}
          {espelho.totais.v_ibs_uf ? ` · IBS UF ${espelho.totais.v_ibs_uf}` : ''}
          {espelho.totais.v_ibs_mun ? ` · IBS Mun ${espelho.totais.v_ibs_mun}` : ''}
        </p>
      )}
      {resp && (resp.x_contato || resp.cnpj || resp.email || resp.fone) ? (
        <p style={{ marginBottom: '0.5rem' }}>
          Resp. técnico {dash(resp.x_contato)}
          {resp.cnpj ? ` · ${formatCnpjCpf(resp.cnpj)}` : ''}
          {resp.fone ? ` · ${formatPhone(resp.fone) || resp.fone}` : ''}
          {resp.email ? ` · ${resp.email}` : ''}
        </p>
      ) : null}
      {transp && (transp.mod_frete || transp.transporta || vols.length > 0 || transp.veiculo) ? (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ margin: '0 0 0.35rem' }}>
            <strong>Transporte</strong>
            {' · Frete '}
            {modFreteLabel(transp.mod_frete)}
          </p>
          {transp.transporta ? (
            <p style={{ margin: '0 0 0.35rem' }}>
              Transportadora {dash(transp.transporta.nome)}
              {transp.transporta.cnpj
                ? ` · ${formatCnpjCpf(transp.transporta.cnpj)}`
                : transp.transporta.cpf
                  ? ` · ${formatCnpjCpf(transp.transporta.cpf)}`
                  : ''}
              {transp.transporta.ie ? ` · IE ${transp.transporta.ie}` : ''}
              {transp.transporta.municipio || transp.transporta.uf
                ? ` · ${[transp.transporta.municipio, transp.transporta.uf].filter(Boolean).join('/')}`
                : ''}
              {transp.transporta.endereco ? ` · ${transp.transporta.endereco}` : ''}
            </p>
          ) : null}
          {transp.veiculo?.placa ? (
            <p style={{ margin: '0 0 0.35rem' }}>
              Veículo {transp.veiculo.placa}
              {transp.veiculo.uf ? `/${transp.veiculo.uf}` : ''}
              {transp.veiculo.rntc ? ` · RNTC ${transp.veiculo.rntc}` : ''}
            </p>
          ) : null}
          {vols.length > 0 ? (
            <div className="table-wrap" style={{ marginTop: '0.35rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Volumes (vol)</th>
                    <th>Espécie</th>
                    <th>Marca</th>
                    <th>Nº vol.</th>
                    <th className="num">Peso L</th>
                    <th className="num">Peso B</th>
                    <th>Lacres</th>
                  </tr>
                </thead>
                <tbody>
                  {vols.map((v, idx) => (
                    <tr key={`vol-${idx}-${v.n_vol ?? ''}-${v.esp ?? ''}`}>
                      <td>{dash(v.q_vol)}</td>
                      <td>{dash(v.esp)}</td>
                      <td>{dash(v.marca)}</td>
                      <td>{dash(v.n_vol)}</td>
                      <td className="num">{dash(v.peso_l)}</td>
                      <td className="num">{dash(v.peso_b)}</td>
                      <td>
                        {(v.lacres ?? []).map((l) => l.n_lacre).filter(Boolean).join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
      {fat || detPag.length > 0 ? (
        <p style={{ marginBottom: '0.5rem' }}>
          {fat?.n_fat ? `Fatura ${fat.n_fat}` : null}
          {fat?.v_liq ? `${fat?.n_fat ? ' · ' : ''}líq. ${fat.v_liq}` : null}
          {detPag[0]
            ? `${fat ? ' · ' : ''}Pag. ${tPagLabel(detPag[0].t_pag)}${
                detPag[0].ind_pag === '0' ? ' à vista' : detPag[0].ind_pag === '1' ? ' a prazo' : ''
              }${detPag[0].v_pag ? ` ${detPag[0].v_pag}` : ''}`
            : null}
        </p>
      ) : null}
      {infAdic?.inf_cpl || infAdic?.inf_ad_fisco ? (
        <div style={{ marginBottom: '0.75rem' }}>
          {infAdic.inf_cpl ? (
            <p style={{ margin: '0 0 0.35rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <span className="muted">Inf. complementares: </span>
              {infAdic.inf_cpl}
            </p>
          ) : null}
          {infAdic.inf_ad_fisco ? (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <span className="muted">Inf. fisco: </span>
              {infAdic.inf_ad_fisco}
            </p>
          ) : null}
        </div>
      ) : null}
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
              <th>CST IBS/CBS</th>
              <th>IBS</th>
              <th>CBS</th>
              <th>xPed</th>
              <th>FCI</th>
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
                <td>
                  {dash(item.cst_ibs_cbs)}
                  {item.c_class_trib ? ` / ${item.c_class_trib}` : ''}
                </td>
                <td>{dash(item.v_ibs)}</td>
                <td>{dash(item.v_cbs)}</td>
                <td>{dash(item.x_ped)}</td>
                <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                  {dash(item.n_fci)}
                </td>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const dfeAutoRef = useRef<string | null>(null);
  const [oc, setOc] = useState<OrdemCompra | null>(null);
  const [naturezas, setNaturezas] = useState<NaturezaGerencial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [xmlLoading, setXmlLoading] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<ReceberXmlPreview | null>(null);
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [lineMap, setLineMap] = useState<Record<number, string>>({});

  const [lastMovimentoId, setLastMovimentoId] = useState<number | null>(null);

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
  const [volumeForms, setVolumeForms] = useState<Record<number, VolumeFormRow[]>>({});
  const [enderecos, setEnderecos] = useState<Array<{ id: number; codigo: string }>>([]);

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
    void api
      .get<{ data: Array<{ id: number; codigo: string }> }>('/estoque/enderecos')
      .then((res) => setEnderecos(res.data.map((e) => ({ id: e.id, codigo: e.codigo }))))
      .catch(() => setEnderecos([]));
  }, [id]);

  const canWrite = hasPermission('compras.escrever');
  const editavel = !!oc?.editavel || oc?.status === 'RASCUNHO';
  const canReceive =
    !!oc &&
    hasPermission('estoque.escrever') &&
    (oc.status === 'ABERTA' || oc.status === 'PARCIAL');
  const canCancel =
    !!oc &&
    canWrite &&
    (oc.status === 'RASCUNHO' || oc.status === 'ABERTA');
  const canReenviarEmail =
    !!oc && canWrite && (oc.status === 'ABERTA' || oc.status === 'PARCIAL');

  const handleEnviar = async (reenviar = false) => {
    if (!oc) return;
    const confirmMsg = reenviar
      ? `Reenviar a OC ${oc.codigo} por e-mail ao fornecedor?`
      : `Enviar a OC ${oc.codigo} ao fornecedor? Após o envio, a OC deixa de ser editável e passa a contar em trânsito.`;
    if (!window.confirm(confirmMsg)) return;
    setSending(true);
    setError(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemCompra }>(`/ordens-compra/${oc.id}/enviar`, {
        reenviar_email: reenviar,
      });
      setOc(res.data);
      if (res.data.email_enviado) {
        setMsg(
          reenviar
            ? `E-mail reenviado para ${res.data.email_destino}.`
            : `OC enviada. E-mail disparado para ${res.data.email_destino}.`,
        );
      } else {
        setMsg(
          reenviar
            ? `Reenvio não concluído (${emailMotivoLabel(res.data.email_motivo)}).`
            : `OC formalizada (enviada). E-mail não disparado: ${emailMotivoLabel(res.data.email_motivo)}.`,
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao enviar OC.');
    } finally {
      setSending(false);
    }
  };

  const handleExcluir = async () => {
    if (!oc) return;
    if (
      !window.confirm(
        `Excluir o rascunho ${oc.codigo}? A OC será cancelada e removida da lista (histórico preservado).`,
      )
    ) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await api.delete(`/ordens-compra/${oc.id}`);
      navigate('/compras/ordens');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao excluir OC.');
      setActing(false);
    }
  };

  const handleCancelar = async () => {
    if (!oc) return;
    if (!window.confirm(`Cancelar a OC ${oc.codigo}?`)) return;
    setActing(true);
    setError(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemCompra }>(`/ordens-compra/${oc.id}/cancelar`);
      setOc(res.data);
      setMsg('OC cancelada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cancelar OC.');
    } finally {
      setActing(false);
    }
  };

  useEffect(() => {
    const dfeId = searchParams.get('dfe');
    if (!dfeId || !oc || !canReceive) return;
    if (dfeAutoRef.current === dfeId) return;
    dfeAutoRef.current = dfeId;
    void (async () => {
      setError(null);
      setMsg(null);
      setXmlLoading(true);
      try {
        const res = await api.post<{
          data: { preview: ReceberXmlPreview; xml: string; documento: { id: number } };
        }>(`/ordens-compra/${oc.id}/receber/xml/preview-dfe`, {
          dfe_documento_id: Number(dfeId),
        });
        setXmlContent(res.data.xml);
        applyXmlPreview(res.data.preview);
        setMsg('XML da caixa DF-e carregado — confira o de-para e confirme. Nada foi lançado ainda.');
        const next = new URLSearchParams(searchParams);
        next.delete('dfe');
        setSearchParams(next, { replace: true });
      } catch (err) {
        setError(err instanceof ApiError ? apiErrorMessage(err, 'Falha ao carregar XML da caixa DF-e.') : 'Falha ao carregar XML da caixa DF-e.');
      } finally {
        setXmlLoading(false);
      }
    })();
    // applyXmlPreview is stable enough for this one-shot load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oc, canReceive, searchParams, setSearchParams]);

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
      nextQtdes[item.ordem_compra_item_id] = clampDecimalScale(
        item.qtde_recebida,
        DECIMAL_SCALE.qty,
      );
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

    setVolumeForms(() => {
      const next: typeof volumeForms = {};
      for (const item of sug.itens) {
        const dataEntrada = item.lote_data_entrada || sug.nf_data || '';
        if (item.lotes && item.lotes.length > 0) {
          next[item.ordem_compra_item_id] = item.lotes.map((l) => {
            const largura = clampDecimalScale(l.largura_mm || '', DECIMAL_SCALE.dim);
            const comprimento =
              clampDecimalScale(l.comprimento_m || '', DECIMAL_SCALE.dim) ||
              comprimentoFromAreaLargura(l.qtde, largura) ||
              '';
            return {
              codigo: l.codigo,
              qtde: clampDecimalScale(l.qtde, DECIMAL_SCALE.qty),
              data_entrada: l.data_entrada || dataEntrada,
              data_validade: l.data_validade || '',
              data_fabricacao: l.data_fabricacao || '',
              largura_mm: largura,
              comprimento_m: comprimento,
            };
          });
        } else if (item.lote_codigo) {
          next[item.ordem_compra_item_id] = [
            {
              codigo: item.lote_codigo,
              qtde: clampDecimalScale(item.qtde_recebida, DECIMAL_SCALE.qty),
              data_entrada: dataEntrada,
              data_validade: item.lote_data_validade || '',
              data_fabricacao: item.lote_data_fabricacao || '',
              largura_mm: '',
              comprimento_m: '',
            },
          ];
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

  /** Remap de-para: recompõe qtde comercial (Σ qCom) e volumes (rastros) juntos. */
  const rebuildReceberFromMap = (map: Record<number, string>, preview: ReceberXmlPreview) => {
    const nextQtdes: Record<number, string> = {};
    for (const item of oc?.itens ?? []) {
      nextQtdes[item.id] = '0';
    }
    for (const linha of preview.linhas) {
      const ocItemId = Number(map[linha.n_item] || 0);
      if (!ocItemId) continue;
      const prev = nextQtdes[ocItemId] || '0';
      nextQtdes[ocItemId] = (Number(prev) + Number(linha.q_com)).toFixed(4);
    }
    setQtdes(nextQtdes);

    const dataEntrada = preview.sugerido_receber.nf_data || nfData || '';
    const fromXml = volumesFromLinhasMapped(map, preview, dataEntrada);
    setVolumeForms((prev) => {
      const next: Record<number, VolumeFormRow[]> = { ...prev };
      for (const item of oc?.itens ?? []) {
        if (!item.produto?.controla_lote) continue;
        next[item.id] = fromXml[item.id] ?? [];
      }
      return next;
    });
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
            qtde_recebida: clampDecimalScale(qtdes[item.id] || '0', DECIMAL_SCALE.qty) || '0',
          };
          if (item.produto?.controla_lote) {
            const volumes = volumeForms[item.id];
            if (volumes && volumes.length > 0) {
              row.lotes = volumes.map((v) => ({
                codigo: v.codigo,
                qtde: clampDecimalScale(v.qtde, DECIMAL_SCALE.qty),
                data_entrada: v.data_entrada || nfData || null,
                data_validade: v.data_validade || null,
                data_fabricacao: v.data_fabricacao || null,
                largura_mm: clampDecimalScale(v.largura_mm, DECIMAL_SCALE.dim) || null,
                comprimento_m: clampDecimalScale(v.comprimento_m, DECIMAL_SCALE.dim) || null,
              }));
            } else {
              const lote = loteForms[item.id];
              row.lote_codigo = lote?.codigo || '';
              row.lote_data_entrada = lote?.data_entrada || nfData || null;
              row.lote_data_validade = lote?.data_validade || null;
              row.lote_data_fabricacao = lote?.data_fabricacao || null;
            }
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
        nf_valor:
          nfValor != null && nfValor !== ''
            ? clampDecimalScale(nfValor, DECIMAL_SCALE.money)
            : null,
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
          valor: clampDecimalScale(p.valor, DECIMAL_SCALE.money),
          parcela: i + 1,
        }));
        payload.vencimento = parcelas[0]?.vencimento || vencimento || null;
      } else {
        payload.vencimento = vencimento;
      }

      await api.post<{
        data: {
          id: number;
          nfe_entrada?: { numero: string | null; xml_armazenado?: boolean } | null;
        };
      }>(`/ordens-compra/${oc.id}/receber`, payload).then((res) => {
        const nfe = res.data.nfe_entrada;
        setLastMovimentoId(res.data.id);
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
      setError(apiErrorMessage(err, 'Falha no recebimento.'));
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
            ? `${oc.fornecedor?.razao_social ?? 'Ordem de compra'}${
                oc.status === 'RASCUNHO'
                  ? ' · rascunho — edite e envie ao fornecedor'
                  : oc.enviado_em
                    ? ` · enviada em ${formatDateTime(oc.enviado_em)}`
                    : ''
              }`
            : 'Carregando…'
        }
        actions={
          <div className="btn-row">
            <Link to="/compras/ordens" className="btn btn-secondary">
              Voltar
            </Link>
            {oc ? (
              <a
                href={`/compras/ordens/${oc.id}/ficha`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/compras/ordens/${oc.id}/ficha`)}
              >
                Imprimir ficha
              </a>
            ) : null}
            {canWrite && editavel && (
              <>
                <Link to={`/compras/ordens/${oc!.id}/editar`} className="btn btn-secondary">
                  Editar
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={acting}
                  onClick={() => void handleExcluir()}
                >
                  Excluir
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={sending}
                  onClick={() => void handleEnviar(false)}
                >
                  {sending ? 'Enviando…' : 'Enviar ao fornecedor'}
                </button>
              </>
            )}
            {canReenviarEmail && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={sending}
                onClick={() => void handleEnviar(true)}
              >
                {sending ? 'Enviando…' : 'Reenviar e-mail'}
              </button>
            )}
            {canCancel && !editavel && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={acting}
                onClick={() => void handleCancelar()}
              >
                Cancelar OC
              </button>
            )}
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
      {msg && (
        <div className="alert alert-success">
          <div>{msg}</div>
          {lastMovimentoId != null && (
            <div className="btn-row" style={{ marginTop: '0.75rem' }}>
              <Link
                className="btn btn-primary"
                to={`/estoque/movimentos/${lastMovimentoId}/ficha-entrada`}
              >
                Ficha de entrada física (QR)
              </Link>
              <Link className="btn btn-secondary" to="/estoque/guardar">
                Guardar no vão
              </Link>
            </div>
          )}
        </div>
      )}

      {loading || !oc ? (
        <div className="loading">Carregando…</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
                <StatusPill status={ocStatusLabel(oc.status)} />
                {oc.urgente && <span className="muted">· urgente</span>}
                <span>Mercadoria {formatCurrency(oc.valor_total)}</span>
                {Number(oc.valor_ipi ?? 0) > 0 && (
                  <span className="muted">· IPI {formatCurrency(oc.valor_ipi)}</span>
                )}
                {Number(oc.valor_icms ?? 0) > 0 && (
                  <span className="muted">· ICMS {formatCurrency(oc.valor_icms)}</span>
                )}
                {Number(oc.valor_frete ?? 0) > 0 && (
                  <span className="muted">· Frete {formatCurrency(oc.valor_frete)}</span>
                )}
                {(Number(oc.valor_ipi ?? 0) > 0 || Number(oc.valor_frete ?? 0) > 0) && (
                  <span>
                    · Previsto{' '}
                    {formatCurrency(oc.valor_previsto ?? oc.valor_total)}
                  </span>
                )}
                {oc.previsao_entrega && (
                  <span className="muted">Previsão {formatDate(oc.previsao_entrega)}</span>
                )}
                {oc.origem && <span className="muted">· {oc.origem.toLowerCase()}</span>}
              </div>

              {oc.status === 'RASCUNHO' && (
                <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                  Rascunho: você pode editar ou excluir. Ao <strong>enviar ao fornecedor</strong>, a
                  OC fica travada, conta em trânsito na reposição e o sistema tenta o e-mail do
                  cadastro do PAR.
                </div>
              )}

              <div className="form-grid" style={{ marginBottom: '1rem' }}>
                <div className="form-group span-2">
                  <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>Fornecedor</h3>
                  <div>
                    <strong>
                      {oc.fornecedor?.codigo} —{' '}
                      {oc.fornecedor?.nome_fantasia || oc.fornecedor?.razao_social || '—'}
                    </strong>
                  </div>
                  {oc.fornecedor?.razao_social && oc.fornecedor?.nome_fantasia && (
                    <div className="muted">{oc.fornecedor.razao_social}</div>
                  )}
                  {oc.fornecedor?.cnpj_cpf && (
                    <div className="muted">CNPJ/CPF {formatCnpjCpf(oc.fornecedor.cnpj_cpf)}</div>
                  )}
                  {formatEndereco(oc.fornecedor ?? {}) && (
                    <div className="muted">{formatEndereco(oc.fornecedor ?? {})}</div>
                  )}
                  <div className="muted">
                    {[
                      oc.fornecedor?.email,
                      oc.fornecedor?.telefone
                        ? formatPhone(oc.fornecedor.telefone)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Sem e-mail/telefone no cadastro'}
                  </div>
                </div>
                <div className="form-group span-2">
                  <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>Comprador (EMP)</h3>
                  <div>
                    <strong>
                      {oc.empresa?.nome_fantasia || oc.empresa?.razao_social || '—'}
                    </strong>
                  </div>
                  {oc.empresa?.cnpj && (
                    <div className="muted">CNPJ {formatCnpjCpf(oc.empresa.cnpj)}</div>
                  )}
                  {formatEndereco(oc.empresa ?? {}) && (
                    <div className="muted">{formatEndereco(oc.empresa ?? {})}</div>
                  )}
                  <div className="muted">
                    {[oc.empresa?.email, oc.empresa?.telefone ? formatPhone(oc.empresa.telefone) : null]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                </div>
                <div className="form-group">
                  <label>Condição de pagamento</label>
                  <div>{oc.condicao_pagamento || '—'}</div>
                </div>
                <div className="form-group">
                  <label>Previsão de entrega</label>
                  <div>{formatDate(oc.previsao_entrega)}</div>
                </div>
                <div className="form-group">
                  <label>Enviada em</label>
                  <div>{oc.enviado_em ? formatDateTime(oc.enviado_em) : '—'}</div>
                </div>
                <div className="form-group">
                  <label>Criada</label>
                  <div>
                    {oc.created_at ? formatDateTime(oc.created_at) : '—'}
                    {oc.criado_por?.name ? ` · ${oc.criado_por.name}` : ''}
                  </div>
                </div>
              </div>

              {oc.observacao && (
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>Observação</h3>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{oc.observacao}</p>
                </div>
              )}

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Produto</th>
                      <th>Qtde pedida</th>
                      <th>Recebida</th>
                      <th>Un.</th>
                      <th>Unit.</th>
                      <th>Mercadoria</th>
                      <th>IPI</th>
                      <th>ICMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(oc.itens ?? []).map((item, idx) => (
                      <tr key={item.id}>
                        <td>{item.ordem ?? idx + 1}</td>
                        <td>
                          <strong>{item.produto?.codigo}</strong> —{' '}
                          {item.produto?.descricao_comercial || item.produto?.descricao_fiscal}
                          {item.produto?.familia && (
                            <div className="muted">{item.produto.familia}</div>
                          )}
                        </td>
                        <td>{item.qtde_pedida}</td>
                        <td>{item.qtde_recebida}</td>
                        <td>{item.unidade}</td>
                        <td>{formatCurrency(item.valor_unitario)}</td>
                        <td>{formatCurrency(item.valor_total)}</td>
                        <td>
                          {formatCurrency(item.valor_ipi ?? '0')}
                          {item.aliq_ipi != null && Number(item.aliq_ipi) > 0 ? (
                            <div className="muted">{item.aliq_ipi}%</div>
                          ) : null}
                        </td>
                        <td>
                          {formatCurrency(item.valor_icms ?? '0')}
                          {item.aliq_icms != null && Number(item.aliq_icms) > 0 ? (
                            <div className="muted">{item.aliq_icms}%</div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'right' }}>
                        <strong>Mercadoria</strong>
                      </td>
                      <td>
                        <strong>{formatCurrency(oc.valor_total)}</strong>
                      </td>
                      <td>
                        <strong>{formatCurrency(oc.valor_ipi ?? '0')}</strong>
                      </td>
                      <td>
                        <strong>{formatCurrency(oc.valor_icms ?? '0')}</strong>
                      </td>
                    </tr>
                    {Number(oc.valor_frete ?? 0) > 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'right' }}>
                          Frete
                        </td>
                        <td>{formatCurrency(oc.valor_frete)}</td>
                      </tr>
                    ) : null}
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'right' }}>
                        <strong>Total previsto (mercadoria + IPI + frete)</strong>
                      </td>
                      <td>
                        <strong>{formatCurrency(oc.valor_previsto ?? oc.valor_total)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="muted" style={{ marginTop: '0.5rem' }}>
                ICMS é destaque estimado. Custo de estoque na entrada usa só a mercadoria; a NF
                prevalece no fiscal.
              </p>
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
                      Vários itens da NF do mesmo SKU somam na linha da OC (m²/un. comercial); cada
                      bobina entra como volume abaixo — não como linha nova da OC.
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
                              <th>Pedido / FCI</th>
                              <th>Qtde</th>
                              <th>Volumes</th>
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
                                  {linha.x_ped ? (
                                    <div>
                                      <strong>xPed</strong> {linha.x_ped}
                                      {linha.n_item_ped ? ` · #${linha.n_item_ped}` : ''}
                                    </div>
                                  ) : (
                                    <span className="muted">—</span>
                                  )}
                                  {linha.n_fci ? (
                                    <div
                                      className="muted"
                                      style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}
                                    >
                                      FCI {linha.n_fci}
                                    </div>
                                  ) : null}
                                </td>
                                <td>
                                  {linha.q_com} {linha.u_com}
                                </td>
                                <td className="muted">
                                  {(linha.rastros?.length ?? 0) > 0
                                    ? `${linha.rastros!.length} rastro${linha.rastros!.length === 1 ? '' : 's'}`
                                    : '—'}
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
                                      rebuildReceberFromMap(next, xmlPreview);
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
                        <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                          Vários itens da NF podem apontar para a mesma linha da OC: a qtde comercial
                          e os volumes são recompostos automaticamente ao mudar o de-para.
                        </p>
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
                    <p className="muted" style={{ marginBottom: '0.75rem' }}>
                      Quantidade na língua da OC (ex. m²). Bobinas físicas = volumes abaixo — a soma
                      dos volumes deve fechar com esta qtde.
                    </p>
                    <div className="oc-receber-itens">
                      {(oc.itens ?? []).map((item) => {
                        const vols = volumeForms[item.id];
                        const somaVol = somaVolumes(vols);
                        const qtdeRec = Number(qtdes[item.id] || 0);
                        const temVolumes = (vols?.length ?? 0) > 0;
                        const somaOk =
                          temVolumes && qtdeRec > 0
                            ? Math.abs(somaVol - qtdeRec) < 0.00015
                            : null;
                        return (
                        <div className="oc-receber-item" key={item.id}>
                          <div className="oc-receber-item__head">
                            <div className="form-group oc-receber-item__qtde">
                              <label>
                                {item.produto?.codigo}
                                {item.produto?.descricao_comercial || item.produto?.descricao_fiscal
                                  ? ` — ${item.produto?.descricao_comercial || item.produto?.descricao_fiscal}`
                                  : ''}
                              </label>
                              <input
                                inputMode="decimal"
                                value={qtdes[item.id] ?? ''}
                                onChange={(e) =>
                                  setQtdes({ ...qtdes, [item.id]: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          {item.produto?.controla_lote && (
                            <div className="oc-volumes-panel">
                              <div className="oc-volumes-panel__bar">
                                <strong>
                                  Volumes / lotes
                                  {(volumeForms[item.id]?.length ?? 0) > 0
                                    ? ` (${volumeForms[item.id].length})`
                                    : ''}
                                </strong>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() =>
                                    setVolumeForms({
                                      ...volumeForms,
                                      [item.id]: [
                                        ...(volumeForms[item.id] ?? []),
                                        {
                                          codigo: '',
                                          qtde: '',
                                          data_entrada: nfData,
                                          data_validade: '',
                                          data_fabricacao: '',
                                          largura_mm: '',
                                          comprimento_m: '',
                                        },
                                      ],
                                    })
                                  }
                                >
                                  + volume
                                </button>
                              </div>
                              {(volumeForms[item.id]?.length ?? 0) === 0 ? (
                                <div className="form-grid oc-volumes-panel__single">
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
                              ) : (
                                <>
                                  <div className="oc-volumes-scroll">
                                    <table className="oc-volumes-table">
                                      <thead>
                                        <tr>
                                          <th className="col-idx">#</th>
                                          <th className="col-lote">Lote / nLote</th>
                                          <th className="col-num">Qtde</th>
                                          <th className="col-num">Largura mm</th>
                                          <th className="col-num">Comp. m</th>
                                          <th className="col-acoes" />
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {volumeForms[item.id].map((vol, vIdx) => (
                                          <tr key={`${item.id}-vol-${vIdx}`}>
                                            <td className="col-idx">{vIdx + 1}</td>
                                            <td className="col-lote">
                                              <input
                                                value={vol.codigo}
                                                required={Number(qtdes[item.id] || 0) > 0}
                                                onChange={(e) => {
                                                  const next = [...volumeForms[item.id]];
                                                  next[vIdx] = {
                                                    ...next[vIdx],
                                                    codigo: e.target.value,
                                                  };
                                                  setVolumeForms({
                                                    ...volumeForms,
                                                    [item.id]: next,
                                                  });
                                                }}
                                              />
                                            </td>
                                            <td className="col-num">
                                              <input
                                                inputMode="decimal"
                                                value={vol.qtde}
                                                required={Number(qtdes[item.id] || 0) > 0}
                                                onChange={(e) => {
                                                  const next = [...volumeForms[item.id]];
                                                  const qtde = e.target.value;
                                                  let comprimento = next[vIdx].comprimento_m;
                                                  if (next[vIdx].largura_mm.trim()) {
                                                    const derived = comprimentoFromAreaLargura(
                                                      qtde,
                                                      next[vIdx].largura_mm,
                                                    );
                                                    if (derived) comprimento = derived;
                                                  }
                                                  next[vIdx] = {
                                                    ...next[vIdx],
                                                    qtde,
                                                    comprimento_m: comprimento,
                                                  };
                                                  setVolumeForms({
                                                    ...volumeForms,
                                                    [item.id]: next,
                                                  });
                                                }}
                                              />
                                            </td>
                                            <td className="col-num">
                                              <input
                                                inputMode="decimal"
                                                placeholder="210"
                                                value={vol.largura_mm}
                                                onChange={(e) => {
                                                  const next = [...volumeForms[item.id]];
                                                  const largura = e.target.value;
                                                  const derived = comprimentoFromAreaLargura(
                                                    next[vIdx].qtde,
                                                    largura,
                                                  );
                                                  next[vIdx] = {
                                                    ...next[vIdx],
                                                    largura_mm: largura,
                                                    comprimento_m:
                                                      derived || next[vIdx].comprimento_m,
                                                  };
                                                  setVolumeForms({
                                                    ...volumeForms,
                                                    [item.id]: next,
                                                  });
                                                }}
                                              />
                                            </td>
                                            <td className="col-num">
                                              <input
                                                inputMode="decimal"
                                                value={vol.comprimento_m}
                                                onChange={(e) => {
                                                  const next = [...volumeForms[item.id]];
                                                  next[vIdx] = {
                                                    ...next[vIdx],
                                                    comprimento_m: e.target.value,
                                                  };
                                                  setVolumeForms({
                                                    ...volumeForms,
                                                    [item.id]: next,
                                                  });
                                                }}
                                              />
                                            </td>
                                            <td className="col-acoes">
                                              <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                  const next = volumeForms[item.id].filter(
                                                    (_, i) => i !== vIdx,
                                                  );
                                                  setVolumeForms({
                                                    ...volumeForms,
                                                    [item.id]: next,
                                                  });
                                                }}
                                              >
                                                Remover
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <p
                                    className={
                                      somaOk === false
                                        ? 'form-hint oc-volumes-panel__hint oc-volumes-panel__hint--warn'
                                        : 'form-hint oc-volumes-panel__hint'
                                    }
                                  >
                                    Σ volumes {somaVol.toFixed(4)}
                                    {qtdeRec > 0 ? ` · a receber ${qtdeRec.toFixed(4)}` : ''}
                                    {somaOk === true
                                      ? ' · ok'
                                      : somaOk === false
                                        ? ' · diverge — ajuste antes de confirmar'
                                        : ''}
                                    . Dimensão real da bobina — não altera o SKU.
                                    {enderecos.length > 0
                                      ? ' Endereço (vão) pode ser vinculado depois na ficha do lote.'
                                      : ''}
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        );
                      })}
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
