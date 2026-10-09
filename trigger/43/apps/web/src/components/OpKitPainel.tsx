import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OpEscolhaOverlay } from './OpEscolhaOverlay';
import { api, type OrdemProducao, type OrdemProducaoMaterial, type Pedido } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { linhaImpressaoFlexo } from '../lib/opFichaFlexo';
import {
  formatLotePick,
  formatVolumeDimensao,
  leituraNecessidadeOp,
  linhaConfirmarSugerida,
  modoRetirada,
  opKitLinhasOrdenadas,
  volumeSugerido,
  volumesParaEscolha,
} from '../lib/producaoPick';
import { specOperacional } from '../lib/producaoFicha';
import {
  hrefApontamentoProducao,
  hrefFichaEstoque,
  opComponenteLabel,
  opKitEstado,
  opKitEstadoLabel,
  opKitNome,
  opKitOnde,
  opPassoAtual,
} from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
  pedido: Pedido | null;
  porta?: 'op' | 'chao';
  podeEstoque?: boolean;
  podeProducao: boolean;
  canWrite: boolean;
  /** Abre o overlay deste material (ex.: veio da OP). */
  materialInicialId?: number;
  onOp: (data: OrdemProducao) => void;
};

function volumesSugeridosLinha(m: OrdemProducaoMaterial) {
  const estado = opKitEstado(m);
  if (estado === 'ja_saiu') {
    return m.retirada?.volumes_a_devolver?.length
      ? m.retirada.volumes_a_devolver
      : (m.retirada?.volumes_baixados ?? []);
  }
  return volumesParaEscolha(m).filter((v) => volumeSugerido(v) || Number(v.qtde_retirar) > 0);
}

/**
 * Ficha da etiqueta + lista do kit.
 * Happy path (chão): um clique «Saiu» / «Confirmar saída sugerida».
 * Overlay só para outro volume ou devolver.
 */
