import { Link } from 'react-router-dom';
import type { FormatoPosicao, ItemPosicao } from '../lib/estoqueUi';
import { familiaLabel, formatQty, formatQtyCompact } from '../lib/format';
import { useAuth } from '../lib/auth';
import { IconEye, IconOrcamento, IconProduct } from './NavIcons';
import { formatVolumeDimensao } from '../lib/volumeEtiquetaPrint';

type Props = {
  itens: ItemPosicao[];
  onAbrirFormato: (produtoId: number, codigo: string | undefined, faixa: FormatoPosicao) => void;
  onAbrirVolumes: (produtoId: number, codigo?: string | null) => void;
  onExtrato: (produtoId: number) => void;
};

function produtoNome(s: ItemPosicao['saldo']): string {
  return (
    s.produto?.descricao_comercial?.trim() ||
    s.produto?.descricao_fiscal?.trim() ||
    ''
  );
}

function volumesDoItem(item: ItemPosicao): number {
  if (item.formatos.length > 0) {
    return item.formatos.reduce((acc, f) => acc + f.volumes, 0);
  }
  return item.saldo.controla_lote ? (item.saldo.lotes_count ?? 0) : 0;
}

export function EstoquePosicaoPanel({
  itens,
  onAbrirFormato,
  onAbrirVolumes,
  onExtrato,
}: Props) {
  const { hasPermission } = useAuth();

  if (itens.length === 0) {
    return (
      <div className="empty-state">
        Nenhum item nesta posição com o filtro atual.
      </div>
    );
  }

  const volumes = itens.reduce((acc, item) => acc + volumesDoItem(item), 0);
  const formatos = itens.reduce((acc, item) => acc + item.formatos.length, 0);

  return (
    <div className="estoque-posicao">
      <p className="estoque-posicao-resumo muted">
        {itens.length} item(ns) · {formatos} formato(s) · {volumes} volume(s)
      </p>

      <div className="table-wrap table-wrap--freeze">
        <table className="data-table estoque-dense-table estoque-posicao-table">
          <thead>
            <tr>
              <th>Formato</th>
              <th className="num">Qtde / vol</th>
              <th className="num">Volumes</th>
              <th>Local</th>
            </tr>
          </thead>
          {itens.map((item) => {
            const s = item.saldo;
            const codigo = s.produto?.codigo ?? '—';
            const nome = produtoNome(s);
            const familia = s.produto?.familia;
            const nVol = volumesDoItem(item);
            return (
              <tbody key={s.id} className="estoque-posicao-bloco">
                <tr className="estoque-posicao-item-head">
                  <td colSpan={4}>
                    <div className="estoque-posicao-item">
                      <div className="estoque-posicao-item-id" title={nome || undefined}>
                        <strong>{codigo}</strong>
                        {nome ? <span className="muted">{nome}</span> : null}
                      </div>
                      <div className="estoque-posicao-item-meta">
                        <span>
                          <strong>{formatQty(s.qtde)}</strong>{' '}
                          <span className="table-muted">{s.unidade}</span>
                        </span>
                        {s.controla_lote ? (
                          <span className="table-muted">
                            {nVol} vol.
                          </span>
                        ) : null}
                        {familia ? (
                          <span className="table-muted" title={familiaLabel(familia)}>
                            {familia}
                          </span>
                        ) : null}
                      </div>
                      <div className="estoque-posicao-item-acoes table-actions">
                        {s.controla_lote ? (
                          <button
                            type="button"
                            className="btn-icon"
                            title="Ver volumes"
                            aria-label={`Ver volumes de ${codigo}`}
                            onClick={() => onAbrirVolumes(s.produto_id, s.produto?.codigo)}
                          >
                            <IconEye />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn-icon"
                          title="Extrato"
                          aria-label={`Extrato de ${codigo}`}
                          onClick={() => onExtrato(s.produto_id)}
                        >
                          <IconOrcamento />
                        </button>
                        {hasPermission('produto.ler') ? (
                          <Link
                            to={`/produtos/${s.produto_id}`}
                            className="btn-icon"
                            title="Cadastro"
                            aria-label={`Cadastro de ${codigo}`}
                          >
                            <IconProduct />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </td>
                </tr>
                {item.formatos.map((faixa) => (
                  <tr
                    key={faixa.key}
                    className="estoque-posicao-formato clickable"
                    tabIndex={0}
                    role="link"
                    onClick={() => onAbrirFormato(s.produto_id, s.produto?.codigo ?? undefined, faixa)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onAbrirFormato(s.produto_id, s.produto?.codigo ?? undefined, faixa);
                      }
                    }}
                  >
                    <td className="dimensao">
                      {formatVolumeDimensao(faixa.largura_mm, faixa.comprimento_m)}
                    </td>
                    <td className="num">
                      {formatQtyCompact(faixa.qtde)}{' '}
                      <span className="table-muted">{faixa.unidade}</span>
                    </td>
                    <td className="num">{faixa.volumes}</td>
                    <td>
                      {faixa.locais.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        <ul className="estoque-posicao-locais">
                          {faixa.locais.map((local) => (
                            <li key={local.key} className="estoque-posicao-local">
                              {local.codigo ? (
                                <span>{local.codigo}</span>
                              ) : (
                                <Link
                                  to="/estoque/guardar"
                                  className="estoque-posicao-sem-local"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  Sem local
                                </Link>
                              )}
                              <span className="table-muted">{local.volumes}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
