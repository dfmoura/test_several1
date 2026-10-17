import { Link, useNavigate } from 'react-router-dom';
import { IconMapPin, IconRastreio, IconTag } from './NavIcons';
import { StatusPill } from './StatusPill';
import {
  linhasPosicao,
  volumesDaLinha,
  type FormatoPosicao,
  type ItemPosicao,
  type VolumePosicao,
} from '../lib/estoqueUi';
import { formatDate, formatQty } from '../lib/format';
import { validadeStatusLabel } from '../lib/produtoLotePolitica';
import { formatVolumeDimensao } from '../lib/volumeEtiquetaPrint';

type SaldoLinha = ItemPosicao['saldo'];

type Registro =
  | { tipo: 'item'; key: string; saldo: SaldoLinha }
  | {
      tipo: 'volume';
      key: string;
      saldo: SaldoLinha;
      formato: FormatoPosicao;
      volume: VolumePosicao;
    };

type Props = {
  itens: ItemPosicao[];
  podeRastreio?: boolean;
  /** Quando a tela filtra validade, a grade mostra só os volumes dessa situação. */
  situacao?: string;
};

function produtoNome(s: SaldoLinha): string {
  return (
    s.produto?.descricao_comercial?.trim() ||
    s.produto?.descricao_fiscal?.trim() ||
    ''
  );
}

function rotuloProduto(s: SaldoLinha): string {
  const codigo = s.produto?.codigo ?? '—';
  const nome = produtoNome(s);
  return nome ? `${codigo}  ${nome}` : codigo;
}

function codigoLocal(codigo: string | null | undefined): string | null {
  const c = codigo?.trim();
  return c ? c : null;
}

function situacaoCritica(status: string | null | undefined): boolean {
  return status === 'VENCIDO' || status === 'A_VENCER';
}

function SituacaoVolume({ volume }: { volume: VolumePosicao }) {
  const label = volume.status_label || validadeStatusLabel(volume.status);
  const data = volume.data_validade ? formatDate(volume.data_validade) : null;
  return (
    <>
      {situacaoCritica(volume.status) ? (
        <StatusPill status={label} />
      ) : (
        <span className="table-muted">{label}</span>
      )}
      {data ? <div className="table-muted">{data}</div> : null}
    </>
  );
}

function CelulaVazia() {
  return <span className="muted">—</span>;
}

function registrosDaPosicao(itens: ItemPosicao[], situacao: string): Registro[] {
  const out: Registro[] = [];
  for (const linha of linhasPosicao(itens)) {
    const formato = linha.formato;
    const volumes = volumesDaLinha(linha.saldo, formato).filter(
      (volume) => !situacao || volume.status === situacao,
    );
    if (!formato || volumes.length === 0) {
      if (situacao || formato) continue;
      out.push({ tipo: 'item', key: `sku-${linha.saldo.id}`, saldo: linha.saldo });
      continue;
    }
    volumes.forEach((volume, idx) => {
      out.push({
        tipo: 'volume',
        key: volume.id != null ? `vol-${volume.id}` : `${formato.key}-${volume.codigo ?? idx}`,
        saldo: linha.saldo,
        formato,
        volume,
      });
    });
  }
  return out;
}

export function EstoquePosicaoPanel({ itens, podeRastreio, situacao = '' }: Props) {
  const navigate = useNavigate();
  const registros = registrosDaPosicao(itens, situacao);

  if (registros.length === 0) {
    return <div className="empty-state">Nenhum item nesta posição com o filtro atual.</div>;
  }

  return (
    <div className="estoque-posicao">
      <div className="table-wrap table-wrap--freeze">
        <table className="data-table estoque-dense-table estoque-posicao-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Volume</th>
              <th>Dimensão</th>
              <th className="num">Quantidade</th>
              <th>Situação</th>
              <th>Local</th>
              <th className="acoes" />
            </tr>
          </thead>
          <tbody>
            {registros.map((registro) => {
              const produto = rotuloProduto(registro.saldo);
              const extrato = `/estoque/extrato/${registro.saldo.produto_id}`;
              if (registro.tipo === 'item') {
                const local = codigoLocal(registro.saldo.local?.codigo);
                return (
                  <tr
                    key={registro.key}
                    className="estoque-posicao-linha clickable"
                    onClick={() => navigate(extrato)}
                  >
                    <td className="produto" title={produto}>
                      {produto}
                    </td>
                    <td>
                      <CelulaVazia />
                    </td>
                    <td className="dimensao">
                      <CelulaVazia />
                    </td>
                    <td className="num">
                      {formatQty(registro.saldo.qtde)} {registro.saldo.unidade}
                    </td>
                    <td>
                      <CelulaVazia />
                    </td>
                    <td>{local ?? <CelulaVazia />}</td>
                    <td className="acoes" onClick={(e) => e.stopPropagation()}>
                      <Link to={extrato} className="linkish linkish--meta">
                        Extrato
                      </Link>
                    </td>
                  </tr>
                );
              }

              const { volume, formato } = registro;
              const codigo = volume.codigo?.trim() || '—';
              const unidade = volume.unidade ?? formato.unidade ?? '';
              const local = codigoLocal(volume.endereco?.codigo);
              return (
                <tr
                  key={registro.key}
                  className="estoque-posicao-linha clickable"
                  onClick={() => navigate(extrato)}
                >
                  <td className="produto" title={produto}>
                    {produto}
                  </td>
                  <td title={codigo}>
                    <span className="estoque-posicao-volume-codigo">{codigo}</span>
                  </td>
                  <td className="dimensao">
                    {formatVolumeDimensao(formato.largura_mm, formato.comprimento_m)}
                  </td>
                  <td className="num">
                    {formatQty(volume.qtde)} {unidade}
                  </td>
                  <td>
                    <SituacaoVolume volume={volume} />
                  </td>
                  <td>{local ?? <CelulaVazia />}</td>
                  <td className="acoes" onClick={(e) => e.stopPropagation()}>
                    <div className="table-actions">
                      {volume.id ? (
                        <Link
                          to={`/estoque/lotes/${volume.id}/etiqueta`}
                          className="btn-icon"
                          title="Etiqueta do volume"
                          aria-label={`Etiqueta do volume ${codigo}`}
                        >
                          <IconTag />
                        </Link>
                      ) : null}
                      {!volume.endereco_id ? (
                        <Link
                          to="/estoque/guardar"
                          className="btn-icon"
                          title="Guardar no local"
                          aria-label={`Guardar volume ${codigo} no local`}
                        >
                          <IconMapPin />
                        </Link>
                      ) : null}
                      {podeRastreio && volume.codigo ? (
                        <Link
                          to={`/rastreio?q=${encodeURIComponent(volume.codigo)}`}
                          className="btn-icon"
                          title="Rastreio do volume"
                          aria-label={`Rastreio do volume ${codigo}`}
                        >
                          <IconRastreio />
                        </Link>
                      ) : null}
                      <Link to={extrato} className="linkish linkish--meta">
                        Extrato
                      </Link>
                    </div>
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
