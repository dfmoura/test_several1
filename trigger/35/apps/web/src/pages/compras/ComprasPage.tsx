import { useEffect, useState, type FormEvent } from 'react';
import { api, type ApiError, type OrdemCompra, type NfeCompra, type OpAguardandoMaterial, type Produto, type Parceiro } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function ComprasPage() {
  const { token } = useAuth();
  const [ocs, setOcs] = useState<OrdemCompra[]>([]);
  const [entradas, setEntradas] = useState<NfeCompra[]>([]);
  const [ops, setOps] = useState<OpAguardandoMaterial[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Parceiro[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [xml, setXml] = useState('');
  const [ocForm, setOcForm] = useState({
    fornecedorId: '',
    produtoId: '',
    quantidade: '10',
    precoUnitario: '12.50',
    urgente: false,
  });

  async function load() {
    if (!token) return;
    try {
      const [o, e, a, p, f] = await Promise.all([
        api.ordensCompra(token),
        api.entradasCompra(token),
        api.opsAguardandoMaterial(token),
        api.produtos(token, { familia: 'MP' }),
        api.parceiros(token, { papel: 'FORNECEDOR' }),
      ]);
      setOcs(o);
      setEntradas(e);
      setOps(a);
      setProdutos(p);
      setFornecedores(f);
      setErro(null);
    } catch (err) {
      setErro((err as ApiError).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onOc(e: FormEvent) {
    e.preventDefault();
    if (!token || !ocForm.fornecedorId || !ocForm.produtoId) return;
    try {
      const oc = await api.criarOrdemCompra(token, {
        fornecedorId: ocForm.fornecedorId,
        urgente: ocForm.urgente,
        itens: [
          {
            produtoId: ocForm.produtoId,
            quantidade: ocForm.quantidade,
            precoUnitario: ocForm.precoUnitario,
          },
        ],
      });
      setOkMsg(`OC ${oc.codigo} · ${oc.status}`);
      await load();
    } catch (err) {
      setErro((err as ApiError).message);
      setOkMsg(null);
    }
  }

  async function onXml(e: FormEvent) {
    e.preventDefault();
    if (!token || !xml.trim()) return;
    try {
      const r = await api.importarXmlCompra(token, {
        xml,
        permitirSemOc: true,
        criarSkuAusente: true,
        idempotencyKey: `ui-xml-${Date.now()}`,
      });
      setOkMsg(
        `${r.entrada.codigo} · ${r.entrada.chave44.slice(0, 20)}…${r.replay ? ' (replay)' : ''}`,
      );
      setXml('');
      await load();
    } catch (err) {
      setErro((err as ApiError).message);
      setOkMsg(null);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Compras</h1>
        <p className="muted">M07 · COT/OC · XML entrada → MOV · OP aguardando material</p>
      </header>
      {erro ? <p className="error">{erro}</p> : null}
      {okMsg ? <p className="callout">{okMsg}</p> : null}

      <div className="stat-grid">
        <article>
          <h2>OC abertas</h2>
          <p>{ocs.filter((o) => o.status === 'ABERTA' || o.status === 'AGUARDA_ALCADA').length}</p>
        </article>
        <article>
          <h2>Entradas NF</h2>
          <p>{entradas.length}</p>
        </article>
        <article>
          <h2>OP aguardando</h2>
          <p>{ops.length}</p>
        </article>
      </div>

      <h2>Nova OC direta</h2>
      <form className="form-grid" onSubmit={(e) => void onOc(e)}>
        <label>
          Fornecedor
          <select
            value={ocForm.fornecedorId}
            onChange={(ev) => setOcForm((f) => ({ ...f, fornecedorId: ev.target.value }))}
            required
          >
            <option value="">—</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.codigo} · {f.razaoSocial}
              </option>
            ))}
          </select>
        </label>
        <label>
          Produto MP
          <select
            value={ocForm.produtoId}
            onChange={(ev) => setOcForm((f) => ({ ...f, produtoId: ev.target.value }))}
            required
          >
            <option value="">—</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} · {p.descricao}
              </option>
            ))}
          </select>
        </label>
        <label>
          Qtde
          <input
            value={ocForm.quantidade}
            onChange={(ev) => setOcForm((f) => ({ ...f, quantidade: ev.target.value }))}
          />
        </label>
        <label>
          Preço unit.
          <input
            value={ocForm.precoUnitario}
            onChange={(ev) => setOcForm((f) => ({ ...f, precoUnitario: ev.target.value }))}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={ocForm.urgente}
            onChange={(ev) => setOcForm((f) => ({ ...f, urgente: ev.target.checked }))}
          />
          Urgente
        </label>
        <button type="submit" className="btn">
          Criar OC
        </button>
      </form>

      <h2>Entrada XML (sem OC · alçada ADMIN)</h2>
      <form onSubmit={(e) => void onXml(e)}>
        <textarea
          rows={6}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
          placeholder="Cole o XML nfeProc aqui…"
          value={xml}
          onChange={(ev) => setXml(ev.target.value)}
        />
        <button type="submit" className="btn" style={{ marginTop: 8 }}>
          Importar e conferir
        </button>
      </form>

      <h2>Ordens de compra</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>OC</th>
              <th>Status</th>
              <th>Fornecedor</th>
              <th>Valor</th>
              <th>Urgente</th>
            </tr>
          </thead>
          <tbody>
            {ocs.map((o) => (
              <tr key={o.id}>
                <td className="mono">{o.codigo}</td>
                <td>{o.status}</td>
                <td>{o.fornecedor.razaoSocial}</td>
                <td>{o.valorTotal}</td>
                <td>{o.urgente ? 'sim' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Entradas</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>NFC</th>
              <th>Chave</th>
              <th>Valor</th>
              <th>Itens</th>
            </tr>
          </thead>
          <tbody>
            {entradas.map((e) => (
              <tr key={e.id}>
                <td className="mono">{e.codigo}</td>
                <td className="mono">{e.chave44}</td>
                <td>{e.valorTotal}</td>
                <td>{e.itens.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ops.length > 0 ? (
        <>
          <h2>OP aguardando material</h2>
          <ul>
            {ops.map((op) => (
              <li key={op.id}>
                <strong>{op.codigo}</strong> · {op.materialFalta?.produtoCodigo} ×{' '}
                {op.materialFalta?.quantidade}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
