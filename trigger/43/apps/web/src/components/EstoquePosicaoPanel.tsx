import { type KeyboardEvent } from 'react';
import { LocalSaldoCampo, rotuloLocal } from './LocalSaldoCampo';
import type { FormatoPosicao, ItemPosicao } from '../lib/estoqueUi';
import { linhasPosicao } from '../lib/estoqueUi';
import { formatQty } from '../lib/format';
import { formatVolumeDimensao } from '../lib/volumeEtiquetaPrint';

type Linha = ReturnType<typeof linhasPosicao>[number];

type Props = {
  itens: ItemPosicao[];
  podeMarcarLocal?: boolean;
  onAbrirFormato: (produtoId: number, codigo: string | undefined, faixa: FormatoPosicao) => void;
  onAbrirVolumes: (produtoId: number, codigo?: string | null) => void;
  onLocalSalvo?: () => void;
};

function produtoNome(s: ItemPosicao['saldo']): string {
  return (
    s.produto?.descricao_comercial?.trim() ||
    s.produto?.descricao_fiscal?.trim() ||
    ''
  );
}

function activateRow(e: KeyboardEvent, go: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    go();
  }
}

export function EstoquePosicaoPanel({
  itens,
  podeMarcarLocal,
  onAbrirFormato,
  onAbrirVolumes,
  onLocalSalvo,
}: Props) {
  const linhas = linhasPosicao(itens);

  if (linhas.length === 0) {
    return (
      <div className="empty-state">
        Nenhum item nesta posição com o filtro atual.
      </div>
    );
  }

  const abrir = (linha: Linha) => {
    const codigo = linha.saldo.produto?.codigo ?? undefined;
    if (linha.formato) {
      onAbrirFormato(linha.saldo.produto_id, codigo, linha.formato);
      return;
    }
    onAbrirVolumes(linha.saldo.produto_id, codigo);
  };

  return (
    <div className="estoque-posicao">
      <div className="table-wrap table-wrap--freeze">
        <table className="data-table estoque-dense-table estoque-posicao-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Dimensão</th>
              <th className="num">Quantidade</th>
              <th className="num">Volumes</th>
              <th>Local</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => {
              const s = linha.saldo;
              const codigo = s.produto?.codigo ?? '—';
              const nome = produtoNome(s);
              const produto = nome ? `${codigo}  ${nome}` : codigo;
              const qtde = linha.formato?.qtde ?? s.qtde;
              const unidade = linha.formato?.unidade ?? s.unidade;
              const volumes = linha.formato
                ? linha.formato.volumes
                : (s.controla_lote ? (s.lotes_count ?? 0) : null);
              const locaisVolume = (linha.formato?.locais ?? [])
                .map((l) => l.codigo)
                .filter((c): c is string => Boolean(c));
              return (
                <tr
                  key={linha.formato?.key ?? `sku-${s.id}`}
                  className="estoque-posicao-linha clickable"
                  tabIndex={0}
                  role="link"
                  onClick={() => abrir(linha)}
                  onKeyDown={(e) => activateRow(e, () => abrir(linha))}
                >
                  <td className="produto" title={produto}>
                    {produto}
                  </td>
                  <td className="dimensao">
                    {linha.formato
                      ? formatVolumeDimensao(linha.formato.largura_mm, linha.formato.comprimento_m)
                      : '—'}
                  </td>
                  <td className="num">
                    {formatQty(qtde)} {unidade}
                  </td>
                  <td className="num">{volumes == null ? '—' : volumes}</td>
                  <td>
                    {!s.controla_lote && podeMarcarLocal && onLocalSalvo ? (
                      <LocalSaldoCampo
                        produtoId={s.produto_id}
                        local={s.local}
                        onSaved={onLocalSalvo}
                      />
                    ) : s.controla_lote ? (
                      locaisVolume.length > 0 ? locaisVolume.join(', ') : '—'
                    ) : (
                      rotuloLocal(s.local) || 'Sem local'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
