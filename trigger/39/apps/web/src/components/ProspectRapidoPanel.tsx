import { useRef, useState } from 'react';
import { ApiError, api, type CepConsulta, type Parceiro } from '../lib/api';
import { formatCepInput, formatWhatsAppInput, onlyDigits } from '../lib/format';
import { ORIGENS_LEAD } from '../lib/origemLead';

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
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  ibge: string;
  cnpj_cpf: string;
  origem_lead: string;
};

const empty: FormState = {
  nome: '',
  whatsapp: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  municipio: '',
  uf: 'MG',
  ibge: '',
  cnpj_cpf: '',
  origem_lead: '',
};

function blankToNull(value: string): string | null {
  const t = value.trim();
  return t === '' ? null : t;
}

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
  const [consultingCep, setConsultingCep] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cepOk, setCepOk] = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<ProspectCandidato[]>([]);
  const lastCepConsultado = useRef('');
  const cepSeq = useRef(0);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setCandidatos([]);
    setErro(null);
    if (key === 'cep') setCepOk(null);
  };

  const aplicarCep = (d: CepConsulta) => {
    const uf = String(d.uf ?? '').trim().toUpperCase();
    setForm((prev) => ({
      ...prev,
      logradouro: d.logradouro?.trim() || prev.logradouro,
      complemento: d.complemento?.trim() || prev.complemento,
      bairro: d.bairro?.trim() || prev.bairro,
      municipio: d.localidade?.trim() || prev.municipio,
      uf: uf.length === 2 ? uf : prev.uf,
      ibge: d.ibge?.trim() || prev.ibge,
    }));
    setCandidatos([]);
    const temLogradouro = Boolean(d.logradouro?.trim());
    setCepOk(
      temLogradouro
        ? 'Endereço encontrado — complete o número (e o complemento, se houver).'
        : 'CEP encontrado (sem logradouro) — complete rua, número e bairro.',
    );
  };

  const consultarCep = async (digitsArg?: string) => {
    if (disabled || pending) return;
    const cep = digitsArg ?? onlyDigits(form.cep);
    if (cep.length !== 8) {
      setErro('Informe um CEP com 8 dígitos para buscar o endereço.');
      setCepOk(null);
      return;
    }
    if (consultingCep && lastCepConsultado.current === cep) return;

    const seq = ++cepSeq.current;
    lastCepConsultado.current = cep;
    setConsultingCep(true);
    setErro(null);
    setCepOk(null);
    try {
      const res = await api.get<{ data: CepConsulta }>(`/consulta/cep/${cep}`);
      if (seq !== cepSeq.current) return;
      aplicarCep(res.data);
    } catch (e) {
      if (seq !== cepSeq.current) return;
      lastCepConsultado.current = '';
      setCepOk(null);
      setErro(e instanceof ApiError ? e.message : 'CEP não encontrado.');
    } finally {
      if (seq === cepSeq.current) setConsultingCep(false);
    }
  };

  const onCepChange = (raw: string) => {
    const digits = onlyDigits(raw).slice(0, 8);
    set('cep', digits);
    if (digits.length !== 8) {
      lastCepConsultado.current = '';
      return;
    }
    if (digits !== lastCepConsultado.current) {
      void consultarCep(digits);
    }
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
      setErro('Informe cidade e UF (busque pelo CEP ou preencha).');
      return;
    }

    setPending(true);
    setErro(null);
    try {
      const res = await api.post<{ data: Parceiro }>('/parceiros/prospect-rapido', {
        nome,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        cep: form.cep.trim() || null,
        logradouro: blankToNull(form.logradouro),
        numero: blankToNull(form.numero),
        complemento: blankToNull(form.complemento),
        bairro: blankToNull(form.bairro),
        municipio: form.municipio.trim(),
        uf: form.uf.toUpperCase(),
        ibge: form.ibge.trim() || null,
        cnpj_cpf: form.cnpj_cpf.trim() || null,
        origem_lead: form.origem_lead.trim() || null,
        forcar,
      });
      setForm(empty);
      setCandidatos([]);
      setCepOk(null);
      lastCepConsultado.current = '';
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

  const busy = disabled || pending;

  return (
    <div className={`prospect-rapido${embedded ? ' prospect-rapido--embedded' : ''}`}>
      <div className="prospect-rapido-head">
        <div>
          <strong>{embedded ? 'Cadastro mínimo do prospect' : 'Novo prospect (cadastro mínimo)'}</strong>
          <p className="form-hint" style={{ margin: '0.25rem 0 0' }}>
            Nome + (WhatsApp ou e-mail) + cidade/UF (~30s). CEP busca o endereço; o restante
            você completa se souber. Cadastro fiscal completo só na conversão em pedido.
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
            disabled={busy}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>WhatsApp</label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={formatWhatsAppInput(form.whatsapp)}
            onChange={(e) => set('whatsapp', onlyDigits(e.target.value).slice(0, 11))}
            placeholder="(31) 99999-9999"
            disabled={busy}
          />
        </div>
        <div className="form-group">
          <label>E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="opcional se tiver WhatsApp"
            disabled={busy}
          />
        </div>
        <div className="form-group">
          <label>
            CEP <span className="field-note">busca endereço</span>
          </label>
          <div className="input-action">
            <input
              inputMode="numeric"
              autoComplete="postal-code"
              value={formatCepInput(form.cep)}
              onChange={(e) => onCepChange(e.target.value)}
              onBlur={(e) => {
                const digits = onlyDigits(e.target.value);
                if (digits.length === 8 && lastCepConsultado.current !== digits) {
                  void consultarCep(digits);
                }
              }}
              placeholder="00000-000"
              disabled={busy}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy || consultingCep}
              onClick={() => void consultarCep()}
            >
              {consultingCep ? '…' : 'Buscar'}
            </button>
          </div>
          {cepOk ? <p className="form-hint" style={{ margin: 0 }}>{cepOk}</p> : null}
        </div>
        <div className="form-group span-2">
          <label>Logradouro</label>
          <input
            value={form.logradouro}
            onChange={(e) => set('logradouro', e.target.value)}
            placeholder="preenchido pelo CEP — ajuste se preciso"
            disabled={busy}
          />
        </div>
        <div className="form-group">
          <label>Número</label>
          <input
            value={form.numero}
            onChange={(e) => set('numero', e.target.value)}
            placeholder="s/n se não houver"
            disabled={busy}
          />
        </div>
        <div className="form-group">
          <label>Complemento</label>
          <input
            value={form.complemento}
            onChange={(e) => set('complemento', e.target.value)}
            placeholder="sala, loja…"
            disabled={busy}
          />
        </div>
        <div className="form-group">
          <label>Bairro</label>
          <input
            value={form.bairro}
            onChange={(e) => set('bairro', e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="form-group">
          <label>Cidade *</label>
          <input
            value={form.municipio}
            onChange={(e) => set('municipio', e.target.value)}
            placeholder="pelo CEP ou manual"
            disabled={busy}
          />
        </div>
        <div className="form-group">
          <label>UF *</label>
          <select
            value={form.uf}
            onChange={(e) => set('uf', e.target.value)}
            disabled={busy}
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
            disabled={busy}
          />
        </div>
        <div className="form-group">
          <label>Origem do lead (opc.)</label>
          <select
            value={form.origem_lead}
            onChange={(e) => set('origem_lead', e.target.value)}
            disabled={busy}
          >
            <option value="">Não informado</option>
            {ORIGENS_LEAD.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
                    setCepOk(null);
                    lastCepConsultado.current = '';
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
            disabled={busy}
            onClick={() => void criar(false)}
          >
            {pending ? 'Salvando…' : 'Criar prospect e usar no ORC'}
          </button>
        </div>
      )}
    </div>
  );
}
