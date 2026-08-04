import type { SocioQsa } from '../lib/api';
import { formatDate } from '../lib/format';

type Props = {
  socios: SocioQsa[];
  loading?: boolean;
  emptyHint?: string;
};

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
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Qualificação</th>
                <th>CPF/CNPJ</th>
                <th>Entrada</th>
                <th>Faixa etária</th>
              </tr>
            </thead>
            <tbody>
              {socios.map((socio, index) => (
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
      )}
    </div>
  );
}
