import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DocStatusChip } from '../components/StatusChip';
import { empresasApi, formatCnpj, getErrorMessage } from '../lib/api';
import type { ApiRow } from '../types';

export function EmpresasPage() {
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    empresasApi
      .list()
      .then((rows) => setLista(rows as ApiRow[]))
      .catch((e) => setErro(getErrorMessage(e)));
  }, []);

  return (
    <>
      <PageHeader
        ordem={0}
        codigo="EMP"
        titulo="Empresas (CNPJs)"
        modo="OPERACIONAL"
        regra="MULTI_EMPRESA — EMP-00001 operação; EMP-00002 sem venda até parecer contador+direção. Sem LAI/9.xx."
      />
      {erro ? <p className="error">{erro}</p> : null}
      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>CNPJ</th>
              <th>Razão social</th>
              <th>Papel</th>
              <th>Vende</th>
              <th>Ativo</th>
              <th>Sessão</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((e) => (
              <tr key={String(e.id)}>
                <td>{String(e.codigo)}</td>
                <td>{formatCnpj(String(e.cnpj))}</td>
                <td>
                  <div>{String(e.razao_social)}</div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    {String(e.nome_fantasia ?? '')}
                  </div>
                </td>
                <td>{String(e.papel)}</td>
                <td>
                  <DocStatusChip status={e.vende ? 'SIM' : 'NAO'} />
                </td>
                <td>{e.ativo ? 'Sim' : 'Não'}</td>
                <td>{e.atual ? <span className="chip">atual</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
