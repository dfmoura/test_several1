import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LocalSaldoCampo, rotuloLocal } from './LocalSaldoCampo';
import { StatusPill } from './StatusPill';
import {
  IconChevronDown,
  IconMapPin,
  IconRastreio,
  IconTag,
} from './NavIcons';
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

type Linha = ReturnType<typeof linhasPosicao>[number];

type Props = {
  itens: ItemPosicao[];
  podeMarcarLocal?: boolean;
  podeRastreio?: boolean;
  /** Com filtro de validade, as linhas compatíveis abrem os volumes. */
  expandirVolumes?: boolean;
  onLocalSalvo?: () => void;
};

function produtoNome(s: ItemPosicao['saldo']): string {
  return (
    s.produto?.descricao_comercial?.trim() ||
    s.produto?.descricao_fiscal?.trim() ||
    ''
  );
}

function chaveLinha(linha: Linha): string {
  return linha.formato?.key ?? `sku-${linha.saldo.id}`;
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

export function EstoquePosicaoPanel({
  itens,
  podeMarcarLocal,
  podeRastreio,
  expandirVolumes = false,
  onLocalSalvo,
}: Props) {
  const navigate = useNavigate();
  const linhas = linhasPosicao(itens);
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
  const filtroAberto = useRef(expandirVolumes);
  const chaveLista = linhas.map(chaveLinha).join('\n');

  useEffect(() => {
    if (expandirVolumes) {
      setAbertos(new Set(chaveLista.split('\n').filter(Boolean)));
    } else if (filtroAberto.current) {
      setAbertos(new Set());
    }
    filtroAberto.current = expandirVolumes;
  }, [expandirVolumes, chaveLista]);

  if (linhas.length === 0) {
    return <div className="empty-state">Nenhum item nesta posição com o filtro atual.</div>;
  }

  const alternar = (chave: string) => {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  };

  return (
    <div className="estoque-posicao">
      <div className="table-wrap table-wrap--freeze">
        <table className="data-table estoque-dense-table estoque-posicao-table">
          <thead>
            <tr>
              <th className="estoque-posicao-col-abre" aria-label="Volumes" />
              <th>Produto</th>
              <th>Dimensão</th>
              <th className="num">Quantidade</th>
              <th className="num">Volumes</th>
              <th>Situação</th>
              <th>Local</th>
              <th className="acoes" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => {
              const s = linha.saldo;
              const chave = chaveLinha(linha);
              const codigo = s.produto?.codigo ?? '—';
              const nome = produtoNome(s);
              const produto = nome ? `${codigo}  ${nome}` : codigo;
              const qtde = linha.formato?.qtde ?? s.qtde;
              const unidade = linha.formato?.unidade ?? s.unidade;
              const volumes = volumesDaLinha(s, linha.formato);
              const nVolumes = linha.formato
                ? linha.formato.volumes
                : s.controla_lote
                  ? (s.lotes_count ?? 0)
                  : null;
              const locaisVolume = (linha.formato?.locais ?? [])
                .map((l) => l.codigo)
                .filter((c): c is string => Boolean(c));
              const aberto = abertos.has(chave);
              const expande = volumes.length > 0;
              const pior = volumes[0];
              const abrirLinha = () => {
                if (expande) {
                  alternar(chave);
                  return;
                }
                navigate(`/estoque/extrato/${s.produto_id}`);
              };

              return (
                <Fragment key={chave}>
                  <tr
                    className={`estoque-posicao-linha clickable${aberto ? ' is-open' : ''}`}
                    onClick={abrirLinha}
                  >
                    <td className="estoque-posicao-col-abre">
                      {expande ? (
                        <button
                          type="button"
                          className={`estoque-posicao-abre${aberto ? ' is-open' : ''}`}
                          aria-expanded={aberto}
                          aria-label={
                            aberto ? `Ocultar volumes de ${codigo}` : `Volumes de ${codigo}`
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            alternar(chave);
                          }}
                        >
                          <IconChevronDown />
                        </button>
                      ) : null}
                    </td>
                    <td className="produto" title={produto}>
                      {produto}
                    </td>
                    <td className="dimensao">
                      {linha.formato
                        ? formatVolumeDimensao(
                            linha.formato.largura_mm,
                            linha.formato.comprimento_m,
                          )
                        : '—'}
                    </td>
                    <td className="num">
                      {formatQty(qtde)} {unidade}
                    </td>
                    <td className="num">{nVolumes == null ? '—' : nVolumes}</td>
                    <td>
                      {pior && situacaoCritica(pior.status) ? (
                        <SituacaoVolume volume={pior} />
                      ) : (
                        <span className="table-muted">—</span>
                      )}
                    </td>
                    <td
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {!s.controla_lote && podeMarcarLocal && onLocalSalvo ? (
                        <LocalSaldoCampo
                          produtoId={s.produto_id}
                          local={s.local}
                          onSaved={onLocalSalvo}
                        />
                      ) : s.controla_lote ? (
                        locaisVolume.length > 0 ? (
                          locaisVolume.join(', ')
                        ) : (
                          '—'
                        )
                      ) : (
                        rotuloLocal(s.local) || 'Sem local'
                      )}
                    </td>
                    <td
                      className="acoes"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Link
                        to={`/estoque/extrato/${s.produto_id}`}
                        className="linkish linkish--meta"
                      >
                        Extrato
                      </Link>
                    </td>
                  </tr>
                  {aberto
                    ? volumes.map((volume, idx) => (
                        <VolumeLinha
                          key={volume.id ?? `${chave}-${volume.codigo ?? idx}`}
                          volume={volume}
                          formato={linha.formato}
                          podeRastreio={podeRastreio}
                        />
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VolumeLinha({
  volume,
  formato,
  podeRastreio,
}: {
  volume: VolumePosicao;
  formato: FormatoPosicao | null;
  podeRastreio?: boolean;
}) {
  const codigo = volume.codigo?.trim() || '—';
  const unidade = volume.unidade ?? formato?.unidade ?? '';
  return (
    <tr className="estoque-posicao-volume">
      <td className="estoque-posicao-col-abre" />
      <td className="produto" title={codigo}>
        <span className="estoque-posicao-volume-codigo">{codigo}</span>
      </td>
      <td className="dimensao">
        {formato
          ? formatVolumeDimensao(formato.largura_mm, formato.comprimento_m)
          : '—'}
      </td>
      <td className="num">
        {formatQty(volume.qtde)} {unidade}
      </td>
      <td className="num table-muted">—</td>
      <td>
        <SituacaoVolume volume={volume} />
      </td>
      <td>{volume.endereco?.codigo ?? <span className="muted">—</span>}</td>
      <td className="acoes">
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
        </div>
      </td>
    </tr>
  );
}
