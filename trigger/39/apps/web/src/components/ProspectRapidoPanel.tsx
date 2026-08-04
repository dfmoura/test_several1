import { useState } from 'react';
import { ApiError, api, type Parceiro } from '../lib/api';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export type ProspectCandidato = {
  id: number;
  codigo: string;
  razao_social: string;
  is_prospect: boolean;
  papel_cliente: boolean;
  municipio: string | null;
  uf: string | null;
  whatsapp: string | null;
  email: string | null;
  cnpj_cpf: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (parceiro: Parceiro) => void;
  onReuse: (candidato: ProspectCandidato) => void;
  disabled?: boolean;
  /** Modo dedicado do wizard: sem Fechar; ocupa a seção (não drawer auxiliar). */
  embedded?: boolean;
};

type FormState = {
  nome: string;
  whatsapp: string;
  email: string;
  municipio: string;
  uf: string;
  cnpj_cpf: string;
  origem_lead: string;
};

const empty: FormState = {
  nome: '',
  whatsapp: '',
  email: '',
  municipio: '',
  uf: 'MG',
  cnpj_cpf: '',
  origem_lead: '',
};

export function ProspectRapidoPanel({
  open,
  onClose,
  onCreated,
  onReuse,
  disabled,
  embedded = false,
}: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<ProspectCandidato[]>([]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setCandidatos([]);
    setErro(null);
  };

  const criar = async (forcar: boolean) => {
    if (disabled) return;
    const nome = form.nome.trim();
    if (!nome) {
      setErro('Informe o nome do prospect.');
      return;
    }
    if (!form.whatsapp.trim() && !form.email.trim()) {
      setErro('Informe WhatsApp ou e-mail (ao menos um).');
      return;
    }
    if (!form.municipio.trim() || form.uf.length !== 2) {
      setErro('Informe cidade e UF.');
      return;
    }

    setPending(true);
    setErro(null);
    try {
      const res = await api.post<{ data: Parceiro }>('/parceiros/prospect-rapido', {
        nome,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        municipio: form.municipio.trim(),
        uf: form.uf.toUpperCase(),
        cnpj_cpf: form.cnpj_cpf.trim() || null,
        origem_lead: form.origem_lead.trim() || null,
        forcar,
      });
      setForm(empty);
      setCandidatos([]);
      onCreated(res.data);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const list = (e.payload?.candidatos as ProspectCandidato[]) ?? [];
        setCandidatos(list);
        setErro(e.message);
      } else {
        setErro(e instanceof ApiError ? e.message : 'Falha ao criar prospect');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={`prospect-rapido${embedded ? ' prospect-rapido--embedded' : ''}`}>
      <div className="prospect-rapido-head">
        <div>
          <strong>{embedded ? 'Cadastro mínimo do prospect' : 'Novo prospect (cadastro mínimo)'}</strong>
          <p className="form-hint" style={{ margin: '0.25rem 0 0' }}>
            Nome + (WhatsApp ou e-mail) + cidade/UF (~30s). Gera PAR real — texto livre de cliente
            é proibido. Cadastro completo só na conversão em pedido.
          </p>
        </div>
        {!embedded ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={pending}>
            Fechar
          </button>
        ) : null}
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="form-grid">
        <div className="form-group span-full">
          <label>Nome *</label>
          <input
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            placeholder="Como o contato se apresentou"
            disabled={disabled || pending}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>WhatsApp</label>
          <input
            value={form.whatsapp}
            onChange={(e) => set('whatsapp', e.target.value)}
            placeholder="(31) 9xxxx-xxxx"
            disabled={disabled || pending}
          />
        </div>
        <div className="form-group">
          <label>E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="opcional se tiver WhatsApp"
            disabled={disabled || pending}
          />
        </div>
        <div className="form-group">
          <label>Cidade *</label>
          <input
            value={form.municipio}
            onChange={(e) => set('municipio', e.target.value)}
            disabled={disabled || pending}
          />
        </div>
        <div className="form-group">
          <label>UF *</label>
          <select
            value={form.uf}
            onChange={(e) => set('uf', e.target.value)}
            disabled={disabled || pending}
          >
            {UFS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>CNPJ/CPF (opc.)</label>
          <input
            value={form.cnpj_cpf}
            onChange={(e) => set('cnpj_cpf', e.target.value)}
            placeholder="se informado espontaneamente"
            disabled={disabled || pending}
          />
        </div>
        <div className="form-group">
          <label>Origem do lead (opc.)</label>
          <input
            value={form.origem_lead}
            onChange={(e) => set('origem_lead', e.target.value)}
            placeholder="indicação, site, WhatsApp…"
            disabled={disabled || pending}
          />
        </div>
      </div>

      {candidatos.length > 0 ? (
        <div className="prospect-dup-box">
          <p className="form-hint" style={{ marginTop: 0 }}>
            Achamos cadastros parecidos — reutilize (nunca duplicar) ou confirme criação nova:
          </p>
          <ul className="prospect-dup-list">
            {candidatos.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>
                    {c.codigo} — {c.razao_social}
                  </strong>
                  <span className="muted">
                    {' '}
                    · {[c.is_prospect ? 'prospect' : null, c.papel_cliente ? 'cliente' : null]
                      .filter(Boolean)
                      .join(', ') || 'parceiro'}
                    {c.municipio ? ` · ${c.municipio}/${c.uf ?? ''}` : ''}
                    {c.whatsapp ? ` · ${c.whatsapp}` : ''}
                    {c.email ? ` · ${c.email}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={pending}
                  onClick={() => {
                    onReuse(c);
                    setForm(empty);
                    setCandidatos([]);
                    onClose();
                  }}
                >
                  Usar este
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={pending}
            onClick={() => void criar(true)}
          >
            Criar mesmo assim (não é duplicado)
          </button>
        </div>
      ) : (
        <div className="btn-row" style={{ marginTop: '0.85rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={disabled || pending}
            onClick={() => void criar(false)}
          >
            {pending ? 'Salvando…' : 'Criar prospect e usar no ORC'}
          </button>
        </div>
      )}
    </div>
  );
}
