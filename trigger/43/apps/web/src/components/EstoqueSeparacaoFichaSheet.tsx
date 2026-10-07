import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { TriggerAttribution } from './TriggerAttribution';
import type { EstoqueSeparacaoDetalhe, EstoqueSeparacaoVolumeMarcado, OpRetiradaVolume } from '../lib/api';
import { formatDate, formatDateTime, formatDecimalBr } from '../lib/format';

type Linha = {
  key: string;
  local: string;
  codigo: string;
  levar: string;
  validade: string;
  qr_payload: string | null;
};

type Props = {
  detalhe: EstoqueSeparacaoDetalhe;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
  /** Volumes marcados na tela, quando a ficha abre antes de confirmar. */
  marcados?: Array<{ lote_id: number; qtde: string }>;
};

function linhaDeVolume(v: OpRetiradaVolume, qtde?: string): Linha {
  const levar = qtde ?? v.qtde_retirar;
  return {
    key: String(v.lote_id ?? v.codigo),
    local: v.endereco?.codigo ?? '—',
    codigo: v.codigo ?? '—',
    levar: `${formatDecimalBr(levar, 4, { stripTrailingZeros: true })} ${v.unidade ?? ''}`.trim(),
    validade: v.data_validade ? formatDate(v.data_validade) : '—',
    qr_payload: v.qr_payload ?? null,
  };
}

function linhaGravada(v: EstoqueSeparacaoVolumeMarcado): Linha {
  return {
    key: String(v.lote_id),
    local: v.endereco ?? '—',
    codigo: v.codigo ?? '—',
    levar: `${formatDecimalBr(v.qtde, 4, { stripTrailingZeros: true })} ${v.unidade ?? ''}`.trim(),
    validade: '—',
    qr_payload: v.qr_payload ?? null,
  };
}

export function linhasDaSeparacao(
  detalhe: EstoqueSeparacaoDetalhe,
  marcados?: Array<{ lote_id: number; qtde: string }>,
): Linha[] {
  const todos = [...(detalhe.retirada.volumes ?? []), ...(detalhe.retirada.candidatos ?? [])];
  if (marcados && marcados.length > 0) {
    return marcados.flatMap((m) => {
      const vol = todos.find((v) => v.lote_id === m.lote_id);
      return vol ? [linhaDeVolume(vol, m.qtde)] : [];
    });
  }
  if (detalhe.separacao && detalhe.separacao.volumes.length > 0) {
    return detalhe.separacao.volumes.map(linhaGravada);
  }
  return (detalhe.retirada.volumes ?? [])
    .filter((v) => Number(v.qtde_retirar) > 0)
    .map((v) => linhaDeVolume(v));
}

/**
 * Folha que o almoxarifado leva na mão para a revenda.
 * Não baixa saldo — a saída oficial é a NF-e.
 * Cada volume: local + QR utilizável no chão.
 */
export function EstoqueSeparacaoFichaSheet({
  detalhe,
  empresaNome,
  emitidoPor,
  emitidoEm,
  marcados,
}: Props) {
  const nome = detalhe.produto
    ? `${detalhe.produto.codigo} · ${detalhe.produto.descricao}`
    : detalhe.descricao;
  const linhas = linhasDaSeparacao(detalhe, marcados);
  const primeiro = linhas.find((l) => l.local !== '—')?.local ?? 'Sem local';
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        linhas.map(async (l) => {
          if (!l.qr_payload) return;
          next[l.key] = await QRCode.toDataURL(l.qr_payload, {
            width: 96,
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
    // linhas é derivado estável por detalhe/marcados nesta renderização
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalhe, marcados]);

  return (
    <article className="ficha-sheet ficha-sheet-pick">
      <header className="ficha-pick-head">
        <p className="ficha-pick-kicker">{empresaNome}</p>
        <h1>Separação para revenda</h1>
        <p className="ficha-pick-ref">
          {detalhe.pedido_codigo ?? 'Pedido'}
          {detalhe.parceiro?.razao_social ? ` · ${detalhe.parceiro.razao_social}` : ''}
        </p>
        <p className="ficha-pick-destino">
          Destino: revenda, pronta para faturar. O saldo sai na NF-e, não nesta folha.
        </p>
      </header>

      <section className="ficha-pick-bloco">
        <h2>
          <span>1</span>
          {nome}
        </h2>
        <p className="ficha-pick-onde">{primeiro}</p>
        <p>
          O pedido pede: {formatDecimalBr(detalhe.qtde_pedida, 4, { stripTrailingZeros: true })} {detalhe.unidade}
          {' · '}
          saldo {formatDecimalBr(detalhe.saldo, 4, { stripTrailingZeros: true })} {detalhe.unidade}
        </p>
        {linhas.length === 0 ? (
          <p className="ficha-pick-nota">
            {detalhe.produto?.controla_lote
              ? 'Sem volume sugerido. Confira o saldo antes de separar.'
              : 'Este produto não tem volume. Separe a quantidade pedida no saldo.'}
          </p>
        ) : (
          <table className="ficha-pick-table">
            <thead>
              <tr>
                <th />
                <th>Local</th>
                <th>Volume</th>
                <th>Levar</th>
                <th>Validade</th>
                <th>QR</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.key}>
                  <td>
                    <span className="ficha-pick-check" aria-hidden />
                  </td>
                  <td>{l.local}</td>
                  <td>{l.codigo}</td>
                  <td>{l.levar}</td>
                  <td>{l.validade}</td>
                  <td>
                    {qrMap[l.key] ? (
                      <img
                        className="ficha-pick-qr"
                        src={qrMap[l.key]}
                        alt={`QR ${l.codigo}`}
                        width={72}
                        height={72}
                      />
                    ) : l.qr_payload ? (
                      <span className="ficha-pick-qr-hri">{l.qr_payload}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="ficha-pick-foot">
        <span>
          Emitida em {formatDateTime(emitidoEm.toISOString())} por {emitidoPor}
        </span>
        <TriggerAttribution variant="print" className="ficha-powered" logoClassName="ficha-trigger" />
      </footer>
    </article>
  );
}
