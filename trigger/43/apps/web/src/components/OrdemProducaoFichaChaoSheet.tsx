import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import {
  identidadeParteComercial,
  metaLinhasParteComercial,
} from './OrcPubParteComercial';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import { SaidaEtiquetaBadge } from './SaidaEtiquetaBadge';
import type { OrdemProducao, Pedido } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatDecimalBr } from '../lib/format';
import { formatEnderecoParceiro } from '../lib/pedidoConfirmacao';
import {
  itemPedidoDaOp,
  linhasIdentidadeChao,
  linhasProducaoChao,
  linhasRetiradaChao,
  opFichaChaoMeta,
  type OpFichaChaoRetiradaLinha,
} from '../lib/opFichaChao';
import { textoMaquinaFlexo } from '../lib/opFichaFlexo';
import type {
  PedidoPlanilhaComercialLinha,
  PedidoPlanilhaProducaoModeloLinha,
} from '../lib/pedidoFichaPlanilha';
import { formatDateTimeBr, opChipClass, specOperacional } from '../lib/producaoFicha';
import { opStatusLabel } from '../lib/producaoUi';
import { isSaidaEtiqueta } from '../lib/saidaEtiqueta';

/**
 * Ficha de chão unificada — impressão, acabamento e retirada (A4 paisagem).
 * Satélite da ficha flexo. Confirmar saída só na tela A buscar.
 * Produção: 1 linha por modelo. Retirada: volume a volume (bobina em m + m² + QR).
 */
export type OrdemProducaoFichaChaoSheetProps = {
  ordem: OrdemProducao;
  pedido: Pedido | null;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

function dashCell(value: string | null | undefined): string {
  const s = (value ?? '').trim();
  return s && s !== '—' ? s : '—';
}

function fmtQtd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const scale = Math.abs(value - Math.round(value)) < 1e-6 ? 0 : 2;
  return formatDecimalBr(value, scale, { stripTrailingZeros: true });
}

function fmtCm(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  return formatDecimalBr(value, digits, { stripTrailingZeros: true });
}

