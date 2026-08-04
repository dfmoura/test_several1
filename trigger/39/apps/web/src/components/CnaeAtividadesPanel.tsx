import type { CnaeSecundario } from '../lib/api';
import { formatCnae, onlyDigits } from '../lib/format';

type Props = {
  cnae: string;
  cnaeDescricao: string;
  cnaesSecundarios: CnaeSecundario[];
  canEdit: boolean;
  loading?: boolean;
  onCnaeChange: (digits: string) => void;
};

export function CnaeAtividadesPanel({
  cnae,
  cnaeDescricao,
  cnaesSecundarios,
  canEdit,
  loading = false,
  onCnaeChange,
}: Props) {
  return (
    <div className="form-section">
      <div className="panel-title">
        <h3>CNAE principal</h3>
        <span className="form-hint">Código da atividade econômica principal (Receita Federal)</span>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Código</label>
          <input
            value={cnae ? formatCnae(cnae) : ''}
            disabled={!canEdit}
            inputMode="numeric"
            placeholder="00.00-0-00"
            onChange={(e) => onCnaeChange(onlyDigits(e.target.value).slice(0, 7))}
          />
          <span className="form-hint">7 dígitos — preenchido pela consulta CNPJ</span>
        </div>
        <div className="form-group span-2">
          <label>Descrição (Receita)</label>
          <input value={cnaeDescricao || '—'} disabled />
          <span className="form-hint">
            Descrição oficial retornada pela consulta; não é editável localmente
          </span>
        </div>
      </div>

      <div className="panel-title" style={{ marginTop: '1.5rem' }}>
        <h3>CNAEs secundários</h3>
        <span className="form-hint">Gravados ao salvar com dados da Receita</span>
      </div>
      {loading ? (
        <div className="empty-panel">Carregando atividades econômicas…</div>
      ) : cnaesSecundarios.length === 0 ? (
        <div className="empty-panel">
          Nenhum CNAE secundário retornado pela Receita para este CNPJ.
          {canEdit ? ' Use “Consultar” na aba Identificação para atualizar pela BrasilAPI.' : ''}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '8rem' }}>CNAE</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {cnaesSecundarios.map((item) => (
                <tr key={String(item.codigo)}>
                  <td>
                    <code>{formatCnae(item.codigo)}</code>
                  </td>
                  <td>{item.descricao || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
