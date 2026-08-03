import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage, naturezasApi } from '../lib/api';
import type { ApiRow } from '../types';

const GRUPO_LABEL: Record<number, string> = {
  1: 'Receitas / deduções',
  2: 'Custos operacionais',
  3: 'Despesas operacionais',
  4: 'Investimentos / patrimônio',
  5: 'Movimentações não-resultado',
};

export function NaturezasPage() {
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [grupo, setGrupo] = useState<string>('');

  useEffect(() => {
    naturezasApi
      .list(grupo ? { grupo: Number(grupo) } : undefined)
      .then((rows) => setLista(rows as ApiRow[]))
      .catch((e) => setErro(getErrorMessage(e)));
  }, [grupo]);

  return (
    <>
      <PageHeader
        ordem={7}
        codigo="NAT"
        titulo="Naturezas gerenciais"
        modo="OPERACIONAL"
        regra="Grupos 1–5 apenas. Natureza 9.xx / LAI rejeitada (CA-09). Todo TIT/BX exige natureza."
      />
      {erro ? <p className="error">{erro}</p> : null}
      <section className="panel">
        <label>
          Grupo{' '}
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            <option value="">Todos</option>
            {[1, 2, 3, 4, 5].map((g) => (
              <option key={g} value={g}>
                {g} — {GRUPO_LABEL[g]}
              </option>
            ))}
          </select>
        </label>
        <table className="data" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Grupo</th>
              <th>Aceita lançamento</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((n) => (
              <tr key={String(n.id)}>
                <td>
                  <code>{String(n.codigo)}</code>
                </td>
                <td>{String(n.descricao)}</td>
                <td>
                  {String(n.grupo)} — {GRUPO_LABEL[Number(n.grupo)] ?? ''}
                </td>
                <td>{n.aceita_lancamento ? 'Sim' : 'Grupo (não lança)'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
