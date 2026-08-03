import { useEffect, useState } from 'react';
import { api, type ApiError, type Titulo } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function TitulosPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Titulo[]>([]);
  const [aging, setAging] = useState<{
    buckets: { current: string; d1_30: string; d31_60: string; d60_plus: string };
    total: string;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    try {
      setItems(await api.titulos(token));
      setAging(await api.titulosAging(token));
      setErro(null);
    } catch (e) {
      setErro((e as ApiError).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function baixar(id: string) {
    if (!token) return;
    try {
      const r = await api.baixarTitulo(token, id, {
        idempotencyKey: `ui-bx-${id}-full`,
      });
      setOkMsg(`${r.titulo.codigo} → ${r.titulo.status}${r.replay ? ' (replay)' : ''}`);
      setErro(null);
      await load();
    } catch (e) {
      setErro((e as ApiError).message);
      setOkMsg(null);
    }
  }

  async function emitirCob(id: string) {
    if (!token) return;
    try {
      const r = await api.emitirCobranca(token, id, `ui-cob-${id}`);
      setOkMsg(
        `${r.cobranca.codigo} ${r.cobranca.status} · ${r.cobranca.linhaDigitavel ?? ''}${r.replay ? ' (replay)' : ''}`,
      );
      setErro(null);
      await load();
    } catch (e) {
      setErro((e as ApiError).message);
      setOkMsg(null);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Títulos</h1>
        <p className="muted">
          M06 · TIT · COB stub · baixa manual · TIT ≠ nº SEFAZ
        </p>
      </header>
      {erro ? <p className="error">{erro}</p> : null}
      {okMsg ? <p className="callout">{okMsg}</p> : null}

      {aging ? (
        <div className="panel-form" style={{ marginBottom: '1rem' }}>
          <h2>Aging (a receber)</h2>
          <p className="mono muted">
            Corrente R$ {aging.buckets.current} · 1–30 R$ {aging.buckets.d1_30} · 31–60 R${' '}
            {aging.buckets.d31_60} · 60+ R$ {aging.buckets.d60_plus} · Total R$ {aging.total}
          </p>
        </div>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>TIT</th>
              <th>NF (ref)</th>
              <th>Cliente</th>
              <th>Natureza</th>
              <th>Venc.</th>
              <th>Aberto</th>
              <th>Status</th>
              <th>COB</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">
                  Nenhum título — emita NF ou aguarde sync
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.codigo}</td>
                  <td className="mono">
                    {t.documentoFiscal?.codigo ?? `(${t.origem ?? 'SINAL'})`}
                    {t.documentoFiscal ? (
                      <div className="muted" style={{ fontSize: '0.75rem' }}>
                        SEFAZ {t.documentoFiscal.serie}/{t.documentoFiscal.numero}
                      </div>
                    ) : null}
                  </td>
                  <td>{t.parceiro.razaoSocial}</td>
                  <td className="mono">{t.naturezaGerencial}</td>
                  <td className="mono">{t.vencimentoEm}</td>
                  <td className="mono">R$ {t.valorAberto}</td>
                  <td>{t.status}</td>
                  <td className="mono" style={{ fontSize: '0.75rem' }}>
                    {(t.cobrancas ?? [])[0]
                      ? `${(t.cobrancas ?? [])[0].codigo} ${(t.cobrancas ?? [])[0].status}`
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['ABERTO', 'PARCIALMENTE_BAIXADO', 'COBRADO'].includes(t.status) &&
                      !(t.cobrancas ?? []).some((c) =>
                        ['PENDENTE', 'REGISTRADA'].includes(c.status),
                      ) ? (
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => void emitirCob(t.id)}
                        >
                          Emitir COB
                        </button>
                      ) : null}
                      {['ABERTO', 'PARCIALMENTE_BAIXADO', 'COBRADO'].includes(t.status) ? (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => void baixar(t.id)}
                        >
                          Baixar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
