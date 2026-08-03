import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { API_URL } from '../../lib/api';

export function ExportContadorPage() {
  const { token } = useAuth();
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [meta, setMeta] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    if (!token) return;
    setBaixando(true);
    setErro(null);
    try {
      const res = await fetch(
        `${API_URL}/api/v1/gerencial/export-contador?ano=${ano}&mes=${mes}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(json.error?.message ?? res.statusText);
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') ?? '';
      const match = /filename="([^"]+)"/.exec(cd);
      const name = match?.[1] ?? `export_${ano}_${mes}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setMeta(`Download: ${name} (${blob.size} bytes)`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha no export');
      setMeta(null);
    } finally {
      setBaixando(false);
    }
  }

  async function verMeta() {
    if (!token) return;
    try {
      const res = await fetch(
        `${API_URL}/api/v1/gerencial/export-contador?ano=${ano}&mes=${mes}&meta=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? res.statusText);
      setMeta(JSON.stringify(json.data, null, 2));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha');
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Export contador</h1>
        <p className="muted">M10 · UC-GER-004 · layout RLP-CONTADOR-v1 (ZIP CSV)</p>
      </header>
      {erro ? <p className="error">{erro}</p> : null}
      {meta ? <pre className="callout mono">{meta}</pre> : null}

      <div className="form-grid" style={{ maxWidth: 420 }}>
        <label>
          Ano
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
          />
        </label>
        <label>
          Mês
          <input
            type="number"
            min={1}
            max={12}
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
          />
        </label>
        <div className="btn-row">
          <button type="button" className="btn" disabled={baixando} onClick={() => void baixar()}>
            {baixando ? 'Gerando…' : 'Baixar ZIP'}
          </button>
          <button type="button" className="btn ghost" onClick={() => void verMeta()}>
            Ver totais
          </button>
        </div>
      </div>
    </section>
  );
}
