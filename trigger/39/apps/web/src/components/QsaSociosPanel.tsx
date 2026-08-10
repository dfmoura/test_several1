import { SortableTh } from './SortableTh';
import type { SocioQsa } from '../lib/api';
import { formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

type Props = {
  socios: SocioQsa[];
  loading?: boolean;
  emptyHint?: string;
};

const QSA_SORT = {
  nome: (s: SocioQsa) => s.nome_socio,
  qualificacao: (s: SocioQsa) => s.qualificacao_socio,
  cpf: (s: SocioQsa) => s.cnpj_cpf_do_socio,
  entrada: (s: SocioQsa) => s.data_entrada_sociedade,
  faixa: (s: SocioQsa) => s.faixa_etaria,
};

function QsaSociosTable({ socios }: { socios: SocioQsa[] }) {
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(socios, QSA_SORT);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh column="nome" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Nome
            </SortableTh>
            <SortableTh column="qualificacao" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Qualificação
            </SortableTh>
            <SortableTh column="cpf" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              CPF/CNPJ
            </SortableTh>
            <SortableTh column="entrada" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Entrada
            </SortableTh>
            <SortableTh column="faixa" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Faixa etária
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.map((socio, index) => (
            <tr key={`${socio.nome_socio ?? 'socio'}-${index}`}>
              <td>
                <strong>{socio.nome_socio ?? '—'}</strong>
                {socio.nome_representante_legal ? (
                  <p className="field-readonly-desc">
                    Rep. legal: {socio.nome_representante_legal}
                    {socio.qualificacao_representante_legal
                      ? ` (${socio.qualificacao_representante_legal})`
                      : ''}
                  </p>
                ) : null}
                {socio.pais ? (
                  <p className="field-readonly-desc">País: {socio.pais}</p>
                ) : null}
              </td>
              <td>{socio.qualificacao_socio ?? '—'}</td>
              <td>
                <code>{socio.cnpj_cpf_do_socio ?? '—'}</code>
              </td>
              <td>{formatDate(socio.data_entrada_sociedade)}</td>
              <td>{socio.faixa_etaria ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QsaSociosPanel({
  socios,
  loading = false,
  emptyHint,
}: Props) {
  return (
    <div className="form-section">
      <div className="panel-title">
        <h3>QSA — Sócios e administradores</h3>
        <span className="form-hint">Somente consulta — não gravados no cadastro</span>
      </div>
      {loading ? (
        <div className="empty-panel">Carregando quadro societário…</div>
      ) : socios.length === 0 ? (
        <div className="empty-panel">
          {emptyHint ??
            'Nenhum sócio retornado pela Receita para este CNPJ. Consulte o CNPJ para atualizar o QSA.'}
        </div>
      ) : (
        <QsaSociosTable socios={socios} />
      )}
    </div>
  );
}
