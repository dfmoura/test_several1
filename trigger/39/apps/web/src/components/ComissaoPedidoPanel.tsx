import { Link } from 'react-router-dom';
import { api, type ComissaoPedidoResumo } from '../lib/api';
import { useAuth } from '../lib/auth';
import { comStatusLabel } from '../lib/comissaoUi';
import { formatCurrency } from '../lib/format';
import { StatusPill } from './StatusPill';
import { useEffect, useState } from 'react';

type Props = {
  pedidoId: number;
  pedidoStatus: string;
};

export function ComissaoPedidoPanel({ pedidoId, pedidoStatus }: Props) {
  const { hasPermission } = useAuth();
  const [resumo, setResumo] = useState<ComissaoPedidoResumo | null>(null);

  const visivel = hasPermission('comissao.ler') || hasPermission('financeiro.ler');

  useEffect(() => {
    if (!visivel) return;
    void api
      .get<{ data: ComissaoPedidoResumo }>(`/pedidos/${pedidoId}/comissao`)
      .then((res) => setResumo(res.data))
      .catch(() => setResumo(null));
  }, [pedidoId, pedidoStatus, visivel]);

  if (!visivel || !resumo) return null;
  if (!resumo.elegivel && resumo.linhas.length === 0) return null;

  const prevista = Number(resumo.totais.PREVISTA || 0);
  const liberada = Number(resumo.totais.LIBERADA || 0);
  const paga = Number(resumo.totais.PAGA || 0);
  const ultima = resumo.linhas[resumo.linhas.length - 1];

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div className="form-section">
          <h3>Comissão do vendedor</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Paga-se sobre o recebido do cliente (etiquetas). Frete e ferramental não entram.
            Confirmar a entrega não gera comissão.
          </p>
        </div>
        <div className="detail-meta">
          <div>
            <span>Vendedor</span>
            <strong>
              {resumo.vendedor?.codigo
                ? `${resumo.vendedor.codigo} — ${resumo.vendedor.razao_social ?? ''}`
                : '—'}
            </strong>
          </div>
          <div>
            <span>Alíquota</span>
            <strong>{resumo.aliquota != null ? `${resumo.aliquota}%` : '—'}</strong>
          </div>
          <div>
            <span>Potencial</span>
            <strong>
              {resumo.comissao_potencial != null ? formatCurrency(resumo.comissao_potencial) : 'Após faturar'}
            </strong>
          </div>
          <div>
            <span>Prevista</span>
            <strong>{formatCurrency(prevista)}</strong>
          </div>
          <div>
            <span>Liberada / paga</span>
            <strong>
              {formatCurrency(liberada)} / {formatCurrency(paga)}
            </strong>
          </div>
          {ultima ? (
            <div>
              <span>Última COM-</span>
              <strong>
                <StatusPill status={comStatusLabel(ultima.status)} /> {ultima.codigo}
              </strong>
            </div>
          ) : null}
        </div>
        <p className="form-hint" style={{ marginBottom: 0 }}>
          {hasPermission('comissao.escrever') ? (
            <Link to="/financeiro/comissoes">Abrir fechamento de comissões</Link>
          ) : (
            <Link to="/financeiro/contas-a-receber">Baixa do cliente em Contas a receber</Link>
          )}
          {' · '}a comissão nasce na baixa, não no romaneio.
        </p>
      </div>
    </div>
  );
}
