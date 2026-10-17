import { Link, useNavigate } from 'react-router-dom';
import { linhasConsolidado, type LinhaConsolidado } from '../lib/estoqueUi';
import { formatQty } from '../lib/format';
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

export function EstoqueConsolidadoPanel({ saldos, q, familia }: Props) {
  const navigate = useNavigate();
  const linhas = linhasConsolidado(saldos, q, familia);

  if (linhas.length === 0) {
    return <div className="empty-state">Nenhum item nesta posição com o filtro atual.</div>;
  }

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
              <th className="acoes" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
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
