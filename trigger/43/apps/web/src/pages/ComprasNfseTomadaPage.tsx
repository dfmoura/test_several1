import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DanfseNacionalSheet } from '../components/DanfseNacionalSheet';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';

type Natureza = { id: number; codigo: string; nome: string };
type TituloResumo = {
  id: number;
  codigo: string;
  vencimento: string | null;
  valor: string;
  saldo: string;
  status: string;
  parcela: number | null;
};
type Prestador = { id: number; codigo: string; razao_social: string };

type Nota = {
  id: number;
  numero: string | null;
  chave: string | null;
  data_emissao: string | null;
  emit_nome: string | null;
  emit_cnpj: string | null;
  valor_total: string | null;
  situacao: string;
  parceiro_sugerido: { id: number; codigo: string; razao_social: string } | null;
  titulos: TituloResumo[];
  naturezas: Natureza[];
};

export function ComprasNfseTomadaPage() {
  const { id } = useParams();
  const [nota, setNota] = useState<Nota | null>(null);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [parceiroId, setParceiroId] = useState('');
  const [naturezaId, setNaturezaId] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const load = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await api.get<{ data: Nota }>(`/nfse-tomadas/${id}`);
      setNota(res.data);
      if (res.data.parceiro_sugerido) {
        setParceiroId(String(res.data.parceiro_sugerido.id));
      }
      try {
        const pars = await api.get<{ data: Prestador[] }>('/parceiros?papel=fornecedor');
        setPrestadores(pars.data ?? []);
      } catch {
        setPrestadores([]);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir a NFS-e.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const lancar = async (ev: FormEvent) => {
    ev.preventDefault();
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const res = await api.post<{ data: { nota: Nota; aviso: string | null } }>(
        `/nfse-tomadas/${id}/lancar`,
        {
          parceiro_id: Number(parceiroId),
          natureza_id: Number(naturezaId),
          vencimento,
          valor: nota?.valor_total ? Number(nota.valor_total) : undefined,
        },
      );
      setNota(res.data.nota);
      setAviso(res.data.aviso);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível lançar o contas a pagar.');
    } finally {
      setSalvando(false);
    }
  };

  const desfazer = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const res = await api.post<{ data: Nota }>(`/nfse-tomadas/${id}/desfazer`, {});
      setNota(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível desfazer o vínculo.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return <div className="loading">Carregando…</div>;
  }
  if (!nota) {
    return <p className="form-error">{erro || 'NFS-e não encontrada.'}</p>;
  }

  const naCaixa = nota.situacao === 'NA_CAIXA';

  return (
    <>
      <PageHeader
        title={nota.numero ? `NFS-e ${nota.numero}` : 'NFS-e tomada'}
        description="Confira o prestador, a natureza e o vencimento. O título aparece em Contas a pagar para você baixar."
        actions={
          <Link to="/compras/nfse-tomadas" className="btn btn-secondary">
            Voltar à caixa
          </Link>
        }
      />
      {erro ? <p className="form-error">{erro}</p> : null}
      {aviso ? <p className="muted">{aviso}</p> : null}

      <div className="danfse-v2-tela">
        <DanfseNacionalSheet
          danfse={{
            versao: '1.01',
            chave: nota.chave,
            numero_nfse: nota.numero,
            competencia: nota.data_emissao,
            dh_nfse: nota.data_emissao,
            prestador: { nome: nota.emit_nome, documento: nota.emit_cnpj },
            servico: { descricao: nota.emit_nome ? `Serviço tomado de ${nota.emit_nome}` : '' },
            valores: {
              servico: nota.valor_total,
              liquido: nota.valor_total,
              desconto_incondicionado: '0.00',
              deducoes: '0.00',
              calculo_bm: '0.00',
              desconto_condicionado: '0.00',
            },
          }}
          watermark={/^(\d)\1{49}$/.test(nota.chave ?? '') || !nota.chave ? 'SEM VALOR FISCAL' : null}
          rodape="NFS-e tomada · conferência antes do contas a pagar"
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          {nota.parceiro_sugerido ? (
            <p className="muted">
              Cadastro encontrado: {nota.parceiro_sugerido.codigo} · {nota.parceiro_sugerido.razao_social}
            </p>
          ) : (
            <p className="muted">
              Se o prestador ainda não existe, cadastre-o em Parceiros com o papel de fornecedor e volte para escolhê-lo.
            </p>
          )}
        </div>
      </div>

      {naCaixa ? (
        <div className="card">
          <div className="card-body">
            <form onSubmit={(ev) => void lancar(ev)} className="form-grid">
              <div className="form-group">
                <label htmlFor="parceiro">Prestador</label>
                {prestadores.length > 0 ? (
                  <select
                    id="parceiro"
                    value={parceiroId}
                    onChange={(e) => setParceiroId(e.target.value)}
                    required
                  >
                    <option value="">Selecione</option>
                    {prestadores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} · {p.razao_social}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="parceiro"
                    inputMode="numeric"
                    value={parceiroId}
                    onChange={(e) => setParceiroId(e.target.value)}
                    placeholder="Identificador do parceiro"
                    required
                  />
                )}
              </div>
              <div className="form-group">
                <label htmlFor="natureza">Natureza da despesa</label>
                <select
                  id="natureza"
                  value={naturezaId}
                  onChange={(e) => setNaturezaId(e.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {nota.naturezas.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.codigo} · {n.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="vencimento">Vencimento</label>
                <input
                  id="vencimento"
                  type="date"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                  required
                />
              </div>
              <div>
                <button type="submit" className="btn" disabled={salvando}>
                  {salvando ? 'Lançando…' : 'Lançar no contas a pagar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <h3>Títulos</h3>
            {nota.titulos.length === 0 ? (
              <p>Nenhum título aberto nesta nota.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Parcela</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Saldo</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {nota.titulos.map((t) => (
                    <tr key={t.id}>
                      <td>{t.codigo}</td>
                      <td>{t.parcela ?? '—'}</td>
                      <td>{t.vencimento ? formatDate(t.vencimento) : '—'}</td>
                      <td>{formatCurrency(Number(t.valor))}</td>
                      <td>{formatCurrency(Number(t.saldo))}</td>
                      <td>{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ marginTop: '1rem' }}>
              <Link to="/financeiro/contas-a-pagar">Abrir contas a pagar</Link>
            </p>
            {nota.situacao === 'VINCULADA' ? (
              <button type="button" className="btn btn-secondary" disabled={salvando} onClick={() => void desfazer()}>
                Desfazer vínculo
              </button>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