export function OpKitPainel({
  op,
  pedido,
  porta = 'op',
  podeEstoque = false,
  podeProducao,
  canWrite,
  materialInicialId,
  onOp,
}: Props) {
  const item =
    pedido?.itens.find((i) => i.id === op.pedido_item?.id) ?? pedido?.itens[0] ?? null;
  const spec = pedido && item ? specOperacional(pedido, item) : {};
  const titulo =
    (op.pedido_item?.descricao ?? item?.descricao ?? '').trim() || 'Etiqueta sob medida';
  const qtde = formatDecimalBr(Number(op.qtde_planejada), 0);
  const specLinha = linhaImpressaoFlexo(spec);

  const linhas = opKitLinhasOrdenadas(op.materiais ?? []);
  const [abertoId, setAbertoId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const aberto = linhas.find((m) => m.id === abertoId) ?? null;
  const atual = opPassoAtual(op);
  const pendentes = linhas.filter((m) => opKitEstado(m) === 'falta_pegar');
  const falta = pendentes.length > 0;
  const noEstoque = porta === 'chao';

  useEffect(() => {
    if (!materialInicialId) return;
    const m = (op.materiais ?? []).find((x) => x.id === materialInicialId);
    if (!m) return;
    const estado = opKitEstado(m);
    // Deep-link: overlay só devolver ou sem estoque — happy path fica no botão Saiu.
    if (estado === 'ja_saiu' || estado === 'sem_estoque') {
      setAbertoId(materialInicialId);
    }
  }, [materialInicialId, op.materiais]);

  const confirmarLinha = async (m: OrdemProducaoMaterial) => {
    const linha = linhaConfirmarSugerida(m);
    if (!linha) {
      setErr('Sem sugestão FEFO neste material — use «Outro volume».');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(`/estoque/retiradas/${op.id}/confirmar`, {
        linhas: [linha],
      });
      onOp(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao confirmar a saída.');
    } finally {
      setBusy(false);
    }
  };

  const confirmarTudo = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(
        `/estoque/retiradas/${op.id}/confirmar-pendentes`,
      );
      onOp(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao confirmar as saídas.');
    } finally {
      setBusy(false);
    }
  };

  const cta = (() => {
    if (op.status === 'CANCELADA' && op.pedido) {
      return { to: `/pedidos/${op.pedido.id}`, label: `Voltar ao pedido ${op.pedido.codigo}` };
    }
    if (op.status === 'CONCLUIDA' && op.pedido) {
      return { to: `/pedidos/${op.pedido.id}`, label: `Continuar no pedido ${op.pedido.codigo}` };
    }
    if (porta === 'chao') return null;
    if (porta === 'op' && falta && podeEstoque) {
      return { to: hrefFichaEstoque(op.id), label: 'Confirmar saída no estoque' };
    }
    if (atual === 'entregar' && podeProducao) {
      return { to: hrefApontamentoProducao(op.id), label: 'Abrir a ordem' };
    }
    if ((atual === 'produzir' || atual === 'devolver') && podeProducao) {
      return { to: hrefApontamentoProducao(op.id), label: 'Abrir a ordem' };
    }
    return null;
  })();

  return (
    <section className="pick op-kit" aria-label="Ordem e kit">
      <header className="pick__job">
        <p className="pick__job-qtde">{qtde} etiquetas</p>
        <h2 className="pick__job-nome">{titulo}</h2>
        <p className="pick__job-meta">
          {op.parceiro?.razao_social ?? '—'}
          {specLinha ? ` · ${specLinha}` : ''}
        </p>
      </header>

      {err ? <div className="alert alert-danger">{err}</div> : null}

      {linhas.length === 0 ? (
        <p className="op-kit__vazio">Ainda sem materiais nesta ordem.</p>
      ) : (
        <ol className="op-kit-lista">
          {linhas.map((m, i) => {
            const estado = opKitEstado(m);
            const tipo = opComponenteLabel(m.componente);
            const leitura = leituraNecessidadeOp(m, op);
            const onde = opKitOnde(m);
            const porVolume = modoRetirada(m) === 'volume';
            const vols = volumesSugeridosLinha(m);
            const podeSair =
              noEstoque && canWrite && estado === 'falta_pegar' && Boolean(linhaConfirmarSugerida(m));
            const podeOutro =
              noEstoque && canWrite && (estado === 'falta_pegar' || estado === 'sem_estoque');
            const podeDevolver = canWrite && estado === 'ja_saiu';

            return (
              <li key={m.id} className={`op-kit-lista__item op-kit-lista__item--${estado}`}>
                <div className="op-kit-lista__topo">
                  <span className="op-kit-lista__n" aria-hidden>
                    {i + 1}
                  </span>
                  <div className="op-kit-lista__corpo">
                    <div className="op-kit-lista__titulo">
                      <span className="op-kit-lista__tipo">{tipo}</span>
                      <strong>{opKitNome(m)}</strong>
                      {m.produto?.codigo ? (
                        <span className="op-kit-lista__sku">{m.produto.codigo}</span>
                      ) : null}
                    </div>
                    <div className="op-kit-lista__meta">
                      <span>
                        Pedido:{' '}
                        <strong>
                          {leitura.principal}
                          {leitura.complemento ? ` · ${leitura.complemento}` : ''}
                        </strong>
                      </span>
                      <span className="op-kit-lista__sep" aria-hidden>
                        ·
                      </span>
                      <span>{onde === '—' ? 'Sem local' : onde}</span>
                      <span className="op-kit-lista__sep" aria-hidden>
                        ·
                      </span>
                      <span className={`op-kit-lista__st op-kit-lista__st--${estado}`}>
                        {opKitEstadoLabel(estado)}
                      </span>
                    </div>
                  </div>
                  <div className="op-kit-lista__acoes">
                    {podeSair ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => void confirmarLinha(m)}
                      >
                        Saiu
                      </button>
                    ) : null}
                    {podeOutro ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busy}
                        onClick={() => setAbertoId(m.id)}
                      >
                        {estado === 'sem_estoque'
                          ? 'Ver estoque'
                          : porVolume
                            ? 'Outro volume'
                            : 'Ajustar qtde'}
                      </button>
                    ) : null}
                    {podeDevolver ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busy}
                        onClick={() => setAbertoId(m.id)}
                      >
                        Devolver
                      </button>
                    ) : null}
                    {!podeSair && !podeOutro && !podeDevolver && porta === 'op' && estado === 'falta_pegar' ? (
                      <Link
                        className="btn btn-secondary btn-sm"
                        to={hrefFichaEstoque(op.id, { materialId: m.id })}
                      >
                        No estoque
                      </Link>
                    ) : null}
                  </div>
                </div>

                {porVolume ? (
                  <div className="op-kit-lista__vols">
                    {vols.length === 0 ? (
                      <p className="op-kit-lista__vols-vazio">
                        {estado === 'sem_estoque'
                          ? 'Sem saldo neste SKU.'
                          : estado === 'ja_saiu'
                            ? 'Nada fora da prateleira.'
                            : 'Sem sugestão FEFO — use «Outro volume» no estoque.'}
                      </p>
                    ) : (
                      <table className="op-kit-lista__table">
                        <thead>
                          <tr>
                            <th>Volume</th>
                            <th>Local</th>
                            <th>Dimensão</th>
                            <th>{estado === 'ja_saiu' ? 'Fora' : 'Sugestão'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vols.map((v) => (
                            <tr key={v.lote_id ?? v.codigo}>
                              <td>{formatLotePick(v)}</td>
                              <td>{v.endereco?.codigo ?? '—'}</td>
                              <td>{formatVolumeDimensao(v) ?? '—'}</td>
                              <td>
                                {estado === 'ja_saiu'
                                  ? 'Baixado'
                                  : volumeSugerido(v)
                                    ? 'FEFO'
                                    : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {noEstoque && canWrite && falta ? (
        <div className="op-kit__cta">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void confirmarTudo()}
          >
            Confirmar saída sugerida ({pendentes.length})
          </button>
        </div>
      ) : null}

      {cta ? (
        <div className="op-kit__cta">
          <Link to={cta.to} className="btn btn-primary">
            {cta.label}
          </Link>
        </div>
      ) : null}

      {aberto ? (
        <OpEscolhaOverlay
          op={op}
          material={aberto}
          porta={porta}
          canWrite={canWrite}
          onClose={() => setAbertoId(null)}
          onOp={onOp}
        />
      ) : null}
    </section>
  );
}
