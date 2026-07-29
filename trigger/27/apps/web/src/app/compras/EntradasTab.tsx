"use client";

import {
  docStatusChip,
  fmtQtde,
  itemStatusChip,
  money,
  type CadastroDraft,
  type Entrada,
  type EntradaItem,
  type PapelOpt,
  type ProdutoOpt,
  type ResolveMode,
} from "./compras-types";

export function EntradasTab({
  entradas,
  busy,
  resolveItemId,
  resolveMode,
  draft,
  produtoLinkId,
  produtos,
  papeis,
  onLancar,
  onAbrirCadastro,
  onAbrirVinculo,
  onFechar,
  onDraftChange,
  onProdutoLinkChange,
  onCadastrar,
  onVincular,
}: {
  entradas: Entrada[];
  busy: boolean;
  resolveItemId: string | null;
  resolveMode: ResolveMode;
  draft: CadastroDraft | null;
  produtoLinkId: string;
  produtos: ProdutoOpt[];
  papeis: PapelOpt[];
  onLancar: (documentoId: string) => void;
  onAbrirCadastro: (item: EntradaItem) => void;
  onAbrirVinculo: (item: EntradaItem) => void;
  onFechar: () => void;
  onDraftChange: (d: CadastroDraft) => void;
  onProdutoLinkChange: (id: string) => void;
  onCadastrar: () => void;
  onVincular: (itemId: string, produtoId: string) => void;
}) {
  return (
    <section style={{ marginTop: "0.25rem" }}>
      <div className="jornada-section-head" style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Entradas fiscais → estoque</h2>
      </div>
      {!entradas.length && (
        <p className="muted">
          Nenhuma NFe importada ainda. Importe o XML no pedido de compra (aba Pedidos).
        </p>
      )}
      {entradas.map((d) => (
        <article key={d.id} className="card-panel entrada-card">
          <header className="entrada-header">
            <div>
              <div className="entrada-title-row">
                <h3 className="entrada-title">
                  NFe {d.numero || "—"}
                  {d.serie ? `/${d.serie}` : ""}
                </h3>
                <span className={docStatusChip(d.status)}>{d.statusLabel}</span>
              </div>
              <p className="entrada-fornecedor">
                {d.emitenteNome || "Fornecedor não informado"}
              </p>
              <p className="muted entrada-meta">
                {d.valorTotal != null ? `Total ${money(d.valorTotal)}` : "—"}
                {d.pedidoCompraNumero != null
                  ? ` · PC #${d.pedidoCompraNumero}`
                  : " · sem PC vinculado"}
              </p>
            </div>
            <div className="entrada-progress">
              <span className="muted">
                {d.itens.length - d.pendentesMatch}/{d.itens.length} vinculados
              </span>
              {d.podeLancar && (
                <button type="button" disabled={busy} onClick={() => onLancar(d.id)}>
                  Lançar estoque
                </button>
              )}
            </div>
          </header>

          {d.chave && (
            <p className="entrada-chave" title="Chave de acesso">
              {d.chave}
            </p>
          )}

          {d.pendentesMatch > 0 && (
            <div className="match-banner" role="status">
              <strong>
                {d.pendentesMatch === 1
                  ? "1 item sem cadastro no estoque"
                  : `${d.pendentesMatch} itens sem cadastro no estoque`}
              </strong>
              <span>
                Cadastre o produto a partir do XML ou vincule a um insumo já existente.
              </span>
            </div>
          )}

          <ul className="entrada-itens">
            {d.itens.map((i) => {
              const resolvendo = resolveItemId === i.id;
              return (
                <li
                  key={i.id}
                  className={`entrada-item ${i.status === "PENDENTE_MATCH" ? "is-pendente" : ""}`}
                >
                  <div className="entrada-item-main">
                    <div className="entrada-item-copy">
                      <div className="entrada-item-top">
                        <span className="entrada-item-n">Item {i.numeroItem}</span>
                        <span className={itemStatusChip(i.status)}>{i.statusLabel}</span>
                      </div>
                      <p className="entrada-item-desc">{i.descricao}</p>
                      <div className="entrada-item-meta">
                        {i.ncm && <span>NCM {i.ncm}</span>}
                        {i.codigoXml && <span>Cód. forn. {i.codigoXml}</span>}
                        <span>
                          {fmtQtde(i.quantidade)} {i.unidade || "UN"}
                        </span>
                        <span className="money">{money(i.valorTotal)}</span>
                      </div>
                    </div>

                    <div className="entrada-item-actions">
                      {i.status === "MATCHED" && i.produtoCodigo && (
                        <div className="produto-vinculo">
                          <code>{i.produtoCodigo}</code>
                          <span className="muted">{i.produtoDescricao}</span>
                        </div>
                      )}

                      {i.status === "PENDENTE_MATCH" && !resolvendo && (
                        <div className="match-actions">
                          <button type="button" onClick={() => onAbrirCadastro(i)}>
                            Cadastrar produto
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => onAbrirVinculo(i)}
                          >
                            Vincular existente
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {resolvendo && resolveMode === "cadastrar" && draft && (
                    <div className="match-panel">
                      <label>
                        Código
                        <input
                          value={draft.codigo}
                          onChange={(e) =>
                            onDraftChange({ ...draft, codigo: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Descrição
                        <input
                          value={draft.descricao}
                          onChange={(e) =>
                            onDraftChange({ ...draft, descricao: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Unidade
                        <input
                          value={draft.unidade}
                          onChange={(e) =>
                            onDraftChange({ ...draft, unidade: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        NCM
                        <input
                          value={draft.ncm}
                          onChange={(e) =>
                            onDraftChange({ ...draft, ncm: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Papel (opcional)
                        <select
                          value={draft.papelId}
                          onChange={(e) =>
                            onDraftChange({ ...draft, papelId: e.target.value })
                          }
                        >
                          <option value="">—</option>
                          {papeis.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="form-actions">
                        <button type="button" className="secondary" onClick={onFechar}>
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={busy || !draft.codigo.trim()}
                          onClick={onCadastrar}
                        >
                          Salvar e vincular
                        </button>
                      </div>
                    </div>
                  )}

                  {resolvendo && resolveMode === "vincular" && (
                    <div className="match-panel">
                      <label>
                        Produto estoque
                        <select
                          value={produtoLinkId}
                          onChange={(e) => onProdutoLinkChange(e.target.value)}
                        >
                          <option value="">Selecione…</option>
                          {produtos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.codigo} — {p.descricao}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="form-actions">
                        <button type="button" className="secondary" onClick={onFechar}>
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={busy || !produtoLinkId}
                          onClick={() => onVincular(i.id, produtoLinkId)}
                        >
                          Vincular
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </section>
  );
}
