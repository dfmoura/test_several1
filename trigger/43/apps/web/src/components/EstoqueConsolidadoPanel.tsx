import { Link, useNavigate } from 'react-router-dom';
import { SortableTh } from './SortableTh';
import { linhasConsolidado, type LinhaConsolidado } from '../lib/estoqueUi';
import { formatQty } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';
import { formatVolumeDimensao } from '../lib/volumeEtiquetaPrint';
import type { EstoqueSaldo } from '../lib/api';

type Props = {
  saldos: EstoqueSaldo[];
  q: string;
  familia: string;
};

function produtoNome(s: EstoqueSaldo): string {
  return (
    s.produto?.descricao_comercial?.trim() ||
    s.produto?.descricao_fiscal?.trim() ||
    ''
  );
}

function rotuloProduto(s: EstoqueSaldo): string {
  const codigo = s.produto?.codigo ?? '—';
  const nome = produtoNome(s);
  return nome ? `${codigo}  ${nome}` : codigo;
}

function CelulaVazia() {
  return <span className="muted">—</span>;
}

const SORT = {
  produto: (l: LinhaConsolidado<EstoqueSaldo>) => rotuloProduto(l.saldo),
  dimensao: (l: LinhaConsolidado<EstoqueSaldo>) =>
    formatVolumeDimensao(l.largura_mm, l.comprimento_m),
  qtde: (l: LinhaConsolidado<EstoqueSaldo>) => Number(l.qtde),
  volumes: (l: LinhaConsolidado<EstoqueSaldo>) => l.volumes,
};

export function EstoqueConsolidadoPanel({ saldos, q, familia }: Props) {
  const navigate = useNavigate();
  const linhas = linhasConsolidado(saldos, q, familia);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(linhas, SORT);

  if (linhas.length === 0) {
    return <div className="empty-state">Nenhum item nesta posição com o filtro atual.</div>;
  }

  return (
    <div className="estoque-posicao">
      <div className="table-wrap table-wrap--freeze">
        <table className="data-table estoque-dense-table estoque-posicao-table">
          <thead>
            <tr>
              <SortableTh column="produto" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                Produto
              </SortableTh>
              <SortableTh column="dimensao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                Dimensão
              </SortableTh>
              <SortableTh
                column="qtde"
                sorts={sorts}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="num"
              >
                Quantidade
              </SortableTh>
              <SortableTh
                column="volumes"
                sorts={sorts}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="num"
              >
                Volumes
              </SortableTh>
              <th className="acoes" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((linha) => (
              <Linha key={linha.key} linha={linha} onOpen={(to) => navigate(to)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Linha({
  linha,
  onOpen,
}: {
  linha: LinhaConsolidado<EstoqueSaldo>;
  onOpen: (to: string) => void;
}) {
  const produto = rotuloProduto(linha.saldo);
  const extrato = `/estoque/extrato/${linha.saldo.produto_id}`;
  const dimensao = formatVolumeDimensao(linha.largura_mm, linha.comprimento_m);

  return (
    <tr className="estoque-posicao-linha clickable" onClick={() => onOpen(extrato)}>
      <td className="produto" title={produto}>
        {produto}
      </td>
      <td className="dimensao">{dimensao === '—' ? <CelulaVazia /> : dimensao}</td>
      <td className="num">
        {formatQty(linha.qtde)} {linha.unidade}
      </td>
      <td className="num">{linha.volumes == null ? <CelulaVazia /> : linha.volumes}</td>
      <td className="acoes" onClick={(e) => e.stopPropagation()}>
        <Link to={extrato} className="linkish linkish--meta">
          Extrato
        </Link>
      </td>
    </tr>
  );
}
