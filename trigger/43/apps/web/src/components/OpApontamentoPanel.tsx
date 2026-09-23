import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type OrdemProducao } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDecimalBr } from '../lib/format';
import {
  ehMaterialProducao,
  hrefFichaEstoque,
  papelMinimoParaQtdeBoa,
  parseQtdeDigitada,
  qtdeConsumidaApontada,
} from '../lib/producaoUi';

type MatForm = { material_id: number; qtde_retorno: string; qtde_perda: string };

type Props = {
  op: OrdemProducao;
  onOp: (op: OrdemProducao) => void;
};

/**
 * Porta do chão: handoff + retorno/perda + qtde boa + concluir.
 * Mesmo POST …/concluir da OP. Sem rascunho APONT-.
 */
export function OpApontamentoPanel({ op, onOp }: Props) {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('producao.escrever');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [recebidoPor, setRecebidoPor] = useState(op.handoff?.recebidos_nome ?? '');
  const [qtdeBoa, setQtdeBoa] = useState(op.qtde_boa ?? op.qtde_planejada);
  const [qtdeRefugo, setQtdeRefugo] = useState(op.qtde_refugo || '0');
  const [mats, setMats] = useState<MatForm[]>(() => matsDe(op));
  const [aceitarFora, setAceitarFora] = useState(false);
  const [motivoFora, setMotivoFora] = useState('');
  const [qtdeComplementar, setQtdeComplementar] = useState('');

  useEffect(() => {
    setRecebidoPor(op.handoff?.recebidos_nome ?? '');
    setQtdeBoa(op.qtde_boa ?? op.qtde_planejada);
    setMats(matsDe(op));
    setQtdeRefugo(op.qtde_refugo || '0');
  }, [op.id, op.handoff?.entregues_em, op.status]);

  const aberta = ['ABERTA', 'EM_ANDAMENTO'].includes(op.status);
  const tol = op.pedido?.tolerancia_qtd_pct ?? '20';
  const materiaisRequisitados = (op.materiais ?? []).filter((m) => !m.pendente);
  const podeConcluirComSaida = materiaisRequisitados.length > 0;

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
    return (
      acc +
      qtdeConsumidaApontada(m.qtde_requisitada, form.qtde_retorno, form.qtde_perda, m.qtde_avaria)
    );
  }, 0);
  const avariaPapel = papeisRequisitados.reduce(
    (acc, m) => acc + parseQtdeDigitada(m.qtde_avaria),
    0,
  );
  const processoPapel = papeisRequisitados.reduce(
    (acc, m) =>
      acc + Math.max(0, parseQtdeDigitada(m.qtde_requisitada) - parseQtdeDigitada(m.qtde_avaria)),
    0,
  );
  const empenhoPapel = papeisRequisitados.reduce((acc, m) => {
    const planejada = parseQtdeDigitada(m.qtde_planejada);
    return acc + (planejada > 0 ? planejada : parseQtdeDigitada(m.qtde_requisitada));
  }, 0);
  const unidadePapel = papeisRequisitados[0]?.unidade ?? 'M2';
  const qtdeBoaNum = parseQtdeDigitada(qtdeBoa);
  const qtdeBoaValida = qtdeBoaNum > 0;
  const papelMinimo = papelMinimoParaQtdeBoa(empenhoPapel, op.qtde_planejada ?? '0', qtdeBoa, tol);
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

  const entregarInsumos = async () => {
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
      onOp(res.data);
      setMsg('Material recebido na máquina.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao registrar o recebimento.');
    } finally {
      setBusy(false);
    }
  };

  const concluir = async () => {
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
      const res = await api.post<{ data: OrdemProducao }>(`/ordens-producao/${op.id}/concluir`, {
        qtde_boa: String(parseQtdeDigitada(qtdeBoa)),
        qtde_refugo: String(parseQtdeDigitada(qtdeRefugo || '0')),
        aceitar_fora_tolerancia: aceitarFora,
        motivo_fora_tolerancia: motivoFora || null,
        materiais: materiaisPayload,
      });
      onOp(res.data);
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

  if (!aberta) {
    return (
      <div className="card">
        <div className="card-body">
          <p className="muted" style={{ margin: 0 }}>
            Esta ordem já está {op.status === 'CONCLUIDA' ? 'concluída' : 'encerrada'}. O resultado
            fica na{' '}
            <Link to={`/ordens-producao/${op.id}`}>ordem de produção</Link>
            {op.pedido ? (
              <>
                {' '}
                e no pedido <Link to={`/pedidos/${op.pedido.id}`}>{op.pedido.codigo}</Link>
              </>
            ) : null}
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {err ? <div className="alert alert-danger">{err}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      {op.pode_entregar_insumos && canWrite ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <h3 style={{ margin: '0 0 0.35rem' }}>Receber na máquina</h3>
            <p className="muted" style={{ margin: '0 0 0.75rem' }}>
              O material já saiu do estoque. Quem recebeu? Sem segundo movimento.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
                Confirmar recebimento
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {op.handoff?.entregue ? (
        <p className="muted" style={{ margin: '0 0 1rem' }}>
          Recebido na máquina
          {op.handoff.recebidos_nome ? ` · ${op.handoff.recebidos_nome}` : ''}
          {op.handoff.entregues_por ? ` · registrado por ${op.handoff.entregues_por.nome}` : ''}.
        </p>
      ) : null}

      <div className="card">
        <div className="card-body">
          <div className="form-section">
            <h3>Apontar e concluir</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              <strong>Retorno</strong> volta ao estoque (sobra de processo).{' '}
              <strong>Perda de processo</strong> não retorna. Avaria da mesa já foi apontada na
              ficha do estoque e não entra aqui. Consumo = requisitado − avaria − retorno − perda.
              Quantidade boa (PA) dentro de ±{tol}% readequa o pedido; fora da faixa exige motivo.
              O consumo de papel tem de cobrir a quantidade boa (rendimento da OP ±{tol}%).
            </p>
          </div>

          {!podeConcluirComSaida ? (
            <p className="muted" style={{ marginBottom: '1rem' }}>
              Aguarde a baixa no estoque — sem saída não há apontamento de retorno/perda.
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
                              onChange={(e) => updateMat(m.id, { qtde_retorno: e.target.value })}
                              disabled={!canWrite}
                              aria-label={`Retorno ${m.produto?.codigo ?? m.id}`}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="form-group" style={{ margin: 0, minWidth: 96 }}>
                            <input
                              value={form.qtde_perda}
                              onChange={(e) => updateMat(m.id, { qtde_perda: e.target.value })}
                              disabled={!canWrite}
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
                  {formatDecimalBr(papelMinimo, 4)} {unidadePapel} (±{tol}% do rendimento). Sem
                  substrato correspondente não há etiqueta. Requisite o papel que falta, reduza a
                  quantidade boa ou ajuste retorno/perda de processo.
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

          {canWrite && papelInsuficiente && papelComplementarAlvo ? (
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
                  Confirma no estoque.
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
              <input
                value={qtdeBoa}
                onChange={(e) => setQtdeBoa(e.target.value)}
                disabled={!canWrite}
              />
            </div>
            <div className="form-group">
              <label>Refugo</label>
              <input
                value={qtdeRefugo}
                onChange={(e) => setQtdeRefugo(e.target.value)}
                disabled={!canWrite}
              />
            </div>
          </div>

          <label
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}
          >
            <input
              type="checkbox"
              checked={aceitarFora}
              onChange={(e) => setAceitarFora(e.target.checked)}
              disabled={!canWrite}
            />
            Aceitar fora da tolerância ±{tol}%
          </label>
          {aceitarFora ? (
            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label>Motivo (tolerância)</label>
              <input
                value={motivoFora}
                onChange={(e) => setMotivoFora(e.target.value)}
                disabled={!canWrite}
              />
            </div>
          ) : null}

          {canWrite ? (
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
          ) : (
            <p className="muted" style={{ margin: '1rem 0 0' }}>
              Só leitura — quem conclui precisa de producao.escrever.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function matsDe(op: OrdemProducao): MatForm[] {
  return (op.materiais ?? []).map((m) => ({
    material_id: m.id,
    qtde_retorno: m.qtde_retorno || '0',
    qtde_perda: m.qtde_perda || '0',
  }));
}
