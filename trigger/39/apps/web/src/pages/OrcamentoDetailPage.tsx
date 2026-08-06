import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { OrcamentoResultado } from '../components/OrcamentoResultado';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type Orcamento } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDateTime } from '../lib/format';
import { displaySnap, isOrcEditavel, statusOrcLabel } from '../lib/orcamentoForm';

export function OrcamentoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('orcamento.escrever');

  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const res = await api.get<{ data: Orcamento }>(`/orcamentos/${id}`);
        if (!cancelled) setOrc(res.data);
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : 'Falha ao carregar orçamento');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleExcluir = async () => {
    if (!orc || !canWrite || !isOrcEditavel(orc.status)) return;
    if (!window.confirm(`Excluir logicamente ${orc.codigo}? Cancela o rascunho (sem delete físico).`)) {
      return;
    }
    setPending(true);
    setErro(null);
    try {
      await api.delete(`/orcamentos/${orc.id}`);
      navigate('/orcamentos');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao excluir');
    } finally {
      setPending(false);
    }
  };

  if (loading) return <p className="loading">Carregando…</p>;
  if (!orc) {
    return (
      <>
        <PageHeader title="Orçamento" description="Não encontrado" />
        {erro ? <p className="form-error">{erro}</p> : null}
        <Link to="/orcamentos" className="btn btn-secondary">
          Voltar à lista
        </Link>
      </>
    );
  }

  const editavel = isOrcEditavel(orc.status) && orc.editavel;
  const input = orc.input_snapshot ?? {};

  const specTiles: Array<[string, unknown]> = (
    [
      ['Medida', input.medida],
      ['Largura cm', input.largura_cm],
      ['Puxada cm', input.puxada_cm],
      ['Z', input.z],
      ['Cores', input.cores],
      ['Papel', input.papel],
      ['Acabamento', input.acabamento],
      ['Modelos', input.modelos],
      ['Colunas', input.colunas],
      ['Etiq./rolo', input.etiq_por_rolo],
      ['Tubete', input.tubete],
      ['Col. rebob.', input.coluna_rebobinacao],
      ['Máquina (G10)', input.maquina],
      ['Matriz', input.matriz],
      ['Faca nova', input.faca_nova ? 'SIM' : 'NÃO'],
      ['Formato faca', input.formato_faca],
      ['Valor faca nova', input.faca_nova ? input.valor_faca_nova : null],
      ['Prazo faca (d)', input.faca_nova ? input.prazo_faca_dias : null],
      ['Imposto %', input.imposto_pct],
      ['Troca produto', input.tipo_troca_produto],
      ['RPM', input.rpm],
    ] as Array<[string, unknown]>
  ).filter((row): row is [string, unknown] => row[1] != null && row[1] !== '');

  return (
    <>
      <PageHeader
        title={orc.codigo}
        description={`${orc.cliente_nome} · v${orc.versao}`}
        actions={
          <div className="btn-row">
            <Link to="/orcamentos" className="btn btn-secondary">
              Lista
            </Link>
            <Link to="/orcamentos/como-calcula" className="btn btn-secondary">
              Como calcula
            </Link>
            {canWrite && editavel ? (
              <>
                <Link to={`/orcamentos/${orc.id}/editar`} className="btn btn-primary">
                  Editar
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={pending}
                  onClick={() => void handleExcluir()}
                >
                  Excluir
                </button>
              </>
            ) : null}
          </div>
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div className="orc-detail-meta">
            <div>
              <span>Status</span>
              <strong>
                <StatusPill status={statusOrcLabel(orc.status)} />
              </strong>
            </div>
            <div>
              <span>Parceiro</span>
              <strong>
                {orc.parceiro?.codigo ?? '—'} — {orc.cliente_nome}
                {orc.parceiro?.is_prospect ? ' (prospect)' : ''}
              </strong>
            </div>
            <div>
              <span>Versão</span>
              <strong>v{orc.versao}</strong>
            </div>
            <div>
              <span>Matriz</span>
              <strong>{orc.cobra_matriz ? formatCurrency(orc.valor_matriz) : 'Isenta'}</strong>
            </div>
            <div>
              <span>Prazo / validade</span>
              <strong>
                {orc.prazo_entrega_dias} d.úteis · {orc.validade_dias} dias · ±
                {orc.tolerancia_qtd_pct}%
              </strong>
            </div>
            <div>
              <span>Atualizado</span>
              <strong>{formatDateTime(orc.updated_at)}</strong>
            </div>
          </div>

          <p className="orc-lock-note">
            {editavel
              ? 'Pré-envio (RASCUNHO/CALCULADO): pode recalcular/salvar (nova versão) ou excluir logicamente. Envio, aceite e PED ficam fora desta rotina.'
              : 'Snapshot travado neste status. Alterações exigem novo ORC (domínio M02).'}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <h3 className="orc-section-title" style={{ marginTop: 0 }}>
            Especificação (snapshot)
          </h3>
          <div className="orc-spec-grid">
            {specTiles.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{displaySnap(value)}</strong>
              </div>
            ))}
          </div>
          {orc.observacao ? (
            <p style={{ marginBottom: 0, marginTop: '0.85rem' }}>
              <strong>Obs. interna:</strong> {orc.observacao}
            </p>
          ) : null}
        </div>
      </div>

      {orc.result_snapshot ? (
        <OrcamentoResultado
          calculo={orc.result_snapshot}
          prazoEntregaDias={orc.prazo_entrega_dias}
          validadeDias={orc.validade_dias}
          toleranciaQtdPct={orc.tolerancia_qtd_pct}
        />
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>Sem resultado calculado.</p>
      )}
    </>
  );
}
