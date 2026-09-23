import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { ProdutoCombobox } from '../components/ProdutoCombobox';
import {
  api,
  type OrdemProducao,
  type OrdemProducaoMaterial,
  type Produto,
} from '../lib/api';
import { RastreioInsumosPanel } from '../components/RastreioInsumosPanel';
import { OpVolumesBaixados } from '../components/OpRetiradaPanel';
import { OpFichaRetirada } from '../components/OpFichaRetirada';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatDecimalBr } from '../lib/format';
import {
  capQtdeAte,
  ehMaterialProducao,
  hrefFichaEstoque,
  opMaterialLinhaStatus,
  opMaterialStatusLabel,
  opStatusLabel,
  papelMinimoParaQtdeBoa,
  parseQtdeDigitada,
  qtdeConsumidaApontada,
} from '../lib/producaoUi';
import { OpAndamentoPassos } from '../components/OpAndamentoPassos';
import { PaEmbalagemPanel } from '../components/PaEmbalagemPanel';

type MatForm = { material_id: number; qtde_retorno: string; qtde_perda: string };
type AvariaLinhaForm = { material_id: number; qtde: string; motivo: string };
type ExtraLinha = { key: number; produto: Produto | null; qtde: string };

function avariaLinhasDe(
  materiais: OrdemProducaoMaterial[] | null | undefined,
  prev: AvariaLinhaForm[] = [],
): AvariaLinhaForm[] {
  return (materiais ?? [])
    .filter((m) => !m.pendente)
    .map((m) => {
      const keep = prev.find((x) => Number(x.material_id) === Number(m.id));
      if (keep) return keep;
      return {
        material_id: m.id,
        qtde: parseQtdeDigitada(m.qtde_avaria) > 0 ? String(m.qtde_avaria) : '',
        motivo: m.motivo_avaria ?? '',
      };
    });
}

