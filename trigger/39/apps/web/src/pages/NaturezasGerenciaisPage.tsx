import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type NaturezaGerencial } from '../lib/api';
import { useAuth } from '../lib/auth';

const GRUPO_LABELS: Record<number, string> = {
  1: 'Receitas',
  2: 'Custos operacionais',
  3: 'Despesas operacionais',
  4: 'Investimentos / patrimônio',
  5: 'Movimentações não-resultado',
};

type EditDraft = { nome: string; descricao: string };

function flatten(nodes: NaturezaGerencial[]): NaturezaGerencial[] {
  const out: NaturezaGerencial[] = [];
  const walk = (list: NaturezaGerencial[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function NaturezaRow({
  node,
  depth,
  canWrite,
  editingId,
  draft,
  savingId,
  onStartEdit,
  onCancelEdit,
  onDraftChange,
  onSave,
  onToggleAtivo,
}: {
  node: NaturezaGerencial;
  depth: number;
  canWrite: boolean;
  editingId: number | null;
  draft: EditDraft;
  savingId: number | null;
  onStartEdit: (n: NaturezaGerencial) => void;
  onCancelEdit: () => void;
  onDraftChange: (d: EditDraft) => void;
  onSave: (n: NaturezaGerencial) => void;
  onToggleAtivo: (n: NaturezaGerencial) => void;
}) {
  const isEditing = editingId === node.id;
  const saving = savingId === node.id;
  const pad = 0.75 + depth * 1.1;

  return (
    <>
      <tr className={!node.ativo ? 'nat-row--inactive' : undefined}>
        <td style={{ paddingLeft: `${pad}rem` }}>
          <div className="nat-code-cell">
            <code className="nat-code">{node.codigo_exibicao}</code>
            <span className="nat-code-raw">{node.codigo}</span>
          </div>
        </td>
        <td>
          {isEditing ? (
            <div className="nat-edit-fields">
              <input
                value={draft.nome}
                onChange={(e) => onDraftChange({ ...draft, nome: e.target.value })}
                disabled={saving}
                aria-label="Nome"
              />
              <input
                value={draft.descricao}
                onChange={(e) => onDraftChange({ ...draft, descricao: e.target.value })}
                disabled={saving}
                placeholder="Descrição (opcional)"
                aria-label="Descrição"
              />
            </div>
          ) : (
            <div>
              <div className="nat-nome">{node.nome}</div>
              {node.descricao ? <div className="nat-desc">{node.descricao}</div> : null}
            </div>
          )}
        </td>
        <td>
          <span className="nat-tipo-badge">
            {node.aceita_lancamento ? 'Folha' : 'Agrupador'}
          </span>
        </td>
        <td>
          <StatusPill status={node.ativo ? 'ATIVO' : 'INATIVO'} />
        </td>
        <td className="nat-actions">
          {canWrite ? (
            isEditing ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={saving || !draft.nome.trim()}
                  onClick={() => onSave(node)}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={saving}
                  onClick={onCancelEdit}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onStartEdit(node)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={saving}
                  onClick={() => onToggleAtivo(node)}
                >
                  {node.ativo ? 'Inativar' : 'Reativar'}
                </button>
              </>
            )
          ) : (
            <span className="muted">—</span>
          )}
        </td>
      </tr>
      {(node.children ?? []).map((child) => (
        <NaturezaRow
          key={child.id}
          node={child}
          depth={depth + 1}
          canWrite={canWrite}
          editingId={editingId}
          draft={draft}
          savingId={savingId}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onDraftChange={onDraftChange}
          onSave={onSave}
          onToggleAtivo={onToggleAtivo}
        />
      ))}
    </>
  );
}

export function NaturezasGerenciaisPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('natureza_gerencial.escrever');

  const [tree, setTree] = useState<NaturezaGerencial[]>([]);
  const [gruposMeta, setGruposMeta] = useState<Record<string, string>>({});
  const [grupo, setGrupo] = useState('');
  const [q, setQ] = useState('');
  const [somenteAtivos, setSomenteAtivos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ nome: '', descricao: '' });
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async (opts?: { grupo?: string; q?: string; ativos?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('formato', 'arvore');
      const g = opts?.grupo ?? grupo;
      const query = opts?.q ?? q;
      const ativos = opts?.ativos ?? somenteAtivos;
      if (g) params.set('grupo', g);
      if (query.trim()) params.set('q', query.trim());
      if (ativos) params.set('ativos', '1');

      const res = await api.get<{
        data: NaturezaGerencial[];
        meta: { grupos: Record<string, string> };
      }>(`/naturezas-gerenciais?${params.toString()}`);

      setTree(res.data);
      setGruposMeta(res.meta?.grupos ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar naturezas gerenciais.');
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, [grupo, q, somenteAtivos]);

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setEditingId(null);
    void load();
  };

  const stats = useMemo(() => {
    const all = flatten(tree);
    return {
      total: all.length,
      folhas: all.filter((n) => n.aceita_lancamento).length,
      inativas: all.filter((n) => !n.ativo).length,
    };
  }, [tree]);

  const patchNode = async (id: number, body: Partial<NaturezaGerencial>) => {
    setSavingId(id);
    setError(null);
    try {
      await api.patch<{ data: NaturezaGerencial }>(`/naturezas-gerenciais/${id}`, body);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSavingId(null);
    }
  };

  const grupoOptions = Object.keys(gruposMeta).length
    ? Object.entries(gruposMeta)
    : Object.entries(GRUPO_LABELS).map(([k, v]) => [k, v] as [string, string]);

  return (
    <>
      <PageHeader
        title="Naturezas gerenciais"
        description="Classificação interna de receita, custo, despesa, investimento e movimentações (NAT-). Não é plano de contas do contador e não confundir com natureza COMPRA/VENDA do produto."
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Código NAT, código ou nome"
              />
            </div>
            <div className="form-group" style={{ minWidth: 200 }}>
              <label>Grupo</label>
              <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                <option value="">Todos (1–5)</option>
                {grupoOptions.map(([id, label]) => (
                  <option key={id} value={id}>
                    {id}. {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 140 }}>
              <label>&nbsp;</label>
              <label className="nat-check">
                <input
                  type="checkbox"
                  checked={somenteAtivos}
                  onChange={(e) => setSomenteAtivos(e.target.checked)}
                />
                Só ativas
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Filtrar
            </button>
          </form>
          <p className="nat-stats muted">
            {loading
              ? 'Carregando…'
              : `${stats.total} itens · ${stats.folhas} folhas (aceitam lançamento) · ${stats.inativas} inativas`}
          </p>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data-table nat-table">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Código</th>
                  <th>Nome</th>
                  <th style={{ width: '8rem' }}>Tipo</th>
                  <th style={{ width: '7rem' }}>Situação</th>
                  <th style={{ width: '12rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!loading && tree.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted" style={{ padding: '1.25rem' }}>
                      Nenhuma natureza encontrada.
                    </td>
                  </tr>
                ) : (
                  tree.map((node) => (
                    <NaturezaRow
                      key={node.id}
                      node={node}
                      depth={0}
                      canWrite={canWrite}
                      editingId={editingId}
                      draft={draft}
                      savingId={savingId}
                      onStartEdit={(n) => {
                        setEditingId(n.id);
                        setDraft({ nome: n.nome, descricao: n.descricao ?? '' });
                      }}
                      onCancelEdit={() => setEditingId(null)}
                      onDraftChange={setDraft}
                      onSave={(n) =>
                        void patchNode(n.id, {
                          nome: draft.nome.trim(),
                          descricao: draft.descricao.trim() || null,
                        })
                      }
                      onToggleAtivo={(n) => void patchNode(n.id, { ativo: !n.ativo })}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
