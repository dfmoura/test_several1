import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OpEscolhaOverlay } from './OpEscolhaOverlay';
import type { OrdemProducao, OrdemProducaoMaterial, Pedido } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { linhaImpressaoFlexo } from '../lib/opFichaFlexo';
import {
  formatLotePick,
  formatVolumeDimensao,
  leituraNecessidadeOp,
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

function volumesDaLinha(m: OrdemProducaoMaterial) {
  const estado = opKitEstado(m);
  if (estado === 'ja_saiu') {
    return m.retirada?.volumes_baixados ?? [];
  }
  return volumesParaEscolha(m).filter((v) => volumeSugerido(v) || Number(v.qtde_retirar) > 0);
}

/**
 * Ficha da etiqueta + lista profissional do kit.
 * Clique em Volumes abre o overlay (tabela + filtros). Baixa só no estoque.
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
  const [abertoId, setAbertoId] = useState<number | null>(materialInicialId ?? null);
  const aberto = linhas.find((m) => m.id === abertoId) ?? null;
  const atual = opPassoAtual(op);
  const falta = linhas.some((m) => opKitEstado(m) === 'falta_pegar');

  useEffect(() => {
    if (materialInicialId) setAbertoId(materialInicialId);
  }, [materialInicialId]);

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
      return { to: hrefApontamentoProducao(op.id), label: 'Receber na máquina' };
    }
    if ((atual === 'produzir' || atual === 'devolver') && podeProducao) {
      return { to: hrefApontamentoProducao(op.id), label: 'Abrir a máquina' };
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
            const vols = volumesDaLinha(m);
            const acaoLabel =
              estado === 'ja_saiu'
                ? 'Ver volumes'
                : porVolume
                  ? vols.length > 0
                    ? 'Alterar volumes'
                    : 'Adicionar volumes'
                  : 'Detalhe';

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
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm op-kit-lista__acao"
                    onClick={() => setAbertoId(m.id)}
                  >
                    {acaoLabel}
                  </button>
                </div>

                {porVolume ? (
                  <div className="op-kit-lista__vols">
                    {vols.length === 0 ? (
                      <p className="op-kit-lista__vols-vazio">
                        Nenhum volume escolhido. Use «Adicionar volumes» para completar.
                      </p>
                    ) : (
                      <table className="op-kit-lista__table">
                        <thead>
                          <tr>
                            <th>Volume</th>
                            <th>Local</th>
                            <th>Dimensão</th>
                            <th>{estado === 'ja_saiu' ? 'Saiu' : 'Sugestão'}</th>
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
