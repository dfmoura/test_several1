import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  NfsePrestadorCadastroCard,
  NfsePrestadorMark,
  prestadorLabel,
  prestadorTitle,
  type NfsePrestador,
} from '../components/NfsePrestadorCadastroCard';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCnpjCpf, formatCurrency, formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

type Nota = {
  id: number;
  numero: string | null;
  data_emissao: string | null;
  emit_nome: string | null;
  emit_cnpj: string | null;
  valor_total: string | null;
  situacao: string;
  chave: string | null;
  tem_xml?: boolean;
  prestador?: NfsePrestador;
};

type Sync = {
  sync_status: string;
  sync_mensagem: string | null;
  ultimo_nsu: string;
  pode_sincronizar: boolean;
};

const SORT = {
  emissao: (n: Nota) => n.data_emissao,
  numero: (n: Nota) => n.numero,
  prestador: (n: Nota) => n.emit_nome,
  valor: (n: Nota) => Number(n.valor_total ?? 0),
  cadastro: (n: Nota) => n.prestador?.status ?? '',
};

export function ComprasNfseCaixaPage() {
  const { hasPermission } = useAuth();
  const podeParceiro = hasPermission('parceiro.escrever');
  const anoAtual = new Date().getFullYear();
  const [rows, setRows] = useState<Nota[]>([]);
  const [q, setQ] = useState('');
  const [ano, setAno] = useState('');
  const [cadastro, setCadastro] = useState('');
  const [sync, setSync] = useState<Sync | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [cadastroNota, setCadastroNota] = useState<Nota | null>(null);
  const pollRef = useRef<number | null>(null);

  const load = async (search?: string, year?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      params.set('situacao', 'NA_CAIXA');
      if (search) params.set('q', search);
      if (year) params.set('ano', year);
      const [lista, estado] = await Promise.all([
        api.get<{ data: Nota[] }>(`/nfse-tomadas?${params.toString()}`),
        api.get<{ data: Sync }>('/nfse-sync'),
      ]);
      setRows(lista.data);
      setSync(estado.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a caixa de NFS-e.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current != null) window.clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (sync?.sync_status !== 'RUNNING') {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setSincronizando(false);
      return;
    }
    if (pollRef.current != null) return;
    pollRef.current = window.setInterval(() => {
      void load(q, ano);
    }, 2500);
  }, [sync?.sync_status, q, ano]);

  const handleSearch = (ev: FormEvent) => {
    ev.preventDefault();
    void load(q, ano);
  };

  const atualizar = async () => {
    setSincronizando(true);
    setErro(null);
    try {
      await api.post('/nfse-sync', {});
      await load(q, ano);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível atualizar a caixa.');
    } finally {
      setSincronizando(false);
    }
  };

  const filtradas = useMemo(
    () => (cadastro ? rows.filter((n) => n.prestador?.status === cadastro) : rows),
    [rows, cadastro],
  );
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(filtradas, SORT, {
    initialKey: 'emissao',
    initialDir: 'desc',
  });

  const abrirCadastro = (nota: Nota) => {
    const info = nota.prestador;
    if (!info || !podeParceiro || !info.pode_cadastrar) return;
    setCadastroNota(nota);
  };

  return (
    <>
      <PageHeader
        title="Caixa de NFS-e"
        description="Serviços que outros prestadores emitiram contra o CNPJ desta empresa. A conferência organiza o contas a pagar. Nada entra no estoque."
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void atualizar()}
              disabled={sincronizando || sync?.pode_sincronizar === false}
            >
              {sincronizando ? 'Atualizando…' : 'Atualizar do fisco'}
            </button>
            <Link to="/compras/nfse-vinculadas" className="btn btn-secondary">
              NFS-e vinculadas
            </Link>
          </>
        }
      />

      {sync?.sync_mensagem ? <p className="muted">{sync.sync_mensagem}</p> : null}
      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} className="nfe-destinadas-filters">
            <input
              className="nfe-destinadas-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Número, prestador, CNPJ, chave…"
              aria-label="Buscar"
            />
            <select
              className="nfe-destinadas-select"
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              aria-label="Ano"
            >
              <option value="">Todos os anos</option>
              {[0, 1, 2, 3, 4].map((i) => (
                <option key={anoAtual - i} value={anoAtual - i}>
                  {anoAtual - i}
                </option>
              ))}
            </select>
            <select
              className="nfe-destinadas-select nfe-destinadas-select--situacao"
              value={cadastro}
              onChange={(e) => setCadastro(e.target.value)}
              aria-label="Cadastro do prestador"
            >
              <option value="">Todos os prestadores</option>
              <option value="nao_cadastrado">Não cadastrado</option>
              <option value="sem_papel">Sem papel fornecedor</option>
              <option value="cadastrado">Cadastrado</option>
            </select>
            <button type="submit" className="btn btn-secondary">
              Filtrar
            </button>
          </form>
        </div>
      </div>

      {cadastroNota ? (
        <NfsePrestadorCadastroCard
          notaId={cadastroNota.id}
          numero={cadastroNota.numero}
          emitNome={cadastroNota.emit_nome}
          onClose={() => setCadastroNota(null)}
          onCommitted={() => {
            setCadastroNota(null);
            void load(q, ano);
          }}
        />
      ) : null}

      <div className="card">
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              {rows.length > 0 ? (
                <>Nenhuma NFS-e com este cadastro de prestador neste resultado.</>
              ) : ano ? (
                <>
                  Nenhuma NFS-e de {ano} nesta caixa. Escolha outro ano ou Todos os anos e clique em Filtrar.
                </>
              ) : q ? (
                <>Nenhuma NFS-e neste filtro.</>
              ) : (
                <>
                  Nenhuma NFS-e aguardando conferência. Atualizar do fisco consulta o ADN de produção com o
                  certificado A1. O pagamento só nasce quando você confirma a nota.
                </>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="emissao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Emissão
                  </SortableTh>
                  <SortableTh column="numero" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Número
                  </SortableTh>
                  <SortableTh column="prestador" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Prestador
                  </SortableTh>
                  <SortableTh
                    column="cadastro"
                    label="Cadastro do prestador"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    <span title="Prestador cadastrado como fornecedor?">Prest.</span>
                  </SortableTh>
                  <SortableTh
                    column="valor"
                    className="num"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Valor
                  </SortableTh>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((n) => {
                  const info = n.prestador;
                  const title = prestadorTitle(info, podeParceiro, Boolean(n.tem_xml));
                  const label = prestadorLabel(info?.status);
                  const clicavel =
                    info?.status === 'cadastrado' ||
                    (podeParceiro && info?.pode_cadastrar && (info.status === 'nao_cadastrado' || info.status === 'sem_papel'));

                  return (
                    <tr key={n.id}>
                      <td className="nfse-nowrap">{n.data_emissao ? formatDate(n.data_emissao) : '—'}</td>
                      <td className="nfse-nowrap">{n.numero || '—'}</td>
                      <td className="nfse-prestador">
                        <div>{n.emit_nome || '—'}</div>
                        {n.emit_cnpj ? <div className="muted nfse-prestador-doc">{formatCnpjCpf(n.emit_cnpj)}</div> : null}
                      </td>
                      <td className="dfe-cadastro-cell">
                        {info?.status === 'cadastrado' && info.parceiro_id ? (
                          <Link to={`/parceiros/${info.parceiro_id}`} title={title} className="dfe-cadastro-link">
                            <NfsePrestadorMark prestador={info} title={title} ariaLabel={label} />
                          </Link>
                        ) : clicavel ? (
                          <button
                            type="button"
                            className="dfe-cadastro-btn"
                            title={title}
                            aria-label={label}
                            onClick={() => abrirCadastro(n)}
                          >
                            <NfsePrestadorMark prestador={info} title={title} ariaLabel={label} />
                          </button>
                        ) : (
                          <NfsePrestadorMark prestador={info} title={title} ariaLabel={label} />
                        )}
                      </td>
                      <td className="num">{n.valor_total ? formatCurrency(Number(n.valor_total)) : '—'}</td>
                      <td>
                        <Link to={`/compras/nfse-tomadas/${n.id}`}>Conferir</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