export function OrdemProducaoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [op, setOp] = useState<OrdemProducao | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devolverAberto, setDevolverAberto] = useState(false);
  const [motivoDevolver, setMotivoDevolver] = useState('');

  const extraKeyRef = useRef(1);
  const emptyExtra = (): ExtraLinha => ({ key: extraKeyRef.current++, produto: null, qtde: '' });
  const [extras, setExtras] = useState<ExtraLinha[]>(() => [
    { key: extraKeyRef.current++, produto: null, qtde: '' },
  ]);
  const [qtdeComplementar, setQtdeComplementar] = useState('');
  const [avariaForms, setAvariaForms] = useState<AvariaLinhaForm[]>([]);
  const [recebidoPor, setRecebidoPor] = useState('');

  const [qtdeBoa, setQtdeBoa] = useState('');
  const [qtdeRefugo, setQtdeRefugo] = useState('0');
  const [mats, setMats] = useState<MatForm[]>([]);
  const [aceitarFora, setAceitarFora] = useState(false);
  const [motivoFora, setMotivoFora] = useState('');

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: OrdemProducao }>(`/ordens-producao/${id}`);
      setOp(res.data);
      setQtdeBoa(res.data.qtde_boa ?? res.data.qtde_planejada);
      setMats(
        (res.data.materiais ?? []).map((m) => ({
          material_id: m.id,
          qtde_retorno: m.qtde_retorno || '0',
          qtde_perda: m.qtde_perda || '0',
        })),
      );
      setAvariaForms(avariaLinhasDe(res.data.materiais, []));
      setRecebidoPor(res.data.handoff?.recebidos_nome ?? '');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao carregar OP.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const aberta = useMemo(
    () => op && ['ABERTA', 'EM_ANDAMENTO'].includes(op.status),
    [op],
  );

  const aplicarOp = (data: OrdemProducao, resetAvaria = false) => {
    setOp(data);
    setMats((prev) =>
      (data.materiais ?? []).map((m) => {
        const keep = prev.find((x) => Number(x.material_id) === Number(m.id));
        return {
          material_id: m.id,
          qtde_retorno: keep?.qtde_retorno ?? (m.qtde_retorno || '0'),
          qtde_perda: keep?.qtde_perda ?? (m.qtde_perda || '0'),
        };
      }),
    );
    setAvariaForms((prev) => avariaLinhasDe(data.materiais, resetAvaria ? [] : prev));
    setRecebidoPor(data.handoff?.recebidos_nome ?? '');
  };

  const registrarAvarias = async () => {
    if (!op) return;
    const requisitados = (op.materiais ?? []).filter((m) => !m.pendente);
    const dirty = avariaForms.filter((form) => {
      const m = requisitados.find((x) => Number(x.id) === Number(form.material_id));
      if (!m) return false;
      const teto = parseQtdeDigitada(m.qtde_requisitada);
      const qtde = Math.min(Math.max(0, parseQtdeDigitada(form.qtde)), teto);
      const qtdeSrv = parseQtdeDigitada(m.qtde_avaria);
      const motivoSrv = (m.motivo_avaria ?? '').trim();
      return Math.abs(qtde - qtdeSrv) > 1e-9 || form.motivo.trim() !== motivoSrv;
    });
    if (dirty.length === 0) {
      setErr('Nada para gravar — informe a quantidade avariada (até o requisitado) em ao menos uma linha.');
      return;
    }
    for (const form of dirty) {
      if (parseQtdeDigitada(form.qtde) > 0 && form.motivo.trim().length < 3) {
        setErr('Informe o motivo da avaria (mínimo 3 caracteres) nas linhas com quantidade.');
        return;
      }
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      let last = op;
      for (const form of dirty) {
        const m = requisitados.find((x) => Number(x.id) === Number(form.material_id));
        const teto = parseQtdeDigitada(m?.qtde_requisitada);
        const qtde = Math.min(Math.max(0, parseQtdeDigitada(form.qtde)), teto);
        const res = await api.post<{ data: OrdemProducao }>(`/ordens-producao/${op.id}/avaria`, {
          material_id: form.material_id,
          qtde: String(qtde),
          motivo: form.motivo.trim() || undefined,
        });
        last = res.data;
      }
      aplicarOp(last, true);
      const gravadas = (last.materiais ?? []).filter((m) => parseQtdeDigitada(m.qtde_avaria) > 0).length;
      setMsg(
        gravadas > 0
          ? 'Avaria da separação registrada. O estoque não muda — o material já tinha saído. Reponha se faltar papel na máquina.'
          : 'Avaria da separação zerada.',
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao registrar avaria.');
    } finally {
      setBusy(false);
    }
  };

  const entregarInsumos = async () => {
    if (!op) return;
    if (recebidoPor.trim().length < 2) {
      setErr('Informe quem recebeu na produção.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(
        `/ordens-producao/${op.id}/entregar-insumos`,
        { recebido_por: recebidoPor.trim() },
      );
      aplicarOp(res.data);
      setMsg('Material entregue na produção.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao registrar a entrega.');
    } finally {
      setBusy(false);
    }
  };

  const concluir = async () => {
    if (!op) return;
    if (semMaterialParaProduzir) {
      setErr(
        papelInsuficiente && !consumoMpZero
          ? `Papel insuficiente para a quantidade boa — consumido ${formatDecimalBr(consumoPapel, 4)} ${unidadePapel}, mínimo ${formatDecimalBr(papelMinimo, 4)} ${unidadePapel}. Avaria da separação não conta como processo. Sem substrato correspondente não há etiqueta.`
          : consumoMpZero && !consumoZeroTotal
            ? 'Sem consumo de papel/MP — sem material para produzir. Ajuste avaria da separação ou retorno/perda de processo do substrato.'
            : 'Consumo zero em todos os materiais — sem material consumido não há produção a concluir. Ajuste avaria, retorno ou perda.',
      );
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      // Só envia linhas baixadas, com IDs numéricos e qtdes normalizadas.
      const materiaisPayload = materiaisRequisitados.map((m) => {
        const form = mats.find((x) => Number(x.material_id) === Number(m.id)) ?? {
          qtde_retorno: '0',
          qtde_perda: '0',
        };
        return {
          material_id: Number(m.id),
          produto_id: m.produto?.id ? Number(m.produto.id) : undefined,
          qtde_retorno: String(parseQtdeDigitada(form.qtde_retorno)),
          qtde_perda: String(parseQtdeDigitada(form.qtde_perda)),
        };
      });
      const res = await api.post<{ data: OrdemProducao }>(
        `/ordens-producao/${op.id}/concluir`,
        {
          qtde_boa: String(parseQtdeDigitada(qtdeBoa)),
          qtde_refugo: String(parseQtdeDigitada(qtdeRefugo || '0')),
          aceitar_fora_tolerancia: aceitarFora,
          motivo_fora_tolerancia: motivoFora || null,
          materiais: materiaisPayload,
        },
      );
      setOp(res.data);
      setMsg(
        res.data.pedido
          ? `OP concluída · PA e readequação gravados. Pedido ${res.data.pedido.codigo} atualizado.`
          : 'OP concluída · PA e readequação gravados.',
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao concluir.');
    } finally {
      setBusy(false);
    }
  };

  const devolverAoPedido = async () => {
    if (!op) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(
        `/ordens-producao/${op.id}/devolver-ao-pedido`,
        { motivo: motivoDevolver.trim() },
      );
      setOp(res.data);
      setDevolverAberto(false);
      if (res.data.pedido?.id) {
        navigate(`/pedidos/${res.data.pedido.id}`);
        return;
      }
      setMsg('Ordem devolvida ao pedido.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível devolver ao pedido.');
    } finally {
      setBusy(false);
    }
  };

  const updateMat = (materialId: number, patch: Partial<MatForm>) => {
    setMats((prev) => {
      const current = prev.find((x) => x.material_id === materialId) ?? {
        material_id: materialId,
        qtde_retorno: '0',
        qtde_perda: '0',
      };
      return [...prev.filter((x) => x.material_id !== materialId), { ...current, ...patch }];
    });
  };

  const tol = op?.pedido?.tolerancia_qtd_pct ?? '20';
  const materiaisRequisitados = (op?.materiais ?? []).filter((m) => !m.pendente);
  const materiaisPendentes = (op?.materiais ?? []).filter((m) => m.pendente);
  const podeConcluirComSaida = materiaisRequisitados.length > 0;
  const disp = op?.disponibilidade;
  const temFaltante = Boolean(disp?.aguardando_material);
  const naoCasados = disp?.componentes_nao_casados ?? [];
  const podeAbrirFichaEstoque =
    Boolean(aberta) && (hasPermission('estoque.ler') || hasPermission('producao.ler'));

  const consumoZeroTotal =
    materiaisRequisitados.length > 0 &&
    materiaisRequisitados.every((m) => {
      const form = mats.find((x) => Number(x.material_id) === Number(m.id)) ?? {
        qtde_retorno: '0',
        qtde_perda: '0',
      };
      return (
        qtdeConsumidaApontada(
          m.qtde_requisitada,
          form.qtde_retorno,
          form.qtde_perda,
          m.qtde_avaria,
        ) <= 0
      );
    });

  const mpsRequisitados = materiaisRequisitados.filter((m) => ehMaterialProducao(m));
  const consumoMpZero =
    mpsRequisitados.length > 0 &&
    mpsRequisitados.every((m) => {
      const form = mats.find((x) => Number(x.material_id) === Number(m.id)) ?? {
        qtde_retorno: '0',
        qtde_perda: '0',
      };
      return (
        qtdeConsumidaApontada(
          m.qtde_requisitada,
          form.qtde_retorno,
          form.qtde_perda,
          m.qtde_avaria,
        ) <= 0
      );
    });

  const papeisRequisitados = (() => {
    const soPapel = mpsRequisitados.filter((m) => (m.componente ?? '').toUpperCase() === 'PAPEL');
    return soPapel.length > 0 ? soPapel : mpsRequisitados;
  })();
  const consumoPapel = papeisRequisitados.reduce((acc, m) => {
    const form = mats.find((x) => Number(x.material_id) === Number(m.id)) ?? {
      qtde_retorno: '0',
      qtde_perda: '0',
    };
    return acc + qtdeConsumidaApontada(
      m.qtde_requisitada,
      form.qtde_retorno,
      form.qtde_perda,
      m.qtde_avaria,
    );
  }, 0);
  const avariaPapel = papeisRequisitados.reduce(
    (acc, m) => acc + parseQtdeDigitada(m.qtde_avaria),
    0,
  );
  const processoPapel = papeisRequisitados.reduce(
    (acc, m) =>
      acc +
      Math.max(0, parseQtdeDigitada(m.qtde_requisitada) - parseQtdeDigitada(m.qtde_avaria)),
    0,
  );
  const empenhoPapel = papeisRequisitados.reduce((acc, m) => {
    const planejada = parseQtdeDigitada(m.qtde_planejada);
    return acc + (planejada > 0 ? planejada : parseQtdeDigitada(m.qtde_requisitada));
  }, 0);
  const unidadePapel = papeisRequisitados[0]?.unidade ?? 'M2';
  const qtdeBoaNum = parseQtdeDigitada(qtdeBoa);
  const qtdeBoaValida = qtdeBoaNum > 0;
  const papelMinimo = papelMinimoParaQtdeBoa(
    empenhoPapel,
    op?.qtde_planejada ?? '0',
    qtdeBoa,
    tol,
  );
  const papelInsuficiente =
    papeisRequisitados.length > 0 && qtdeBoaValida && consumoPapel + 1e-9 < papelMinimo;
  const papelFaltanteParaBoa = Math.max(0, papelMinimo - consumoPapel);
  const papelComplementarAlvo = papeisRequisitados[0] ?? null;
  const faltaReposicaoAvaria = Math.max(0, empenhoPapel - processoPapel);
  const precisaReposicaoAvaria = avariaPapel > 0 && faltaReposicaoAvaria > 1e-9;
  const papelComplementarSugerido = Math.max(
    papelFaltanteParaBoa,
    precisaReposicaoAvaria ? faltaReposicaoAvaria : 0,
  );

  const semMaterialParaProduzir = consumoZeroTotal || consumoMpZero || papelInsuficiente;
  const podeConcluirAgora = podeConcluirComSaida && qtdeBoaValida && !semMaterialParaProduzir;

  return (
    <>
      <PageHeader
        title={op?.codigo ?? 'Ordem de produção'}
        description={
          op
            ? (op.pedido_item?.descricao ?? 'Ordem de produção')
            : loading
              ? 'Carregando…'
              : 'OP não encontrada.'
        }
        actions={
          <div className="btn-row">
            <Link to="/ordens-producao" className="btn btn-secondary">
              Voltar
            </Link>
            {op ? (
              <a
                href={`/ordens-producao/${op.id}/ficha`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/ordens-producao/${op.id}/ficha`)}
              >
                Imprimir ordem
              </a>
            ) : null}
            {op?.rastreio && (op.rastreio.resumo?.insumos_com_saida ?? 0) > 0 ? (
              <a
                href={`/ordens-producao/${op.id}/rastreio`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/ordens-producao/${op.id}/rastreio`)}
              >
                Imprimir rastreio
              </a>
            ) : null}
            {op?.pedido ? (
              <Link to={`/pedidos/${op.pedido.id}`} className="btn btn-secondary">
                {op.pedido.codigo}
              </Link>
            ) : null}
          </div>
        }
      />

      {err && <div className="alert alert-error">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {loading || !op ? (
        loading ? (
          <div className="loading">Carregando…</div>
        ) : (
          <div className="empty-state">OP não encontrada.</div>
        )
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="detail-meta">
                <div>
                  <span>Status</span>
                  <strong>
                    <StatusPill status={opStatusLabel(op.status)} />
                  </strong>
                </div>
                <div>
                  <span>Planejada</span>
                  <strong>{formatDecimalBr(Number(op.qtde_planejada), 0)}</strong>
                </div>
                {op.qtde_boa != null ? (
                  <div>
                    <span>Boa</span>
                    <strong>{formatDecimalBr(Number(op.qtde_boa), 0)}</strong>
                  </div>
                ) : null}
                <div>
                  <span>Tolerância</span>
                  <strong>±{tol}%</strong>
                </div>
                {op.parceiro ? (
                  <div>
                    <span>Cliente</span>
                    <strong>{op.parceiro.razao_social}</strong>
                  </div>
                ) : null}
                {op.pa_movimento ? (
                  <div>
                    <span>MOV PA</span>
                    <strong>{op.pa_movimento.codigo}</strong>
                  </div>
                ) : null}
                {op.status === 'CANCELADA' && op.motivo_cancelamento ? (
                  <div>
                    <span>Devolvida ao pedido</span>
                    <strong>{op.motivo_cancelamento}</strong>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <OpAndamentoPassos op={op} />

          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                }}
              >
                <div className="form-section" style={{ marginBottom: 0 }}>
                  <h3>1 · Separação de insumos</h3>
                  <p className="muted" style={{ margin: 0 }}>
                    Pedido da OP (papel, tubete, caixa). A confirmação física — QR ou manual — é
                    só do <strong>estoque</strong>, na ficha da requisição. Empenho leve não
                    movimenta. Rasgo na mesa é <strong>avaria da separação</strong> (abaixo); a
                    reposição também confirma no estoque.
                    {hasPermission('estoque.ler') || hasPermission('producao.ler') ? (
                      <>
                        {' '}
                        <Link to={hrefFichaEstoque(op.id)}>Ficha no estoque</Link>
                      </>
                    ) : null}
                    {hasPermission('estoque.ler') ? (
                      <>
                        {' · '}
                        <Link to="/estoque">Abrir estoque</Link>
                      </>
                    ) : null}
                    {hasPermission('compras.ler') ? (
                      <>
                        {' · '}
                        <Link to="/compras/ordens/nova">Nova OC</Link>
                        {' · '}
                        <Link to="/compras/reposicao">A repor</Link>
                      </>
                    ) : null}
                  </p>
                </div>
                {podeAbrirFichaEstoque ? (
                  <Link className="btn btn-primary" to={hrefFichaEstoque(op.id)}>
                    Abrir ficha no estoque
                  </Link>
                ) : null}
              </div>

              <div
                className={temFaltante ? 'alert alert-warning' : 'alert alert-info'}
                style={{ marginTop: '1rem' }}
                role="status"
              >
                {temFaltante ? (
                  <>
                    <strong>Aguardando material</strong> —{' '}
                    {disp?.linhas_com_faltante ?? 0} linha
                    {(disp?.linhas_com_faltante ?? 0) === 1 ? '' : 's'} com saldo abaixo do
                    planejado. Veja as colunas <strong>Disponível</strong> e{' '}
                    <strong>Faltante</strong>. Abasteça via{' '}
                    <Link to="/compras/ordens/nova">ordem de compra</Link> ou{' '}
                    <Link to="/compras/reposicao">a repor</Link>. Linhas com saldo completo ainda
                    podem ser baixadas uma a uma.
                  </>
                ) : (
                  <>
                    <strong>Saldo do estoque (leitura)</strong> — cada linha mostra{' '}
                    <strong>Planejado · Disponível · Faltante</strong>. Sem reserva automática: a
                    baixa só ocorre na ficha do estoque; se faltar, o sistema bloqueia antes de
                    movimentar. SKU com lote sugere FEFO (validade) e FIFO (entrada).
                  </>
                )}
              </div>

              {naoCasados.length > 0 ? (
                <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                  <strong>Componente sem SKU casado</strong>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                    {naoCasados.map((c) => (
                      <li key={`${c.componente}-${c.origem_texto}`}>
                        {c.componente}
                        {c.origem_texto ? ` · ${c.origem_texto}` : ''} — {c.motivo}
                      </li>
                    ))}
                  </ul>
                  <p className="muted" style={{ margin: '0.5rem 0 0' }}>
                    Cadastre o produto ou inclua o material manualmente abaixo.
                  </p>
                </div>
              ) : null}

              <div className="table-wrap" style={{ marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Componente</th>
                      <th>SKU</th>
                      <th>Planejado</th>
                      <th>Disponível</th>
                      <th>Faltante</th>
                      <th>Requisitado</th>
                      <th>Avaria</th>
                      <th>Status</th>
                      <th className="acoes" />
                    </tr>
                  </thead>
                  <tbody>
                    {(op.materiais ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ color: 'var(--text-muted)' }}>
                          {naoCasados.length > 0
                            ? 'Nenhum material casado ao snapshot. Inclua manualmente abaixo ou cadastre o SKU.'
                            : 'Nenhum material casado ao snapshot. Inclua manualmente abaixo.'}
                        </td>
                      </tr>
                    ) : (
                      (op.materiais ?? []).map((m) => {
                        const statusKey = opMaterialLinhaStatus(m);
                        return (
                          <tr key={m.id}>
                            <td>
                              {m.componente ?? '—'}
                              {m.origem_texto ? (
                                <div className="muted" style={{ fontSize: '0.85em' }}>
                                  {m.origem_texto}
                                </div>
                              ) : null}
                            </td>
                            <td>
                              {m.produto ? (
                                <>
                                  <strong>{m.produto.codigo}</strong>
                                  <div className="muted" style={{ fontSize: '0.85em' }}>
                                    {m.produto.descricao_fiscal}
                                  </div>
                                  <div
                                    className="table-actions"
                                    style={{ marginTop: '0.25rem', gap: '0.5rem' }}
                                  >
                                    {hasPermission('estoque.ler') ? (
                                      <Link to={`/estoque/extrato/${m.produto.id}`}>Extrato</Link>
                                    ) : null}
                                    {hasPermission('produto.ler') ? (
                                      <Link to={`/produtos/${m.produto.id}`}>Produto</Link>
                                    ) : null}
                                  </div>
                                </>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              {formatDecimalBr(Number(m.qtde_planejada ?? 0), 4)} {m.unidade}
                            </td>
                            <td>
                              {m.qtde_disponivel != null
                                ? `${formatDecimalBr(Number(m.qtde_disponivel), 4)} ${m.unidade}`
                                : '—'}
                            </td>
                            <td>
                              {m.aguardando_material ? (
                                <strong style={{ color: 'var(--danger, #b42318)' }}>
                                  {formatDecimalBr(Number(m.qtde_faltante ?? 0), 4)} {m.unidade}
                                </strong>
                              ) : m.pendente ? (
                                '0'
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              {m.pendente
                                ? '—'
                                : `${formatDecimalBr(Number(m.qtde_requisitada), 4)} ${m.unidade}`}
                              {!m.pendente && (m.retirada?.volumes_baixados ?? []).length > 0 ? (
                                <OpVolumesBaixados
                                  volumes={m.retirada!.volumes_baixados!}
                                  unidade={m.unidade}
                                />
                              ) : null}
                            </td>
                            <td>
                              {m.pendente
                                ? '—'
                                : parseQtdeDigitada(m.qtde_avaria) > 0
                                  ? `${formatDecimalBr(parseQtdeDigitada(m.qtde_avaria), 4)} ${m.unidade}`
                                  : '—'}
                            </td>
                            <td>
                              <StatusPill status={opMaterialStatusLabel(statusKey)} />
                            </td>
                            <td>
                              {m.pendente && m.aguardando_material ? (
                                <span className="muted" style={{ fontSize: '0.85em' }}>
                                  Sem saldo
                                </span>
                              ) : m.pendente && podeAbrirFichaEstoque ? (
                                <Link className="btn btn-secondary btn-sm" to={hrefFichaEstoque(op.id)}>
                                  Ficha no estoque
                                </Link>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <OpFichaRetirada op={op} mode="anexo" onOp={(data) => aplicarOp(data)} />

              {op.pode_entregar_insumos && hasPermission('producao.escrever') ? (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.85rem 1rem',
                    border: '1px solid var(--border, #d0d5dd)',
                    borderRadius: 8,
                  }}
                >
                  <h4 style={{ margin: '0 0 0.35rem' }}>Entregar na produção</h4>
                  <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.9em' }}>
                    O material já saiu do estoque. Quem recebeu na máquina? Sem segundo movimento.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div className="form-group" style={{ minWidth: 220, margin: 0 }}>
                      <label>Quem recebeu</label>
                      <input
                        value={recebidoPor}
                        onChange={(e) => setRecebidoPor(e.target.value)}
                        disabled={busy}
                        placeholder="Nome no chão de fábrica"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => void entregarInsumos()}
                    >
                      Confirmar entrega
                    </button>
                  </div>
                </div>
              ) : null}

              {op.handoff?.entregue ? (
                <p className="muted" style={{ margin: '0.75rem 0 0' }}>
                  Entregue na produção
                  {op.handoff.recebidos_nome ? ` · ${op.handoff.recebidos_nome}` : ''}
                  {op.handoff.entregues_por ? ` · registrado por ${op.handoff.entregues_por.nome}` : ''}
                  .
                </p>
              ) : null}

              {aberta &&
              hasPermission('producao.escrever') &&
              materiaisRequisitados.length > 0 ? (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.85rem 1rem',
                    border: '1px solid var(--border, #d0d5dd)',
                    borderRadius: 8,
                  }}
                >
                  <h4 style={{ margin: '0 0 0.35rem' }}>Avaria na separação</h4>
                  <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.9em' }}>
                    Só nas linhas já requisitadas — a quantidade não passa do que saiu. Rasgo,
                    umidade ou recusa <strong>antes da máquina</strong>. Não escreve estoque. Zero
                    limpa o apontamento.
                  </p>
                  <div className="table-wrap" style={{ marginBottom: '0.75rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>SKU requisitado</th>
                          <th>Requisitado</th>
                          <th>Qtde avariada</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materiaisRequisitados.map((m) => {
                          const form = avariaForms.find(
                            (x) => Number(x.material_id) === Number(m.id),
                          ) ?? {
                            material_id: m.id,
                            qtde: '',
                            motivo: '',
                          };
                          const teto = parseQtdeDigitada(m.qtde_requisitada);
                          return (
                            <tr key={m.id}>
                              <td>
                                <strong>{m.produto?.codigo ?? m.componente}</strong>
                                <div className="muted" style={{ fontSize: '0.85em' }}>
                                  {m.produto?.descricao_fiscal ?? m.origem_texto ?? '—'}
                                </div>
                              </td>
                              <td>
                                {formatDecimalBr(teto, 4)} {m.unidade}
                              </td>
                              <td>
                                <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
                                  <input
                                    inputMode="decimal"
                                    value={form.qtde}
                                    max={teto}
                                    onChange={(e) => {
                                      const qtde = capQtdeAte(e.target.value, teto);
                                      setAvariaForms((prev) => {
                                        const others = prev.filter(
                                          (x) => Number(x.material_id) !== Number(m.id),
                                        );
                                        return [...others, { ...form, qtde }];
                                      });
                                    }}
                                    aria-label={`Avaria ${m.produto?.codigo ?? m.id} até ${formatDecimalBr(teto, 4)} ${m.unidade}`}
                                    placeholder={`máx. ${formatDecimalBr(teto, 4)}`}
                                  />
                                </div>
                              </td>
                              <td>
                                <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
                                  <input
                                    value={form.motivo}
                                    onChange={(e) =>
                                      setAvariaForms((prev) => {
                                        const others = prev.filter(
                                          (x) => Number(x.material_id) !== Number(m.id),
                                        );
                                        return [...others, { ...form, motivo: e.target.value }];
                                      })
                                    }
                                    placeholder="Ex.: bobina rasgada na mesa"
                                    aria-label={`Motivo da avaria ${m.produto?.codigo ?? m.id}`}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => void registrarAvarias()}
                  >
                    Registrar avarias
                  </button>
                  {precisaReposicaoAvaria && papelComplementarAlvo ? (
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        alignItems: 'flex-end',
                        marginTop: '0.85rem',
                      }}
                    >
                      <div className="form-group" style={{ minWidth: 180, margin: 0 }}>
                        <label>Reposição da avaria ({unidadePapel})</label>
                        <input
                          value={qtdeComplementar}
                          onChange={(e) => setQtdeComplementar(e.target.value)}
                          placeholder={formatDecimalBr(faltaReposicaoAvaria, 4)}
                          aria-label="Quantidade para repor avaria"
                        />
                        <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85em' }}>
                          Sugestão: {formatDecimalBr(faltaReposicaoAvaria, 4)} {unidadePapel} para
                          devolver o papel da máquina ao empenho. Exige saldo.
                        </p>
                      </div>
                      <Link
                        className="btn btn-primary"
                        to={hrefFichaEstoque(op.id, {
                          materialId: papelComplementarAlvo.id,
                          qtde: qtdeComplementar || String(faltaReposicaoAvaria),
                        })}
                      >
                        Pedir reposição no estoque
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {aberta && hasPermission('producao.escrever') ? (
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer' }}>Incluir material extra</summary>
                  <p className="muted" style={{ margin: '0.75rem 0 0.5rem', fontSize: '0.9em' }}>
                    SKU que não veio do empenho. Informe o item e peça ao estoque — a baixa
                    confirma só na ficha. SKU já na OP: use a reposição complementar.
                  </p>
                  {extras.map((linha, idx) => {
                    const idsNaOp = new Set(
                      (op.materiais ?? [])
                        .map((m) => m.produto?.id)
                        .filter((id): id is number => Number(id) > 0),
                    );
                    const idsNesteForm = new Set(
                      extras
                        .filter((e) => e.key !== linha.key && e.produto)
                        .map((e) => e.produto!.id),
                    );
                    const un = (
                      linha.produto?.unidade_interna ||
                      linha.produto?.unidade_comercial ||
                      'un.'
                    ).toUpperCase();
                    return (
                      <div key={linha.key} className="oc-form-page__item">
                        <div
                          className={`oc-form-page__item-row${extras.length > 1 ? ' has-remove' : ''}`}
                        >
                          <ProdutoCombobox
                            className="oc-form-page__item-produto"
                            label={idx === 0 ? 'SKU (MP/EMB)' : 'SKU'}
                            value={linha.produto}
                            onChange={(p) => {
                              if (p && (idsNaOp.has(p.id) || idsNesteForm.has(p.id))) {
                                setErr(
                                  idsNaOp.has(p.id)
                                    ? 'Este SKU já está na OP. Use a reposição complementar na linha requisitada.'
                                    : 'Este SKU já está em outra linha extra.',
                                );
                                return;
                              }
                              setErr(null);
                              setExtras((prev) =>
                                prev.map((e) => (e.key === linha.key ? { ...e, produto: p } : e)),
                              );
                            }}
                            familias={['MP', 'EMB']}
                            showSummary={false}
                            placeholder="Buscar por código, descrição, NCM ou grupo…"
                            emptyMessage="Nenhum MP/EMB encontrado. Ajuste o termo ou cadastre o SKU."
                          />
                          <div className="form-group oc-form-page__item-qtde">
                            <label>Qtde ({un})</label>
                            <input
                              inputMode="decimal"
                              value={linha.qtde}
                              onChange={(e) =>
                                setExtras((prev) =>
                                  prev.map((x) =>
                                    x.key === linha.key ? { ...x, qtde: e.target.value } : x,
                                  ),
                                )
                              }
                              aria-label={`Quantidade extra ${linha.produto?.codigo ?? idx + 1}`}
                            />
                          </div>
                          {extras.length > 1 ? (
                            <div className="form-group oc-form-page__item-remove">
                              <label>&nbsp;</label>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={busy}
                                onClick={() =>
                                  setExtras((prev) => prev.filter((e) => e.key !== linha.key))
                                }
                              >
                                Remover
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  <div className="btn-row" style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy}
                      onClick={() => setExtras((prev) => [...prev, emptyExtra()])}
                    >
                      + Item
                    </button>
                    {extras
                      .filter((e) => e.produto && parseQtdeDigitada(e.qtde) > 0)
                      .map((e) => (
                        <Link
                          key={e.key}
                          className="btn btn-primary btn-sm"
                          to={hrefFichaEstoque(op.id, {
                            produtoId: e.produto!.id,
                            qtde: e.qtde,
                          })}
                        >
                          Pedir {e.produto!.codigo} no estoque
                        </Link>
                      ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>

          {op.rastreio ? (
            <RastreioInsumosPanel
              rastreio={op.rastreio}
              printHref={`/ordens-producao/${op.id}/rastreio`}
            />
          ) : null}

          {aberta && hasPermission('producao.escrever') && op.pode_devolver_ao_pedido ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div className="form-section">
                  <h3>Devolver ao pedido</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Esta ordem ainda não baixou estoque. Encerrar devolve o item ao pedido — o código
                    da OP permanece no histórico e uma nova ordem pode ser aberta.
                  </p>
                </div>
                {!devolverAberto ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => setDevolverAberto(true)}
                  >
                    Devolver ao pedido
                  </button>
                ) : (
                  <div>
                    <div className="form-group" style={{ maxWidth: 480 }}>
                      <label>Motivo</label>
                      <input
                        value={motivoDevolver}
                        onChange={(e) => setMotivoDevolver(e.target.value)}
                        placeholder="Ex.: aberta por engano; item ainda não vai para a máquina"
                        autoFocus
                      />
                    </div>
                    <div className="btn-row" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy || motivoDevolver.trim().length < 3}
                        onClick={() => void devolverAoPedido()}
                      >
                        Confirmar devolução
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => {
                          setDevolverAberto(false);
                          setMotivoDevolver('');
                        }}
                      >
                        Desistir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {aberta &&
          hasPermission('producao.escrever') &&
          !op.pode_devolver_ao_pedido &&
          (op.materiais ?? []).some((m) => !m.pendente) ? (
            <p className="muted" style={{ marginBottom: '1rem' }}>
              Com saída de material já requisitada, a ordem segue até a conclusão. Não é possível
              devolver ao pedido.
            </p>
          ) : null}

          {aberta && hasPermission('producao.escrever') ? (
            <div className="card">
              <div className="card-body">
                <div className="form-section">
                  <h3>3 · Concluir produção</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    <strong>Retorno</strong> volta ao estoque (sobra de processo).{' '}
                    <strong>Perda de processo</strong> não retorna. Avaria da mesa já foi apontada
                    no passo 1 e não entra aqui. Consumo = requisitado − avaria − retorno − perda.
                    Quantidade boa (PA) dentro de ±{tol}% readequa o pedido; fora da faixa exige
                    motivo. O consumo de papel tem de cobrir a quantidade boa (rendimento da OP ±
                    {tol}%) — sem substrato não há etiqueta.
                  </p>
                </div>

                {!podeConcluirComSaida ? (
                  <p className="muted" style={{ marginBottom: '1rem' }}>
                    {materiaisPendentes.length > 0
                      ? 'Requisite ao menos uma saída de material antes de concluir — senão não há ajuste de estoque nem apontamento de retorno/perda.'
                      : 'Inclua e requisite material (ou confira o casamento do snapshot) antes de concluir.'}
                  </p>
                ) : null}

                {materiaisRequisitados.length > 0 ? (
                  <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Requisitado</th>
                          <th>Avaria</th>
                          <th>Retorno (estoque)</th>
                          <th>Perda de processo</th>
                          <th>Consumo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materiaisRequisitados.map((m) => {
                          const form = mats.find((x) => Number(x.material_id) === Number(m.id)) ?? {
                            material_id: m.id,
                            qtde_retorno: '0',
                            qtde_perda: '0',
                          };
                          const consumo = qtdeConsumidaApontada(
                            m.qtde_requisitada,
                            form.qtde_retorno,
                            form.qtde_perda,
                            m.qtde_avaria,
                          );
                          const ehMp = ehMaterialProducao(m);
                          const linhaPapelCritica =
                            ehMp &&
                            (consumo <= 0 ||
                              (papelInsuficiente && papeisRequisitados.some((p) => p.id === m.id)));
                          return (
                            <tr
                              key={m.id}
                              style={
                                linhaPapelCritica
                                  ? {
                                      background:
                                        'color-mix(in srgb, var(--danger, #c0392b) 6%, transparent)',
                                    }
                                  : undefined
                              }
                            >
                              <td>
                                <strong>{m.produto?.codigo}</strong>
                                <div className="muted">{m.produto?.descricao_fiscal}</div>
                              </td>
                              <td>
                                {formatDecimalBr(Number(m.qtde_requisitada), 4)} {m.unidade}
                              </td>
                              <td>
                                {parseQtdeDigitada(m.qtde_avaria) > 0
                                  ? `${formatDecimalBr(parseQtdeDigitada(m.qtde_avaria), 4)} ${m.unidade}`
                                  : '—'}
                              </td>
                              <td>
                                <div className="form-group" style={{ margin: 0, minWidth: 96 }}>
                                  <input
                                    value={form.qtde_retorno}
                                    onChange={(e) =>
                                      updateMat(m.id, { qtde_retorno: e.target.value })
                                    }
                                    aria-label={`Retorno ${m.produto?.codigo ?? m.id}`}
                                  />
                                </div>
                              </td>
                              <td>
                                <div className="form-group" style={{ margin: 0, minWidth: 96 }}>
                                  <input
                                    value={form.qtde_perda}
                                    onChange={(e) => updateMat(m.id, { qtde_perda: e.target.value })}
                                    aria-label={`Perda ${m.produto?.codigo ?? m.id}`}
                                  />
                                </div>
                              </td>
                              <td>
                                {formatDecimalBr(consumo, 4)} {m.unidade}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {semMaterialParaProduzir ? (
                  <div className="alert alert-warning" style={{ marginBottom: '1rem' }} role="status">
                    {papelInsuficiente && !consumoMpZero ? (
                      <>
                        <strong>Papel insuficiente para a quantidade boa</strong> — consumido{' '}
                        {formatDecimalBr(consumoPapel, 4)} {unidadePapel}; mínimo{' '}
                        {formatDecimalBr(papelMinimo, 4)} {unidadePapel} (±{tol}% do rendimento).
                        Sem substrato correspondente não há etiqueta. O rendimento usa o empenho
                        (planejado), não o complementar. Avaria da separação não conta como
                        processo. Requisite o papel que falta, reduza a quantidade boa ou ajuste
                        retorno/perda de processo.
                      </>
                    ) : (
                      <>
                        <strong>Sem material para produzir</strong>
                        {consumoMpZero && !consumoZeroTotal
                          ? ' — o papel/MP está com consumo zero (avaria + perda/retorno cobriram o requisitado). Sem substrato não há produção.'
                          : ' — avaria + retorno/perda cobrem 100% do requisitado. Ajuste os apontamentos para deixar consumo > 0 no material de produção.'}{' '}
                        A conclusão permanece bloqueada.
                      </>
                    )}
                  </div>
                ) : null}

                {aberta &&
                hasPermission('producao.escrever') &&
                papelInsuficiente &&
                papelComplementarAlvo ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      alignItems: 'flex-end',
                      marginBottom: '1rem',
                    }}
                  >
                    <div className="form-group" style={{ minWidth: 160, margin: 0 }}>
                      <label>Papel complementar ({unidadePapel})</label>
                      <input
                        value={qtdeComplementar}
                        onChange={(e) => setQtdeComplementar(e.target.value)}
                        placeholder={formatDecimalBr(papelComplementarSugerido, 4)}
                        aria-label="Quantidade de papel complementar"
                      />
                      <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85em' }}>
                        Sugestão: {formatDecimalBr(papelComplementarSugerido, 4)} {unidadePapel}
                        {avariaPapel > 0
                          ? ' (reposição da avaria e/ou rendimento).'
                          : ' para cobrir a perda de processo (empenho fixo).'}{' '}
                        Exige saldo no estoque.
                        {hasPermission('estoque.ler') && papelComplementarAlvo.produto ? (
                          <>
                            {' '}
                            <Link to={`/estoque/extrato/${papelComplementarAlvo.produto.id}`}>
                              Ver extrato
                            </Link>
                          </>
                        ) : null}
                        {hasPermission('compras.ler') ? (
                          <>
                            {' · '}
                            <Link to="/compras/ordens/nova">Nova OC</Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <Link
                      className="btn btn-primary"
                      to={hrefFichaEstoque(op.id, {
                        materialId: papelComplementarAlvo.id,
                        qtde: qtdeComplementar || String(papelComplementarSugerido),
                      })}
                    >
                      Pedir complementar no estoque
                    </Link>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div className="form-group">
                    <label>Qtde boa (PA)</label>
                    <input value={qtdeBoa} onChange={(e) => setQtdeBoa(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Refugo</label>
                    <input value={qtdeRefugo} onChange={(e) => setQtdeRefugo(e.target.value)} />
                  </div>
                </div>

                <label
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}
                >
                  <input
                    type="checkbox"
                    checked={aceitarFora}
                    onChange={(e) => setAceitarFora(e.target.checked)}
                  />
                  Aceitar fora da tolerância ±{tol}%
                </label>
                {aceitarFora ? (
                  <div className="form-group" style={{ marginTop: '0.5rem' }}>
                    <label>Motivo (tolerância)</label>
                    <input value={motivoFora} onChange={(e) => setMotivoFora(e.target.value)} />
                  </div>
                ) : null}

                <div className="btn-row" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || !podeConcluirAgora}
                    onClick={() => void concluir()}
                  >
                    Concluir OP
                  </button>
                  {op.pedido ? (
                    <Link to={`/pedidos/${op.pedido.id}`} className="btn btn-secondary">
                      {op.pedido.codigo}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {op.status === 'CONCLUIDA' ? (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-body">
                <div className="form-section">
                  <h3>Resultado da produção</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Estoque ajustado (retorno/perda) e pedido readequado. Embalagem PA (bobinas e
                    caixas) é o passo seguinte — depois segue o faturamento pelo pedido.
                  </p>
                </div>
                <div className="detail-meta" style={{ marginBottom: '1rem' }}>
                  <div>
                    <span>Qtde boa (PA)</span>
                    <strong>
                      {op.qtde_boa != null ? formatDecimalBr(Number(op.qtde_boa), 0) : '—'}
                    </strong>
                  </div>
                  <div>
                    <span>Refugo</span>
                    <strong>{formatDecimalBr(Number(op.qtde_refugo || 0), 0)}</strong>
                  </div>
                  {op.pa_movimento ? (
                    <div>
                      <span>MOV PA</span>
                      <strong>{op.pa_movimento.codigo}</strong>
                    </div>
                  ) : null}
                  {op.fora_tolerancia ? (
                    <div>
                      <span>Fora da tolerância</span>
                      <strong>{op.motivo_fora_tolerancia ?? 'Sim'}</strong>
                    </div>
                  ) : null}
                </div>
                {(op.materiais ?? []).filter((m) => !m.pendente).length > 0 ? (
                  <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Requisitado</th>
                          <th>Avaria</th>
                          <th>Retorno</th>
                          <th>Perda processo</th>
                          <th>Consumo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(op.materiais ?? [])
                          .filter((m) => !m.pendente)
                          .map((m) => (
                            <tr key={m.id}>
                              <td>
                                {m.produto?.codigo} — {m.produto?.descricao_fiscal}
                              </td>
                              <td>
                                {formatDecimalBr(Number(m.qtde_requisitada), 4)} {m.unidade}
                              </td>
                              <td>
                                {formatDecimalBr(Number(m.qtde_avaria ?? 0), 4)} {m.unidade}
                              </td>
                              <td>
                                {formatDecimalBr(Number(m.qtde_retorno), 4)} {m.unidade}
                              </td>
                              <td>
                                {formatDecimalBr(Number(m.qtde_perda), 4)} {m.unidade}
                              </td>
                              <td>
                                {formatDecimalBr(Number(m.qtde_consumida), 4)} {m.unidade}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <div className="btn-row">
                  {op.pedido ? (
                    <Link to={`/pedidos/${op.pedido.id}`} className="btn btn-primary">
                      Continuar no pedido {op.pedido.codigo}
                    </Link>
                  ) : null}
                  {hasPermission('estoque.ler') ? (
                    <Link to="/estoque" className="btn btn-secondary">
                      Ver estoque
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {op.status === 'CONCLUIDA' ? (
            <PaEmbalagemPanel
              op={op}
              canWrite={hasPermission('producao.escrever')}
              onChanged={() => void load()}
            />
          ) : null}
        </>
      )}
    </>
  );
}
