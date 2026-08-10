import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmpresaFichaSheet } from '../components/EmpresaFichaSheet';
import {
  api,
  type CnaeSecundario,
  type CnpjConsulta,
  type Empresa,
  type SocioQsa,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { voltarDaFicha } from '../lib/fichaNav';
import { onlyDigits } from '../lib/format';

type ConsultaStatus = 'idle' | 'loading' | 'ok' | 'erro';

function normalizeCnaes(
  stored: Empresa['cnaes_secundarios'],
  fromConsulta: CnaeSecundario[] | undefined,
): CnaeSecundario[] {
  const base =
    Array.isArray(stored) && stored.length > 0
      ? stored.map((item) => ({
          codigo: item.codigo,
          descricao: item.descricao ?? '',
        }))
      : (fromConsulta ?? []);

  if (!fromConsulta?.length) return base;

  const descByCode = new Map(
    fromConsulta.map((item) => [onlyDigits(String(item.codigo)), item.descricao ?? '']),
  );

  return base.map((item) => {
    const key = onlyDigits(String(item.codigo));
    const desc = (item.descricao ?? '').trim();
    if (desc) return { codigo: item.codigo, descricao: item.descricao ?? '' };
    return { codigo: item.codigo, descricao: descByCode.get(key) ?? '' };
  });
}

export function EmpresaFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cnaeDescricao, setCnaeDescricao] = useState('');
  const [cnaesSecundarios, setCnaesSecundarios] = useState<CnaeSecundario[]>([]);
  const [socios, setSocios] = useState<SocioQsa[]>([]);
  const [consultaReceita, setConsultaReceita] = useState<ConsultaStatus>('idle');
  const emitidoEm = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!id) {
      setError('Empresa inválida para ficha.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: Empresa }>(`/empresas/${id}`);
        if (cancelled) return;
        const emp = res.data;
        setEmpresa(emp);
        setCnaesSecundarios(normalizeCnaes(emp.cnaes_secundarios, undefined));
      } catch {
        if (cancelled) return;
        setError('Empresa não encontrada.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /** QSA + descrições CNAE: consulta Receita (não grava) — padrão das abas Atividades/Sócios. */
  useEffect(() => {
    if (!empresa) return;
    const digits = onlyDigits(empresa.cnpj ?? '');
    if (digits.length !== 14) {
      setConsultaReceita('idle');
      return;
    }

    let cancelled = false;
    setConsultaReceita('loading');
    void (async () => {
      try {
        const res = await api.get<{ data: CnpjConsulta }>(`/consulta/cnpj/${digits}`);
        if (cancelled) return;
        const d = res.data;
        setCnaeDescricao(d.cnae_descricao ?? d.cnae_fiscal_descricao ?? '');
        setCnaesSecundarios(normalizeCnaes(empresa.cnaes_secundarios, d.cnaes_secundarios));
        setSocios(Array.isArray(d.qsa) ? d.qsa : []);
        setConsultaReceita('ok');
      } catch {
        if (cancelled) return;
        setConsultaReceita('erro');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [empresa]);

  useEffect(() => {
    document.body.classList.add('ficha-print-mode');
    return () => {
      document.body.classList.remove('ficha-print-mode');
    };
  }, []);

  useEffect(() => {
    if (!empresa) return;
    document.title = `Ficha ${empresa.codigo} · ${empresa.razao_social}`;
    return () => {
      document.title = 'ERP RLP';
    };
  }, [empresa]);

  const printBlocked = !empresa || consultaReceita === 'loading';

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => voltarDaFicha(navigate, '/empresas')}
          >
            Voltar ao cadastro
          </button>
          <span className="ficha-toolbar-hint">
            Retrato A4 · use Imprimir ou Salvar como PDF no navegador
            {consultaReceita === 'loading' ? ' · carregando QSA/atividades…' : ''}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={printBlocked}
          onClick={() => window.print()}
          title={
            consultaReceita === 'loading'
              ? 'Aguarde a consulta da Receita (QSA e CNAEs)'
              : undefined
          }
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {empresa && !loading && (
        <EmpresaFichaSheet
          empresa={empresa}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
          cnaesSecundarios={cnaesSecundarios}
          cnaeDescricao={cnaeDescricao}
          socios={socios}
          consultaReceita={consultaReceita}
        />
      )}
    </div>
  );
}
