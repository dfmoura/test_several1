import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DocStatusChip } from '../components/StatusChip';
import { formatMoney, getErrorMessage, patrimonioApi } from '../lib/api';
import type { ApiRow } from '../types';

export function PatrimonioPage() {
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    descricao: '',
    categoria: 'MAQUINA',
    marca: '',
    modelo: '',
    valor_aquisicao: '',
    local: '',
    natureza_aquisicao: '4.01',
  });

  async function carregar() {
    try {
      setLista((await patrimonioApi.list()) as ApiRow[]);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErro(null);
    try {
      await patrimonioApi.create({
        ...form,
        valor_aquisicao: Number(form.valor_aquisicao || 0),
      });
      setForm({
        descricao: '',
        categoria: 'MAQUINA',
        marca: '',
        modelo: '',
        valor_aquisicao: '',
        local: '',
        natureza_aquisicao: '4.01',
      });
      await carregar();
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        ordem={0}
        codigo="BEM"
        titulo="Patrimônio"
        modo="OPERACIONAL"
        regra="Controle gerencial BEM-NNNNN — máquinas, informática, veículos. Não substitui imobilizado do contador."
      />
      {erro ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <h2 className="panel-title">Novo bem</h2>
        <form className="grid-2" onSubmit={criar}>
          <label>
            Descrição
            <input
              required
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </label>
          <label>
            Categoria
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              {['MAQUINA', 'INFORMATICA', 'VEICULO', 'MOVEL', 'SOFTWARE', 'OUTRO'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marca
            <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
          </label>
          <label>
            Modelo
            <input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
          </label>
          <label>
            Valor aquisição
            <input
              type="number"
              step="0.01"
              value={form.valor_aquisicao}
              onChange={(e) => setForm({ ...form, valor_aquisicao: e.target.value })}
            />
          </label>
          <label>
            Local
            <input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
          </label>
          <label>
            Natureza (4.0x)
            <input
              value={form.natureza_aquisicao}
              onChange={(e) => setForm({ ...form, natureza_aquisicao: e.target.value })}
            />
          </label>
          <div className="btn-row" style={{ alignSelf: 'end' }}>
            <button type="submit" className="btn primary" disabled={pending}>
              Cadastrar
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Local</th>
              <th>Valor</th>
              <th>Natureza</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((b) => (
              <tr key={String(b.id)}>
                <td>{String(b.codigo)}</td>
                <td>
                  {String(b.descricao)}
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    {[b.marca, b.modelo].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td>{String(b.categoria)}</td>
                <td>{String(b.local ?? '—')}</td>
                <td>{formatMoney(b.valor_aquisicao as string | number)}</td>
                <td>
                  <code>{String(b.natureza_aquisicao)}</code>
                </td>
                <td>
                  <DocStatusChip status={String(b.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