function TabelaIdentidade({ linhas }: { linhas: PedidoPlanilhaComercialLinha[] }) {
  return (
    <table className="ficha-table op-chao-table op-chao-table--identidade">
      <thead>
        <tr>
          <th>Item</th>
          <th className="ficha-td-num">Quant.</th>
          <th>Medida</th>
          <th className="ficha-td-num">Largura</th>
          <th className="ficha-td-num">Puxada</th>
          <th>Modelo</th>
          <th>Material</th>
          <th>Obs</th>
          <th>Cores</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((ln) => (
          <tr key={ln.key}>
            <td className="ficha-td-num">{ln.itemOrdem}</td>
            <td className="ficha-td-num">{fmtQtd(ln.quant)}</td>
            <td>{ln.primeiraDoItem ? dashCell(ln.medida) : '—'}</td>
            <td className="ficha-td-num">
              {ln.primeiraDoItem ? fmtCm(ln.larguraCm) : '—'}
            </td>
            <td className="ficha-td-num">
              {ln.primeiraDoItem ? fmtCm(ln.puxadaCm, 4) : '—'}
            </td>
            <td>{dashCell(ln.modelo)}</td>
            <td>{ln.primeiraDoItem ? dashCell(ln.material) : '—'}</td>
            <td className="op-chao-obs">{dashCell(ln.obs)}</td>
            <td>{dashCell(ln.cores)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelaImpressao({ linhas }: { linhas: PedidoPlanilhaProducaoModeloLinha[] }) {
  return (
    <table className="ficha-table op-chao-table op-chao-table--impressao">
      <thead>
        <tr>
          <th>Item</th>
          <th>Modelo</th>
          <th>Troca de produto</th>
          <th className="ficha-td-num" title="Largura × colunas de produção">
            Largura do papel
          </th>
          <th className="ficha-td-num">Qdade colunas produção</th>
          <th className="ficha-td-num">Metragem linear</th>
          <th className="ficha-td-num">M²</th>
          <th>Acabamento</th>
          <th>Tubete</th>
          <th>Formato da faca</th>
          <th className="ficha-td-num">Nº faca</th>
          <th className="ficha-td-num">Z faca</th>
          <th>Saída</th>
          <th>Máquina</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((ln) => (
          <tr key={ln.key}>
            <td className="ficha-td-num">{ln.itemOrdem}</td>
            <td>{dashCell(ln.modelo)}</td>
            <td>{dashCell(ln.trocaProduto)}</td>
            <td className="ficha-td-num">{fmtCm(ln.larguraPapelCm)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.colunasProducao)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.metragemLinear)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.m2)}</td>
            <td>{dashCell(ln.acabamento)}</td>
            <td>{dashCell(ln.tubete)}</td>
            <td>{dashCell(ln.formatoFaca)}</td>
            <td className="ficha-td-num">{dashCell(ln.nFaca)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.z)}</td>
            <td className="op-chao-saida">
              {ln.saidaCodigo && isSaidaEtiqueta(ln.saidaCodigo) ? (
                <SaidaEtiquetaBadge code={ln.saidaCodigo} variant="dense" />
              ) : (
                '—'
              )}
            </td>
            <td>{dashCell(ln.maquina)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Só exclusivos de rebobinação — metragem/acabamento/tubete/saída ficam na impressão. */
function TabelaAcabamento({ linhas }: { linhas: PedidoPlanilhaProducaoModeloLinha[] }) {
  return (
    <table className="ficha-table op-chao-table op-chao-table--acabamento">
      <thead>
        <tr>
          <th>Modelo</th>
          <th className="ficha-td-num">Qdade colunas rebobinação</th>
          <th className="ficha-td-num">Qdade etiquetas p/ rolo</th>
          <th className="ficha-td-num">Qdade de rolos</th>
          <th className="ficha-td-num">Qdade metros / rolo</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((ln) => (
          <tr key={ln.key}>
            <td>{dashCell(ln.modelo)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.colunasRebobinacao)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.etiqPorRolo)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.rolos)}</td>
            <td className="ficha-td-num">{fmtQtd(ln.metrosPorRolo)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Caminhada na prateleira — volume a volume; bobina em m + m² + QR. */
function TabelaRetirada({ linhas }: { linhas: OpFichaChaoRetiradaLinha[] }) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const qrKey = linhas.map((l) => `${l.key}:${l.qr_payload ?? ''}`).join('|');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        linhas.map(async (l) => {
          if (!l.qr_payload) return;
          next[l.key] = await QRCode.toDataURL(l.qr_payload, {
            width: 80,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' },
          });
        }),
      );
      if (!cancelled) setQrMap(next);
    })();
    return () => {
      cancelled = true;
    };
    // qrKey espelha payloads; linhas é estável via useMemo no pai
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrKey]);

  return (
    <table className="ficha-table op-chao-table op-chao-table--retirada">
      <thead>
        <tr>
          <th className="op-chao-th-check" scope="col">
            Levado
          </th>
          <th scope="col">Local</th>
          <th scope="col">Volume</th>
          <th scope="col">QR</th>
          <th scope="col">Material</th>
          <th scope="col">Dimensão</th>
          <th className="ficha-td-num" scope="col">
            Levar
          </th>
          <th className="ficha-td-num" scope="col">
            M²
          </th>
          <th scope="col">Validade</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((ln) => {
          const perda = ln.situacao === 'perda';
          return (
            <tr key={ln.key} className={perda ? 'op-chao-row--perda' : undefined}>
              <td className="op-chao-td-check">
                {perda ? (
                  <span className="op-chao-perda-marca" title="Perda — não levar">
                    —
                  </span>
                ) : (
                  <span className="ficha-pick-check" aria-hidden />
                )}
              </td>
              <td className="op-chao-local">{dashCell(ln.local)}</td>
              <td className="op-chao-volume">{dashCell(ln.volume)}</td>
              <td className="op-chao-qr">
                {perda ? (
                  '—'
                ) : qrMap[ln.key] ? (
                  <img
                    className="ficha-pick-qr"
                    src={qrMap[ln.key]}
                    alt={`QR ${ln.volume}`}
                    width={48}
                    height={48}
                  />
                ) : ln.qr_payload ? (
                  <span className="ficha-pick-qr-hri">{ln.qr_payload}</span>
                ) : (
                  '—'
                )}
              </td>
              <td>{dashCell(ln.material)}</td>
              <td className="op-chao-dimensao">{dashCell(ln.dimensao)}</td>
              <td className={`ficha-td-num${perda ? ' op-chao-levar--perda' : ''}`}>
                {dashCell(ln.levar)}
              </td>
              <td className="ficha-td-num">{dashCell(ln.m2)}</td>
              <td>{dashCell(ln.validade)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function OrdemProducaoFichaChaoSheet({
  ordem: o,
  pedido,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: OrdemProducaoFichaChaoSheetProps) {
  const meta = opFichaChaoMeta();
  const item = itemPedidoDaOp(o, pedido);
  const identidade = useMemo(
    () => (pedido && item ? linhasIdentidadeChao(pedido, item) : []),
    [pedido, item],
  );
  const producao = useMemo(
    () => (pedido && item ? linhasProducaoChao(pedido, item) : []),
    [pedido, item],
  );
  const retirada = useMemo(() => linhasRetiradaChao(o), [o]);
  const spec = pedido && item ? specOperacional(pedido, item) : {};
  const maquina = textoMaquinaFlexo(spec);
  const pedCodigo = o.pedido?.codigo ?? pedido?.codigo ?? '—';
  const parceiro = pedido?.parceiro ?? o.parceiro ?? null;
  const cliente = identidadeParteComercial(parceiro, parceiro?.razao_social ?? '—');
  const clienteCodigo = (parceiro?.codigo ?? '').trim();
  const clienteLead = clienteCodigo
    ? `${clienteCodigo} — ${cliente.display}`
    : cliente.display;
  const clienteMeta = [
    ...metaLinhasParteComercial(parceiro, { showCodigo: false, showDocumento: false }),
    formatEnderecoParceiro(pedido?.parceiro) ?? '',
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' · ');
  const produto =
    (o.pedido_item?.descricao ?? item?.descricao ?? '').trim() || 'Ordem de produção';
  const qtdePlanejada = formatDecimalBr(Number(o.qtde_planejada), 0);

  return (
    <article
      className="ficha-sheet ped-ficha ficha-sheet-op-chao ficha-sheet-op-chao--unificada"
      aria-label={`${meta.titulo} da ordem ${o.codigo}`}
    >
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">{meta.docLabel}</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{o.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{meta.titulo}</h2>
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${opChipClass(o.status)}`.trim()}>
            {opStatusLabel(o.status)}
          </span>
          {maquina ? <span className="ficha-chip ficha-op-maquina">{maquina}</span> : null}
          <span className="ficha-chip ficha-chip-muted">{pedCodigo}</span>
        </div>
      </div>

      <section className="ficha-party">
        <h3>Cliente</h3>
        <p className="ficha-party-lead">{clienteLead}</p>
        <p className="ficha-party-meta">{clienteMeta || '—'}</p>
      </section>

      <div className="ficha-kv-strip op-chao-kv">
        <FichaKv label="Pedido" value={pedCodigo} />
        <FichaKv label="Qtde planejada" value={qtdePlanejada} />
        <FichaKv label="Produto" value={produto} />
      </div>

      <FichaSection title="Identidade do item">
        {identidade.length === 0 ? (
          <p className="ficha-empty">
            Sem especificação do item do pedido para montar a identidade.
          </p>
        ) : (
          <TabelaIdentidade linhas={identidade} />
        )}
      </FichaSection>

      <FichaSection title={meta.secaoImpressao}>
        <p className="op-chao-hint">{meta.hintImpressao}</p>
        {producao.length === 0 ? (
          <p className="ficha-empty">
            Sem especificação do item do pedido para montar os parâmetros de chão.
          </p>
        ) : (
          <TabelaImpressao linhas={producao} />
        )}
      </FichaSection>

      <FichaSection title={meta.secaoAcabamento}>
        {producao.length === 0 ? (
          <p className="ficha-empty">
            Sem especificação do item do pedido para montar a rebobinação.
          </p>
        ) : (
          <TabelaAcabamento linhas={producao} />
        )}
      </FichaSection>

      <FichaSection title={meta.secaoRetirada}>
        <p className="op-chao-hint">{meta.hintRetirada}</p>
        {retirada.length === 0 ? (
          <p className="ficha-empty">Sem kit nesta ordem — nada a buscar na prateleira.</p>
        ) : (
          <TabelaRetirada linhas={retirada} />
        )}
      </FichaSection>

      <RegistroMetaStrip
        registro={{
          criado_por: o.criado_por,
          atualizado_por: o.atualizado_por ?? o.criado_por,
          created_at: o.created_at,
          updated_at: o.updated_at ?? o.created_at,
        }}
        className="ficha-autoria"
      />

      <footer className="ficha-footer">
        <span>
          Uso interno · {o.codigo} · ficha de chão · emitido por {emitidoPor}
        </span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
