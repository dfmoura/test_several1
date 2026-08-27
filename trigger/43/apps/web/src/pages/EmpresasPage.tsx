import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CnaeAtividadesPanel } from '../components/CnaeAtividadesPanel';
import { CnpjConsultaMetaStrip } from '../components/CnpjConsultaMetaStrip';
import { PageHeader } from '../components/PageHeader';
import { RegistroMetaStrip } from '../components/RegistroMetaStrip';
import { QsaSociosPanel } from '../components/QsaSociosPanel';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import {
  api,
  ApiError,
  mensagemCepImportado,
  patchEnderecoFromCep,
  setEmpresaId,
  type BancoConsulta,
  type CepConsulta,
  type CnpjConsulta,
  type Empresa,
  type EmpresaCertificadoA1,
  type EmpresaContaFinanceira,
  type EmpresaFiscalHistorico,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import {
  allowedCrtsForRegime,
  crtLabel,
  defaultCrtForRegime,
  IE_STATUSES,
  isValidCnpj,
  syncCrtForForm,
} from '../lib/empresaFiscal';
import {
  formatCep,
  formatCnpj,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLatLng,
  formatPhone,
  onlyDigits,
} from '../lib/format';
import { ieStatusLabel } from '../lib/parceiroFiscal';
import { useTableSort } from '../lib/useTableSort';

type ContaForm = {
  key: string;
  id?: number;
  codigo?: string;
  tipo: string;
  descricao: string;
  banco_codigo: string;
  banco_nome: string;
  agencia: string;
  conta: string;
  tipo_conta: string;
  pix_chave: string;
  principal: boolean;
  ativa: boolean;
  saldo_abertura: string;
  saldo_abertura_em: string;
  observacao: string;
};

type EmpresaForm = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  ie: string;
  ie_status: string;
  im: string;
  im_obrigatoria_nfse: boolean;
  iest: string;
  regime: string;
  crt: number;
  regime_desde: string;
  cnae: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ibge: string;
  origem_latitude: string;
  origem_longitude: string;
  venda_ativa: boolean;
  estoque_ativo: boolean;
  situacao: string;
  motivo_vigencia_fiscal: string;
  contas: ContaForm[];
};

const TABS = [
  'Identificação',
  'Atividades',
  'Endereço',
  'Contato',
  'Contas',
  'Sócios',
  'Histórico',
  'Operação',
  'Certificado A1',
] as const;
type Tab = (typeof TABS)[number];

type ExclusaoPreflight = {
  pode_excluir: boolean;
  bloqueios: string[];
  mensagem: string;
};

function fieldErrors(err: unknown): string {
  if (err instanceof ApiError && err.details) {
    return Object.entries(err.details)
      .flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`))
      .join(' ');
  }
  return err instanceof Error ? err.message : 'Erro inesperado.';
}

function certStatusLabel(status?: string | null): string {
  if (status === 'A_VENCER') return 'A vencer';
  if (status === 'VENCIDO') return 'Vencido';
  if (status === 'VIGENTE') return 'Vigente';
  if (status === 'AINDA_NAO_VALIDO') return 'Ainda não válido';
  return status ?? '—';
}

const REGIMES = [
  { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL', label: 'Lucro Real' },
  { value: 'MEI', label: 'MEI' },
] as const;

const TIPOS_CONTA_FIN = [
  { value: 'BANCO', label: 'Banco' },
  { value: 'CAIXA', label: 'Caixa' },
  { value: 'APLICACAO', label: 'Aplicação' },
] as const;

let contaKeySeq = 0;
function nextContaKey(): string {
  contaKeySeq += 1;
  return `cf-${contaKeySeq}`;
}

function emptyConta(principal = false): ContaForm {
  return {
    key: nextContaKey(),
    tipo: 'BANCO',
    descricao: '',
    banco_codigo: '',
    banco_nome: '',
    agencia: '',
    conta: '',
    tipo_conta: 'CORRENTE',
    pix_chave: '',
    principal,
    ativa: true,
    saldo_abertura: '',
    saldo_abertura_em: '',
    observacao: '',
  };
}

function mapContas(emp: Empresa): ContaForm[] {
  const list = emp.contas_financeiras ?? [];
  if (list.length === 0) return [emptyConta(true)];
  return list.map((c: EmpresaContaFinanceira) => ({
    key: nextContaKey(),
    id: c.id,
    codigo: c.codigo,
    tipo: c.tipo || 'BANCO',
    descricao: c.descricao ?? '',
    banco_codigo: c.banco_codigo ?? '',
    banco_nome: c.banco_nome ?? '',
    agencia: c.agencia ?? '',
    conta: c.conta ?? '',
    tipo_conta: c.tipo_conta ?? 'CORRENTE',
    pix_chave: c.pix_chave ?? '',
    principal: Boolean(c.principal),
    ativa: c.ativa !== false,
    saldo_abertura:
      c.saldo_abertura === null || c.saldo_abertura === undefined
        ? ''
        : String(c.saldo_abertura),
    saldo_abertura_em: c.saldo_abertura_em ? c.saldo_abertura_em.slice(0, 10) : '',
    observacao: c.observacao ?? '',
  }));
}

function serializeContas(contas: ContaForm[]) {
  return contas
    .filter(
      (c) =>
        c.descricao ||
        c.banco_codigo ||
        c.banco_nome ||
        c.agencia ||
        c.conta ||
        c.pix_chave ||
        c.saldo_abertura,
    )
    .map((c, ordem) => ({
      id: c.id,
      tipo: c.tipo || 'BANCO',
      descricao: c.descricao || null,
      banco_codigo: c.banco_codigo || null,
      banco_nome: c.banco_nome || null,
      agencia: c.agencia || null,
      conta: c.conta || null,
      tipo_conta: c.tipo === 'CAIXA' ? null : c.tipo_conta || null,
      pix_chave: c.pix_chave || null,
      principal: c.principal,
      ativa: c.ativa,
      ordem,
      saldo_abertura: c.saldo_abertura === '' ? null : Number(c.saldo_abertura),
      saldo_abertura_em: c.saldo_abertura_em || null,
      observacao: c.observacao || null,
    }));
}

function bankLabel(b: BancoConsulta): string {
  const code = b.code ? `${b.code} — ` : '';
  return `${code}${b.fullName || b.name}`;
}

function toForm(emp: Empresa): EmpresaForm {
  const regime = emp.regime ?? 'SIMPLES_NACIONAL';
  return {
    cnpj: emp.cnpj ?? '',
    razao_social: emp.razao_social,
    nome_fantasia: emp.nome_fantasia ?? '',
    ie: emp.ie ?? '',
    ie_status: emp.ie_status ?? 'NAO_VERIFICADA',
    im: emp.im ?? '',
    im_obrigatoria_nfse: Boolean(emp.im_obrigatoria_nfse),
    iest: emp.iest ?? '',
    regime,
    crt: emp.crt ?? defaultCrtForRegime(regime),
    regime_desde: emp.regime_desde ? emp.regime_desde.slice(0, 10) : '',
    cnae: emp.cnae ?? '',
    email: emp.email ?? '',
    telefone: emp.telefone ?? '',
    logradouro: emp.logradouro ?? '',
    numero: emp.numero ?? '',
    complemento: emp.complemento ?? '',
    bairro: emp.bairro ?? '',
    municipio: emp.municipio ?? '',
    uf: emp.uf ?? '',
    cep: emp.cep ?? '',
    ibge: emp.ibge ?? '',
    origem_latitude: emp.origem_latitude ?? '',
    origem_longitude: emp.origem_longitude ?? '',
    venda_ativa: emp.venda_ativa,
    estoque_ativo: emp.estoque_ativo,
    situacao: emp.situacao,
    motivo_vigencia_fiscal: '',
    contas: mapContas(emp),
  };
}

function applyCnpjToForm(form: EmpresaForm, d: CnpjConsulta): EmpresaForm {
  const cnae =
    d.cnae ??
    (d.cnae_fiscal != null ? String(d.cnae_fiscal).padStart(7, '0') : form.cnae);
  const telefone = d.telefone ?? d.ddd_telefone_1 ?? form.telefone;
  const ibge =
    d.ibge ??
    (d.codigo_municipio_ibge != null ? String(d.codigo_municipio_ibge) : form.ibge);

  const regime = d.regime_sugerido ?? form.regime;
  return {
    ...form,
    razao_social: d.razao_social ?? form.razao_social,
    nome_fantasia: d.nome_fantasia ?? form.nome_fantasia,
    regime,
    crt: syncCrtForForm(regime, form.crt, form.regime),
    cnae,
    logradouro: d.logradouro ?? form.logradouro,
    numero: d.numero ?? form.numero,
    complemento: d.complemento ?? form.complemento,
    bairro: d.bairro ?? form.bairro,
    municipio: d.municipio ?? form.municipio,
    uf: d.uf ?? form.uf,
    cep: d.cep ? onlyDigits(d.cep) : form.cep,
    ibge,
    telefone: telefone ? onlyDigits(telefone) : form.telefone,
    email: d.email ?? form.email,
  };
}

export function EmpresasPage() {
  const { hasPermission, maxEmpresas, empresaId, refresh, setEmpresa } = useAuth();
  const [params] = useSearchParams();
  const canEdit = hasPermission('empresas.gerir');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selected, setSelected] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpresaForm | null>(null);
  const [consulta, setConsulta] = useState<CnpjConsulta | null>(null);
  const [tab, setTab] = useState<Tab>('Identificação');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consulting, setConsulting] = useState<'cnpj' | 'cep' | 'geo' | null>(null);
  const [cnpjUnlocked, setCnpjUnlocked] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [bancos, setBancos] = useState<BancoConsulta[]>([]);
  const [bancosLoading, setBancosLoading] = useState(false);
  const [cert, setCert] = useState<EmpresaCertificadoA1 | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const [certUploading, setCertUploading] = useState(false);
  const [certRemoving, setCertRemoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exclusao, setExclusao] = useState<ExclusaoPreflight | null>(null);
  const [exclusaoLoading, setExclusaoLoading] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certSenha, setCertSenha] = useState('');
  const certFileRef = useRef<HTMLInputElement | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const openedFromQuery = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ data: Empresa[] }>('/empresas');
        setEmpresas(res.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (tab !== 'Contas' || bancos.length > 0 || bancosLoading) return;
    setBancosLoading(true);
    void (async () => {
      try {
        const res = await api.get<{ data: BancoConsulta[] }>('/consulta/bancos');
        setBancos(res.data);
      } catch {
        /* catálogo opcional — input manual permanece */
      } finally {
        setBancosLoading(false);
      }
    })();
  }, [tab, bancos.length, bancosLoading]);

  useEffect(() => {
    if (!selected || !canEdit) {
      setExclusao(null);
      setExclusaoLoading(false);
      return;
    }
    const empId = selected.id;
    setExclusaoLoading(true);
    setExclusao(null);
    void (async () => {
      try {
        const res = await api.get<{ data: ExclusaoPreflight }>(
          `/empresas/${empId}/exclusao-preflight`,
          empId,
        );
        if (selectedIdRef.current !== empId) return;
        setExclusao(res.data);
      } catch {
        if (selectedIdRef.current !== empId) return;
        // Fail-closed: sem preflight, não habilita exclusão.
        setExclusao({
          pode_excluir: false,
          bloqueios: ['Não foi possível verificar dependências'],
          mensagem:
            'Não foi possível verificar se a empresa pode ser excluída. Use situação INATIVA se necessário.',
        });
      } finally {
        if (selectedIdRef.current === empId) setExclusaoLoading(false);
      }
    })();
  }, [selected?.id, canEdit]);

  useEffect(() => {
    if (!selected || tab !== 'Certificado A1') return;
    const empId = selected.id;
    setCertLoading(true);
    void (async () => {
      try {
        const res = await api.get<{ data: EmpresaCertificadoA1 }>(
          `/empresas/${empId}/certificado-a1`,
          empId,
        );
        if (selectedIdRef.current !== empId) return;
        setCert(res.data);
      } catch (err) {
        if (selectedIdRef.current !== empId) return;
        setCert(null);
        setError(fieldErrors(err));
      } finally {
        if (selectedIdRef.current === empId) setCertLoading(false);
      }
    })();
  }, [selected, tab]);

  const bancosByCode = useMemo(() => {
    const map = new Map<string, BancoConsulta>();
    for (const b of bancos) {
      if (b.code) map.set(b.code, b);
    }
    return map;
  }, [bancos]);

  const applyCnpjConsulta = async (
    digits: string,
    base: EmpresaForm,
    empresaId: number,
    silent = false,
  ) => {
    setConsulting('cnpj');
    if (!silent) {
      setError('');
      setMessage('');
    }
    try {
      const res = await api.get<{ data: CnpjConsulta }>(`/consulta/cnpj/${digits}`);
      if (selectedIdRef.current !== empresaId) return;
      const d = res.data;
      setForm(applyCnpjToForm(base, d));
      setConsulta(d);
      if (!silent) {
        setMessage('Dados do CNPJ importados da Receita. Confira IE e IM antes de salvar.');
      }
    } catch (err) {
      if (selectedIdRef.current !== empresaId) return;
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Erro na consulta CNPJ.');
      }
    } finally {
      if (selectedIdRef.current === empresaId) {
        setConsulting(null);
      }
    }
  };

  const openEdit = (emp: Empresa, initialTab: Tab = 'Identificação') => {
    selectedIdRef.current = emp.id;
    setSelected(emp);
    setForm(toForm(emp));
    setConsulta(null);
    setTab(initialTab);
    setCnpjUnlocked(!emp.cnpj);
    setMessage('');
    setError('');
    setCert(null);
    setCertFile(null);
    setCertSenha('');
    setExclusao(null);
    setExclusaoLoading(Boolean(canEdit));
    if (certFileRef.current) certFileRef.current.value = '';

    void (async () => {
      try {
        const res = await api.get<{ data: Empresa }>(`/empresas/${emp.id}`);
        if (selectedIdRef.current !== emp.id) return;
        const full = res.data;
        setSelected(full);
        const next = toForm(full);
        setForm(next);
        const digits = onlyDigits(full.cnpj ?? '');
        if (digits.length === 14) {
          void applyCnpjConsulta(digits, next, emp.id, true);
        }
      } catch {
        const next = toForm(emp);
        const digits = onlyDigits(emp.cnpj ?? '');
        if (digits.length === 14) {
          void applyCnpjConsulta(digits, next, emp.id, true);
        }
      }
    })();
  };

  useEffect(() => {
    if (openedFromQuery.current || loading || empresas.length === 0) {
      return;
    }
    const tabQuery = (params.get('tab') ?? '').toLowerCase();
    if (tabQuery !== 'a1' && tabQuery !== 'certificado-a1' && tabQuery !== 'certificado') {
      return;
    }
    const emp = empresas.find((e) => e.id === empresaId) ?? empresas[0];
    if (!emp) {
      return;
    }
    openedFromQuery.current = true;
    openEdit(emp, 'Certificado A1');
  }, [loading, empresas, empresaId, params]);

  const uploadCertificadoA1 = async () => {
    if (!selected || !canEdit) return;
    if (!certFile) {
      setError('Selecione o arquivo .pfx ou .p12 do certificado A1.');
      return;
    }
    if (!certSenha) {
      setError('Informe a senha do certificado A1.');
      return;
    }
    setCertUploading(true);
    setError('');
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('arquivo', certFile);
      fd.append('senha', certSenha);
      const res = await api.postForm<{ data: EmpresaCertificadoA1 }>(
        `/empresas/${selected.id}/certificado-a1`,
        fd,
        selected.id,
      );
      setCert(res.data);
      setCertFile(null);
      setCertSenha('');
      if (certFileRef.current) certFileRef.current.value = '';
      setMessage(
        res.data.aviso
          ? `Certificado A1 armazenado no cofre. ${res.data.aviso}`
          : 'Certificado A1 armazenado no cofre com proteção.',
      );
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setCertUploading(false);
    }
  };

  const removerCertificadoA1 = async () => {
    if (!selected || !canEdit || !cert?.cadastrado) return;
    if (
      !window.confirm(
        'Remover o certificado A1 do cofre desta empresa? O arquivo cifrado será apagado. Esta ação não pode ser desfeita.',
      )
    ) {
      return;
    }
    setCertRemoving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.delete<{ data: EmpresaCertificadoA1 }>(
        `/empresas/${selected.id}/certificado-a1`,
        selected.id,
      );
      setCert(res.data);
      setMessage('Certificado A1 removido do cofre.');
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setCertRemoving(false);
    }
  };

  const update = (patch: Partial<EmpresaForm>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateConta = (key: string, patch: Partial<ContaForm>) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        contas: prev.contas.map((c) => (c.key === key ? { ...c, ...patch } : c)),
      };
    });
  };

  const setContaPrincipal = (key: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        contas: prev.contas.map((c) => ({ ...c, principal: c.key === key })),
      };
    });
  };

  const addConta = () => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = emptyConta(prev.contas.length === 0);
      return { ...prev, contas: [...prev.contas, next] };
    });
  };

  const removeConta = (key: string) => {
    setForm((prev) => {
      if (!prev || prev.contas.length <= 1) return prev;
      const contas = prev.contas.filter((c) => c.key !== key);
      if (!contas.some((c) => c.principal) && contas[0]) {
        contas[0] = { ...contas[0], principal: true };
      }
      return { ...prev, contas };
    });
  };

  const aplicarBanco = (key: string, code: string) => {
    const bank = bancosByCode.get(code);
    updateConta(key, {
      banco_codigo: code,
      banco_nome: bank ? bank.fullName || bank.name : '',
    });
  };

  const consultarCnpj = async () => {
    if (!form || !selected) return;
    const digits = onlyDigits(form.cnpj);
    if (digits.length !== 14) {
      setError('Informe um CNPJ válido com 14 dígitos.');
      return;
    }
    await applyCnpjConsulta(digits, form, selected.id, false);
  };

  const consultarCep = async () => {
    if (!form) return;
    const digits = onlyDigits(form.cep);
    if (digits.length !== 8) {
      setError('Informe um CEP válido com 8 dígitos.');
      return;
    }
    setConsulting('cep');
    setError('');
    setMessage('');
    try {
      const res = await api.get<{ data: CepConsulta }>(`/consulta/cep/${digits}`);
      const d = res.data;
      update(patchEnderecoFromCep(d, form));
      setMessage(mensagemCepImportado(d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na consulta CEP.');
    } finally {
      setConsulting(null);
    }
  };

  const localizarOrigemPeloEndereco = async () => {
    if (!form || !canEdit) return;
    const temRua = Boolean(form.logradouro.trim() && form.municipio.trim() && form.uf.trim());
    const cepDigits = onlyDigits(form.cep);
    if (!temRua && cepDigits.length !== 8) {
      setError('Informe logradouro, município e UF (ou um CEP) para localizar a planta.');
      return;
    }
    setConsulting('geo');
    setError('');
    setMessage('');
    try {
      const qs = new URLSearchParams();
      if (form.logradouro.trim()) qs.set('logradouro', form.logradouro.trim());
      if (form.numero.trim()) qs.set('numero', form.numero.trim());
      if (form.municipio.trim()) qs.set('municipio', form.municipio.trim());
      if (form.uf.trim()) qs.set('uf', form.uf.trim());
      if (cepDigits.length === 8) qs.set('cep', cepDigits);
      const res = await api.get<{ data: CepConsulta }>(`/consulta/geo-endereco?${qs.toString()}`);
      const d = res.data;
      if (d.latitude && d.longitude) {
        update({ origem_latitude: d.latitude, origem_longitude: d.longitude });
        const fonte = d.fonte === 'nominatim' ? 'endereço (rua)' : 'CEP (último recurso)';
        setMessage(
          `Origem sugerida: ${formatLatLng(d.latitude, d.longitude)} · ${fonte}. Confira se é a planta e Salvar.`,
        );
        return;
      }
      setError('Não foi possível localizar a planta. Ajuste logradouro e número ou informe lat/lng.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Consulta de posição indisponível.');
    } finally {
      setConsulting(null);
    }
  };

  const handleSave = async () => {
    if (!selected || !form || !canEdit) return;
    const cnpjDigits = onlyDigits(form.cnpj);
    if (cnpjDigits.length === 14 && !isValidCnpj(cnpjDigits)) {
      setError('CNPJ com dígito verificador inválido.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const cnaesSec =
        consulta?.cnaes_secundarios?.map((item) => ({
          codigo: String(item.codigo),
          descricao: item.descricao ?? null,
        })) ??
        selected.cnaes_secundarios ??
        null;

      const { contas, motivo_vigencia_fiscal: motivoFiscal, ...empresaFields } = form;
      const res = await api.put<{ data: Empresa }>(`/empresas/${selected.id}`, {
        ...empresaFields,
        cnpj: cnpjDigits,
        cep: onlyDigits(form.cep),
        cnae: onlyDigits(form.cnae),
        regime_desde: form.regime_desde || null,
        iest: form.iest || null,
        cnaes_secundarios: cnaesSec,
        motivo_vigencia_fiscal: motivoFiscal || null,
        contas_financeiras: serializeContas(contas),
      });
      setEmpresas((prev) => prev.map((e) => (e.id === res.data.id ? res.data : e)));
      setSelected(res.data);
      setForm(toForm(res.data));
      setCnpjUnlocked(false);
      setMessage('Empresa atualizada com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const excluirEmpresa = async () => {
    if (!selected || !canEdit || deleting || exclusaoLoading) return;
    if (!exclusao?.pode_excluir) {
      setError(
        exclusao?.mensagem ??
          'Empresa com dependências. Inative (situação INATIVA) em vez de excluir.',
      );
      return;
    }
    setError('');
    setMessage('');

    // Revalida na hora do clique (corrida com outro usuário / outro aba).
    try {
      const pre = await api.get<{ data: ExclusaoPreflight }>(
        `/empresas/${selected.id}/exclusao-preflight`,
        selected.id,
      );
      setExclusao(pre.data);
      if (!pre.data.pode_excluir) {
        setError(pre.data.mensagem);
        return;
      }
    } catch (err) {
      setError(fieldErrors(err));
      return;
    }

    if (
      !window.confirm(
        `Excluir a empresa ${selected.codigo} (${selected.razao_social})?\n\n` +
          'Só é permitido enquanto não houver orçamentos, pedidos, financeiro ou outros movimentos. ' +
          'A empresa será removida definitivamente e o CNPJ ficará livre para um novo cadastro.',
      )
    ) {
      return;
    }

    setDeleting(true);
    const excluidaId = selected.id;
    try {
      await api.delete(`/empresas/${excluidaId}`, excluidaId);
      const restantes = empresas.filter((e) => e.id !== excluidaId);
      setEmpresas(restantes);
      setSelected(null);
      setForm(null);
      setConsulta(null);
      setCert(null);
      setExclusao(null);
      setMessage('Empresa excluída. O CNPJ ficou livre — pode cadastrar de novo se precisar.');
      const proxima = restantes[0];
      // Limpa o header antes do refresh — senão /auth/me recebe X-Empresa-Id da EMP excluída (403).
      setEmpresaId(proxima?.id ?? null);
      if (proxima) {
        setEmpresa(proxima.id);
      }
      await refresh();
    } catch (err) {
      setError(fieldErrors(err));
      // Recarrega preflight — pode ter surgido dependência.
      try {
        const pre = await api.get<{ data: ExclusaoPreflight }>(
          `/empresas/${excluidaId}/exclusao-preflight`,
          excluidaId,
        );
        setExclusao(pre.data);
      } catch {
        /* mantém estado anterior */
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading">Carregando empresas…</div>;

  const cnpjLocked = Boolean(selected?.cnpj) && !cnpjUnlocked;
  const cnaePrincipalDesc =
    consulta?.cnae_descricao ?? consulta?.cnae_fiscal_descricao ?? '';
  const cnaesSecundarios =
    consulta?.cnaes_secundarios ??
    selected?.cnaes_secundarios?.map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao ?? '',
    })) ??
    [];
  const socios = consulta?.qsa ?? [];
  const historico = selected?.fiscais_historico ?? [];
  const contasCount = form?.contas.filter(
    (c) => c.descricao || c.banco_codigo || c.banco_nome || c.conta || c.id,
  ).length ?? 0;
  const pendencias = selected?.fiscal_pendencias ?? [];
  const pendenciasEmissao = selected?.fiscal_pendencias_emissao ?? [];
  const fiscalCompleto = Boolean(selected?.cadastro_fiscal_completo);
  const aptoEmissao = Boolean(selected?.apto_emissao_nfe);
  const certPendencias = cert?.pendencias ?? [];
  const certTabHint =
    cert?.apto_operacao && cert.status === 'A_VENCER'
      ? ' · a vencer'
      : cert?.apto_operacao
        ? ' · ok'
        : cert?.cadastrado
          ? ' · pendente'
          : '';

  return (
    <div className="empresas-page">
      <PageHeader
        title="Empresas"
        description={`Empresas desta conta — até ${maxEmpresas} CNPJs. Cadastro com consulta à Receita Federal.`}
        actions={
          canEdit && empresas.length < maxEmpresas ? (
            <Link to="/empresas/nova" className="btn btn-primary">
              {empresas.length === 0 ? 'Cadastrar primeira empresa' : 'Nova empresa'}
            </Link>
          ) : undefined
        }
      />

      <div className="empresas-layout">
        <aside className="empresas-rail" aria-label="Empresas da conta">
          <div className="empresas-rail-head">
            <span className="empresas-rail-title">Empresas</span>
            <span className="empresas-rail-count">
              {empresas.length}/{maxEmpresas}
            </span>
          </div>
          {empresas.length === 0 ? (
            <div className="empresas-rail-empty">Nenhuma empresa nesta conta ainda.</div>
          ) : (
            <ul className="empresas-rail-list">
              {empresas.map((emp) => {
                const active = selected?.id === emp.id;
                const label = emp.nome_fantasia ?? emp.razao_social;
                return (
                  <li key={emp.id}>
                    <button
                      type="button"
                      className={`empresas-rail-item${active ? ' is-active' : ''}`}
                      aria-current={active ? 'true' : undefined}
                      onClick={() => openEdit(emp)}
                    >
                      <div className="empresas-rail-item-top">
                        <strong>{emp.codigo}</strong>
                        <StatusPill status={emp.situacao} />
                      </div>
                      <span className="empresas-rail-item-name">{label}</span>
                      <span className="empresas-rail-item-meta">
                        {formatCnpj(emp.cnpj)}
                        {emp.municipio ? ` · ${emp.municipio}/${emp.uf}` : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="empresas-detail" aria-label="Detalhe da empresa">
          {selected && form ? (
        <div className="card empresas-detail-card">
          <div className="card-body">
            <RegistroMetaStrip registro={selected} />
            <div className="empresa-header">
              <div className="empresa-header-title">
                <h2>{selected.codigo}</h2>
                <p className="form-hint">
                  {form.razao_social}
                  {consulting === 'cnpj' ? ' · consultando Receita…' : ''}
                </p>
              </div>
              <div className="empresa-header-actions">
                <a
                  href={`/empresas/${selected.id}/ficha`}
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => onAbrirFichaClick(e, `/empresas/${selected.id}/ficha`)}
                >
                  Imprimir ficha
                </a>
                {canEdit && cnpjLocked && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCnpjUnlocked(true)}
                  >
                    Alterar CNPJ
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={consulting === 'cnpj'}
                    onClick={consultarCnpj}
                  >
                    {consulting === 'cnpj' ? 'Consultando…' : 'Atualizar da Receita'}
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={
                      deleting ||
                      saving ||
                      exclusaoLoading ||
                      !exclusao ||
                      !exclusao.pode_excluir
                    }
                    onClick={() => void excluirEmpresa()}
                    aria-disabled={
                      deleting ||
                      saving ||
                      exclusaoLoading ||
                      !exclusao ||
                      !exclusao.pode_excluir
                    }
                    title={
                      exclusaoLoading
                        ? 'Verificando se a empresa pode ser excluída…'
                        : exclusao?.pode_excluir
                          ? 'Excluir somente se ainda não houver movimentos operacionais'
                          : exclusao?.mensagem ||
                            'Empresa com dependências — inative em vez de excluir'
                    }
                  >
                    {deleting
                      ? 'Excluindo…'
                      : exclusaoLoading
                        ? 'Verificando…'
                        : 'Excluir empresa'}
                  </button>
                )}
              </div>
            </div>

            {canEdit && exclusao && !exclusao.pode_excluir && (
              <p className="form-hint" role="status">
                Exclusão indisponível — empresa já possui vínculos
                {exclusao.bloqueios.length > 0
                  ? ` (${exclusao.bloqueios.slice(0, 3).join('; ')}${
                      exclusao.bloqueios.length > 3 ? '…' : ''
                    })`
                  : ''}
                . Para desativar o CNPJ no dia a dia, use situação INATIVA.
              </p>
            )}

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="fiscal-status-row empresas-status-row">
              <div className={`fiscal-status-chip${fiscalCompleto ? ' is-ok' : ' is-warn'}`}>
                {fiscalCompleto ? 'Cadastro fiscal completo' : 'Cadastro fiscal incompleto'}
              </div>
              <div className={`fiscal-status-chip${aptoEmissao ? ' is-ok' : ' is-muted'}`}>
                {aptoEmissao ? 'Apto para emissão NF-e' : 'Não apto para emissão NF-e'}
              </div>
              {cert?.cadastrado ? (
                <div
                  className={`fiscal-status-chip${
                    cert.apto_operacao
                      ? cert.status === 'A_VENCER'
                        ? ' is-warn'
                        : ' is-ok'
                      : ' is-warn'
                  }`}
                >
                  A1 · {certStatusLabel(cert.status)}
                </div>
              ) : null}
            </div>

            {!fiscalCompleto && pendencias.length > 0 && (
              <div className="alert alert-warning fiscal-pendencias">
                <strong>Pendências do cadastro:</strong>
                <ul>
                  {pendencias.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {fiscalCompleto && pendenciasEmissao.length > 0 && (
              <div className="alert alert-warning fiscal-pendencias">
                <strong>Bloqueios de emissão:</strong>
                <ul>
                  {pendenciasEmissao.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <span className="form-hint" style={{ display: 'block', marginTop: '0.5rem' }}>
                  Confira a inscrição estadual e o status da IE (SINTEGRA/CCC) na aba Identificação.
                </span>
              </div>
            )}

            {cnpjUnlocked && Boolean(selected.cnpj) && (
              <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                CNPJ desbloqueado — alterar muda a identidade jurídica desta empresa.
              </p>
            )}

            {consulta && <CnpjConsultaMetaStrip consulta={consulta} />}

            <div className="tabs tabs-empresa">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`tab${tab === t ? ' active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === 'Atividades' && cnaesSecundarios.length > 0
                    ? ` · ${cnaesSecundarios.length}`
                    : ''}
                  {t === 'Contas' && contasCount > 0 ? ` · ${contasCount}` : ''}
                  {t === 'Sócios' && socios.length > 0 ? ` · ${socios.length}` : ''}
                  {t === 'Certificado A1' && certTabHint}
                </button>
              ))}
            </div>

            {tab === 'Identificação' && (
              <div className="form-section">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Código</label>
                    <input value={selected.codigo} disabled />
                  </div>
                  <div className="form-group">
                    <label>CNPJ</label>
                    <input
                      value={formatCnpj(form.cnpj) || form.cnpj}
                      disabled={!canEdit || cnpjLocked}
                      onChange={(e) =>
                        update({ cnpj: onlyDigits(e.target.value).slice(0, 14) })
                      }
                    />
                  </div>
                  <div className="form-group span-2">
                    <label>Razão social</label>
                    <input
                      value={form.razao_social}
                      disabled={!canEdit}
                      onChange={(e) => update({ razao_social: e.target.value })}
                    />
                  </div>
                  <div className="form-group span-2">
                    <label>Nome fantasia</label>
                    <input
                      value={form.nome_fantasia}
                      disabled={!canEdit}
                      onChange={(e) => update({ nome_fantasia: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Inscrição estadual (IE)</label>
                    <input
                      value={form.ie}
                      disabled={!canEdit}
                      onChange={(e) => update({ ie: e.target.value })}
                      placeholder="Informar manualmente"
                    />
                    <span className="form-hint">Informe manualmente — a consulta à Receita não devolve IE</span>
                  </div>
                  <div className="form-group">
                    <label>Status da IE</label>
                    <select
                      value={form.ie_status}
                      disabled={!canEdit}
                      onChange={(e) => update({ ie_status: e.target.value })}
                    >
                      {IE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {ieStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                    {form.ie_status === 'NAO_VERIFICADA' && form.ie.trim() !== '' && form.ie.trim().toUpperCase() !== 'ISENTO' ? (
                      <span className="form-hint">
                        IE informada, mas ainda não verificada — emissão NF-e fica bloqueada até status OK.
                      </span>
                    ) : null}
                  </div>
                  <div className="form-group">
                    <label>Inscrição municipal (IM)</label>
                    <input
                      value={form.im}
                      disabled={!canEdit}
                      onChange={(e) => update({ im: e.target.value })}
                      placeholder="Opcional"
                    />
                    <span className="form-hint">
                      Opcional na maioria dos municípios. Marque abaixo se o seu município exigir IM
                      para nota de serviço.
                    </span>
                  </div>
                  <div className="form-group">
                    <label htmlFor="emp-im-obrigatoria">Município exige IM</label>
                    <label
                      htmlFor="emp-im-obrigatoria"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                    >
                      <input
                        id="emp-im-obrigatoria"
                        type="checkbox"
                        disabled={!canEdit}
                        checked={form.im_obrigatoria_nfse}
                        onChange={(e) => update({ im_obrigatoria_nfse: e.target.checked })}
                      />
                      Este município exige inscrição municipal para NFS-e
                    </label>
                  </div>
                  <div className="form-group">
                    <label>IEST (substituto tributário)</label>
                    <input
                      value={form.iest}
                      disabled={!canEdit}
                      onChange={(e) => update({ iest: e.target.value })}
                      placeholder="Opcional — IE ST"
                    />
                  </div>
                  <div className="form-group">
                    <label>Regime tributário</label>
                    <select
                      value={form.regime}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const regime = e.target.value;
                        update({
                          regime,
                          crt: syncCrtForForm(regime, form.crt, form.regime),
                          regime_desde: form.regime_desde || new Date().toISOString().slice(0, 10),
                        });
                      }}
                    >
                      {REGIMES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    {consulta?.data_opcao_pelo_simples && (
                      <span className="form-hint">
                        Opção Simples desde {formatDate(consulta.data_opcao_pelo_simples)}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Código de regime (CRT)</label>
                    <select
                      value={form.crt}
                      disabled={!canEdit || allowedCrtsForRegime(form.regime).length === 1}
                      onChange={(e) => update({ crt: Number(e.target.value) })}
                    >
                      {allowedCrtsForRegime(form.regime).map((code) => (
                        <option key={code} value={code}>
                          {crtLabel(code)}
                        </option>
                      ))}
                    </select>
                    <span className="form-hint">
                      Código do regime tributário. No Simples, use 2 se a empresa ultrapassar o
                      sublimite.
                    </span>
                  </div>
                  <div className="form-group">
                    <label>Regime desde</label>
                    <input
                      type="date"
                      value={form.regime_desde}
                      disabled={!canEdit}
                      onChange={(e) => update({ regime_desde: e.target.value })}
                    />
                    <span className="form-hint">Data-corte para virada Simples → Lucro Real</span>
                  </div>
                  <div className="form-group">
                    <label>Situação no ERP</label>
                    <select
                      value={form.situacao}
                      disabled={!canEdit}
                      onChange={(e) => update({ situacao: e.target.value })}
                    >
                      <option value="ATIVA">Ativa</option>
                      <option value="INATIVA">Inativa</option>
                    </select>
                  </div>
                  {canEdit && (
                    <div className="form-group span-2">
                      <label>Motivo da vigência fiscal (opcional)</label>
                      <input
                        value={form.motivo_vigencia_fiscal}
                        onChange={(e) => update({ motivo_vigencia_fiscal: e.target.value })}
                        placeholder="Ex.: migração para Lucro Real em DD/MM/AAAA"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'Atividades' && form && (
              <CnaeAtividadesPanel
                cnae={form.cnae}
                cnaeDescricao={cnaePrincipalDesc}
                cnaesSecundarios={cnaesSecundarios}
                canEdit={canEdit}
                loading={consulting === 'cnpj' && !consulta}
                onCnaeChange={(digits) => update({ cnae: digits })}
              />
            )}

            {tab === 'Endereço' && (
              <div className="form-section">
                <div className="panel-title">
                  <h3>Endereço fiscal</h3>
                  {canEdit && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={consulting === 'cep'}
                      onClick={consultarCep}
                    >
                      {consulting === 'cep' ? 'Consultando…' : 'Buscar CEP'}
                    </button>
                  )}
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>CEP</label>
                    <input
                      value={formatCep(form.cep) || form.cep}
                      disabled={!canEdit}
                      onChange={(e) =>
                        update({ cep: onlyDigits(e.target.value).slice(0, 8) })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Código IBGE</label>
                    <input
                      value={form.ibge}
                      disabled={!canEdit}
                      onChange={(e) =>
                        update({ ibge: onlyDigits(e.target.value).slice(0, 7) })
                      }
                    />
                    <span className="form-hint">Código do município (IBGE)</span>
                  </div>
                  <div className="form-group span-2">
                    <label>Logradouro</label>
                    <input
                      value={form.logradouro}
                      disabled={!canEdit}
                      onChange={(e) => update({ logradouro: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Número</label>
                    <input
                      value={form.numero}
                      disabled={!canEdit}
                      onChange={(e) => update({ numero: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Complemento</label>
                    <input
                      value={form.complemento}
                      disabled={!canEdit}
                      onChange={(e) => update({ complemento: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Bairro</label>
                    <input
                      value={form.bairro}
                      disabled={!canEdit}
                      onChange={(e) => update({ bairro: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Município</label>
                    <input
                      value={form.municipio}
                      disabled={!canEdit}
                      onChange={(e) => update({ municipio: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>UF</label>
                    <input
                      value={form.uf}
                      maxLength={2}
                      disabled={!canEdit}
                      onChange={(e) =>
                        update({ uf: e.target.value.toUpperCase().slice(0, 2) })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {tab === 'Contato' && (
              <div className="form-section">
                <div className="form-grid">
                  <div className="form-group">
                    <label>E-mail comercial</label>
                    <input
                      type="email"
                      value={form.email}
                      disabled={!canEdit}
                      onChange={(e) => update({ email: e.target.value })}
                      placeholder="orcamentos@suaempresa.com.br"
                    />
                    <p className="form-hint" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                      Usado como resposta (Reply-To) quando o sistema envia a proposta por e-mail
                      ao cliente. O envio em si é da instalação — você não configura SMTP aqui.
                    </p>
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input
                      value={formatPhone(form.telefone) || form.telefone}
                      disabled={!canEdit}
                      onChange={(e) => update({ telefone: onlyDigits(e.target.value) })}
                    />
                  </div>
                  {consulta?.qualificacao_do_responsavel && (
                    <div className="form-group span-2">
                      <label>Qualificação do responsável (RFB)</label>
                      <input value={consulta.qualificacao_do_responsavel} disabled />
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'Sócios' && (
              <QsaSociosPanel
                socios={socios}
                loading={consulting === 'cnpj' && !consulta}
              />
            )}

            {tab === 'Contas' && form && (
              <div className="form-section">
                <div className="panel-title">
                  <h3>Contas financeiras</h3>
                  {canEdit && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addConta}>
                      Adicionar conta
                    </button>
                  )}
                </div>
                <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                  Tesouraria desta EMP · uma ou mais (banco, caixa ou aplicação) · destino futuro de
                  Contas da empresa para recebimentos e saldo inicial · bancos consultados automaticamente
                  {bancosLoading
                    ? ' · carregando catálogo…'
                    : bancos.length
                      ? ` · ${bancos.length} bancos`
                      : ''}
                </p>
                <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                  Saldo de abertura é posição na virada (estratégia de implantação). O saldo corrido
                  virá do ledger no módulo financeiro — não edite “saldo atual” aqui.
                </p>

                <div className="repeatable-list">
                  {form.contas.map((conta, index) => (
                    <div
                      key={conta.key}
                      className={`repeatable-item${conta.principal ? ' is-principal' : ''}`}
                    >
                      <div className="repeatable-item-header">
                        <strong>
                          {conta.codigo ? `${conta.codigo} · ` : ''}
                          Conta {index + 1}
                        </strong>
                        <div className="repeatable-item-actions">
                          <label className="radio-pill">
                            <input
                              type="radio"
                              name="conta-fin-principal"
                              checked={conta.principal}
                              disabled={!canEdit}
                              onChange={() => setContaPrincipal(conta.key)}
                            />
                            Principal
                          </label>
                          {canEdit && form.contas.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => removeConta(conta.key)}
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Tipo</label>
                          <select
                            value={conta.tipo}
                            disabled={!canEdit}
                            onChange={(e) => updateConta(conta.key, { tipo: e.target.value })}
                          >
                            {TIPOS_CONTA_FIN.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Descrição / apelido</label>
                          <input
                            value={conta.descricao}
                            disabled={!canEdit}
                            placeholder="Ex.: Sicoob operacional"
                            onChange={(e) => updateConta(conta.key, { descricao: e.target.value })}
                          />
                        </div>
                        {conta.tipo !== 'CAIXA' && (
                          <>
                            <div className="form-group span-2">
                              <label>Banco</label>
                              {bancos.length > 0 ? (
                                <select
                                  value={conta.banco_codigo}
                                  disabled={!canEdit}
                                  onChange={(e) => aplicarBanco(conta.key, e.target.value)}
                                >
                                  <option value="">Selecione o banco</option>
                                  {conta.banco_codigo && !bancosByCode.has(conta.banco_codigo) && (
                                    <option value={conta.banco_codigo}>
                                      {conta.banco_codigo}
                                      {conta.banco_nome ? ` — ${conta.banco_nome}` : ''}
                                    </option>
                                  )}
                                  {bancos
                                    .filter((b) => b.code)
                                    .map((b) => (
                                      <option key={`${b.code}-${b.ispb}`} value={b.code ?? ''}>
                                        {bankLabel(b)}
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <input
                                  value={conta.banco_nome}
                                  disabled={!canEdit}
                                  placeholder="Nome do banco"
                                  onChange={(e) =>
                                    updateConta(conta.key, { banco_nome: e.target.value })
                                  }
                                />
                              )}
                            </div>
                            <div className="form-group">
                              <label>Código</label>
                              <input
                                value={conta.banco_codigo}
                                disabled={!canEdit}
                                onChange={(e) =>
                                  updateConta(conta.key, {
                                    banco_codigo: onlyDigits(e.target.value).slice(0, 3),
                                  })
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Tipo de conta</label>
                              <select
                                value={conta.tipo_conta}
                                disabled={!canEdit}
                                onChange={(e) =>
                                  updateConta(conta.key, { tipo_conta: e.target.value })
                                }
                              >
                                <option value="CORRENTE">Corrente</option>
                                <option value="POUPANCA">Poupança</option>
                                <option value="PAGAMENTO">Pagamento</option>
                              </select>
                            </div>
                          </>
                        )}
                        <div className="form-group">
                          <label>Agência</label>
                          <input
                            value={conta.agencia}
                            disabled={!canEdit}
                            onChange={(e) => updateConta(conta.key, { agencia: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Conta</label>
                          <input
                            value={conta.conta}
                            disabled={!canEdit}
                            onChange={(e) => updateConta(conta.key, { conta: e.target.value })}
                          />
                        </div>
                        <div className="form-group span-2">
                          <label>Chave PIX</label>
                          <input
                            value={conta.pix_chave}
                            disabled={!canEdit}
                            onChange={(e) =>
                              updateConta(conta.key, { pix_chave: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Saldo de abertura (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={conta.saldo_abertura}
                            disabled={!canEdit}
                            placeholder="Opcional — na virada"
                            onChange={(e) =>
                              updateConta(conta.key, { saldo_abertura: e.target.value })
                            }
                          />
                          {conta.saldo_abertura !== '' && (
                            <span className="form-hint">
                              {formatCurrency(Number(conta.saldo_abertura))}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label>Data do saldo</label>
                          <input
                            type="date"
                            value={conta.saldo_abertura_em}
                            disabled={!canEdit}
                            onChange={(e) =>
                              updateConta(conta.key, { saldo_abertura_em: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Ativa</label>
                          <select
                            value={conta.ativa ? '1' : '0'}
                            disabled={!canEdit}
                            onChange={(e) =>
                              updateConta(conta.key, { ativa: e.target.value === '1' })
                            }
                          >
                            <option value="1">Sim</option>
                            <option value="0">Não</option>
                          </select>
                        </div>
                        <div className="form-group span-2">
                          <label>Observação</label>
                          <input
                            value={conta.observacao}
                            disabled={!canEdit}
                            onChange={(e) =>
                              updateConta(conta.key, { observacao: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'Histórico' && (
              <div className="form-section">
                <div className="panel-title">
                  <h3>Vigências fiscais do emitente</h3>
                  <span className="form-hint">IE, IM, IEST, regime e CRT</span>
                </div>
                {historico.length === 0 ? (
                  <div className="empty-panel">Nenhuma vigência registrada ainda.</div>
                ) : (
                  <HistoricoFiscalTable rows={historico} />
                )}
              </div>
            )}

            {tab === 'Operação' && (
              <div className="form-section">
                <p className="form-hint" style={{ marginBottom: '1rem' }}>
                  Origem da planta = ponto de partida para estimar km até o cliente. Sem este ponto
                  a distância no cadastro do parceiro fica em branco. Não substitui o endereço
                  fiscal da empresa.
                </p>
                {!(form.origem_latitude && form.origem_longitude) ? (
                  <p className="form-hint" style={{ marginBottom: '1rem' }}>
                    Ainda sem origem. Localize pelo endereço da ficha e salve.
                  </p>
                ) : null}
                <div className="form-grid">
                  <div className="form-group">
                    <label>Latitude</label>
                    <input
                      value={form.origem_latitude}
                      disabled={!canEdit}
                      placeholder="-18.9219317"
                      inputMode="decimal"
                      onChange={(e) => update({ origem_latitude: e.target.value.trim() })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Longitude</label>
                    <input
                      value={form.origem_longitude}
                      disabled={!canEdit}
                      placeholder="-48.2943462"
                      inputMode="decimal"
                      onChange={(e) => update({ origem_longitude: e.target.value.trim() })}
                    />
                  </div>
                  <div className="form-group span-2">
                    <label>Origem da planta</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        readOnly
                        value={formatLatLng(form.origem_latitude, form.origem_longitude) || '—'}
                        aria-label="Origem da planta"
                        style={{ flex: 1 }}
                      />
                      {canEdit ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={consulting !== null || saving}
                          onClick={() => void localizarOrigemPeloEndereco()}
                        >
                          {consulting === 'geo' ? 'Localizando…' : 'Localizar pelo endereço'}
                        </button>
                      ) : null}
                    </div>
                    <p className="form-hint" style={{ margin: '0.35rem 0 0' }}>
                      Prefira rua e número. Se usar só o CEP, o ponto pode cair no centro da cidade
                      e a distância ficar imprecisa.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tab === 'Certificado A1' && (
              <div className="form-section">
                <p className="form-hint" style={{ marginBottom: '1rem' }}>
                  Certificado digital A1 (.pfx/.p12). Arquivo e senha ficam protegidos no servidor —
                  o sistema não devolve o conteúdo depois do envio. O envio da proposta desta
                  empresa só libera com certificado válido (mesmo CNPJ do cadastro e dentro da
                  validade). A validade é lida do arquivo e acompanhada automaticamente.
                </p>

                {certPendencias.length > 0 ? (
                  <div className="alert alert-warning fiscal-pendencias" style={{ marginBottom: '1rem' }}>
                    <strong>
                      {cert?.status === 'A_VENCER'
                        ? 'Atenção — certificado a vencer:'
                        : 'Pendências do certificado A1:'}
                    </strong>
                    <ul>
                      {certPendencias.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    {cert?.status === 'A_VENCER' ? (
                      <span className="form-hint" style={{ display: 'block', marginTop: '0.5rem' }}>
                        Substitua o arquivo antes do vencimento para não bloquear o envio da proposta.
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {certLoading ? (
                  <p className="form-hint">Carregando status do cofre…</p>
                ) : cert?.cadastrado ? (
                  <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label>Status</label>
                      <div style={{ paddingTop: '0.35rem' }}>
                        <StatusPill status={certStatusLabel(cert.status)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Arquivo</label>
                      <input readOnly value={cert.arquivo_nome || '—'} />
                    </div>
                    <div className="form-group span-2">
                      <label>Titular (CN)</label>
                      <input readOnly value={cert.subject_cn || '—'} />
                    </div>
                    <div className="form-group span-2">
                      <label>Emissor</label>
                      <input readOnly value={cert.issuer_cn || '—'} />
                    </div>
                    <div className="form-group">
                      <label>CNPJ no certificado</label>
                      <input
                        readOnly
                        value={
                          cert.cnpj_certificado
                            ? formatCnpj(cert.cnpj_certificado)
                            : 'Não identificado'
                        }
                      />
                      {cert.cnpj_bate_com_empresa === false ? (
                        <span className="form-hint">
                          Difere do CNPJ desta empresa — o envio da proposta permanece bloqueado.
                        </span>
                      ) : null}
                    </div>
                    <div className="form-group">
                      <label>Validade</label>
                      <input
                        readOnly
                        value={
                          cert.valido_ate
                            ? `${formatDate(cert.valido_de ?? undefined)} → ${formatDate(cert.valido_ate)}`
                            : '—'
                        }
                      />
                      {typeof cert.dias_para_vencer === 'number' ? (
                        <span className="form-hint">
                          {cert.dias_para_vencer < 0
                            ? 'Vencido'
                            : `${cert.dias_para_vencer} dia(s) restantes`}
                        </span>
                      ) : null}
                    </div>
                    <div className="form-group span-2">
                      <label>Identificação do certificado</label>
                      <input
                        readOnly
                        value={cert.fingerprint_sha256 || '—'}
                        style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Enviado em</label>
                      <input readOnly value={formatDateTime(cert.uploaded_at) || '—'} />
                    </div>
                    <div className="form-group">
                      <label>Senha no cofre</label>
                      <input readOnly value={cert.tem_senha ? '•••••••• (cifrada)' : '—'} />
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                    Nenhum certificado A1 no cofre desta empresa.
                  </div>
                )}

                {cert?.aviso || cert?.aviso_cofre ? (
                  <p className="form-hint" style={{ marginBottom: '1rem' }}>
                    {cert.aviso ?? cert.aviso_cofre}
                  </p>
                ) : null}

                {canEdit ? (
                  <>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem' }}>
                      {cert?.cadastrado ? 'Substituir certificado' : 'Enviar certificado'}
                    </h3>
                    <div className="form-grid">
                      <div className="form-group span-2">
                        <label htmlFor="empresa-a1-arquivo">Arquivo A1 (.pfx / .p12)</label>
                        <input
                          id="empresa-a1-arquivo"
                          ref={certFileRef}
                          type="file"
                          accept=".pfx,.p12,application/x-pkcs12"
                          disabled={certUploading || certRemoving}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setCertFile(f);
                            setError('');
                          }}
                        />
                        <span className="form-hint">Máximo 2 MB. Só modelo A1 (arquivo).</span>
                      </div>
                      <div className="form-group">
                        <label htmlFor="empresa-a1-senha">Senha do certificado</label>
                        <input
                          id="empresa-a1-senha"
                          type="password"
                          autoComplete="new-password"
                          value={certSenha}
                          disabled={certUploading || certRemoving}
                          onChange={(e) => setCertSenha(e.target.value)}
                          placeholder="Senha do .pfx"
                        />
                      </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={certUploading || certRemoving || !certFile || !certSenha}
                        onClick={() => void uploadCertificadoA1()}
                      >
                        {certUploading
                          ? 'Enviando…'
                          : cert?.cadastrado
                            ? 'Substituir no cofre'
                            : 'Armazenar no cofre'}
                      </button>
                      {cert?.cadastrado ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={certUploading || certRemoving}
                          onClick={() => void removerCertificadoA1()}
                        >
                          {certRemoving ? 'Removendo…' : 'Remover do cofre'}
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="form-hint" style={{ margin: 0 }}>
                    Apenas quem gerencia empresas pode alterar o certificado A1.
                  </p>
                )}
              </div>
            )}

            {tab !== 'Certificado A1' ? (
            <div className="form-actions">
              {canEdit ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || consulting !== null}
                  onClick={handleSave}
                >
                  {saving ? 'Salvando…' : 'Salvar alterações'}
                </button>
              ) : (
                <p className="form-hint" style={{ margin: 0 }}>
                  Apenas administradores podem editar empresas.
                </p>
              )}
              {consulta && (
                <span className="form-hint">
                  Dados da Receita Federal importados nesta consulta
                </span>
              )}
            </div>
            ) : null}
          </div>
        </div>
          ) : (
            <div className="card empresas-detail-card">
              <div className="card-body">
                <div className="empty-state empresas-detail-empty">
                  {empresas.length === 0
                    ? 'Cadastre a primeira empresa para começar.'
                    : 'Selecione uma empresa na lista.'}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const HISTORICO_FISCAL_SORT = {
  inicio: (h: EmpresaFiscalHistorico) => h.vigencia_inicio,
  fim: (h: EmpresaFiscalHistorico) => h.vigencia_fim,
  ie: (h: EmpresaFiscalHistorico) => h.ie,
  ie_status: (h: EmpresaFiscalHistorico) => h.ie_status,
  regime: (h: EmpresaFiscalHistorico) => h.regime,
  crt: (h: EmpresaFiscalHistorico) => (h.crt != null ? Number(h.crt) : null),
  motivo: (h: EmpresaFiscalHistorico) => h.motivo,
};

function HistoricoFiscalTable({ rows }: { rows: EmpresaFiscalHistorico[] }) {
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, HISTORICO_FISCAL_SORT);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh column="inicio" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Início
            </SortableTh>
            <SortableTh column="fim" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Fim
            </SortableTh>
            <SortableTh column="ie" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              IE
            </SortableTh>
            <SortableTh column="ie_status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Status IE
            </SortableTh>
            <SortableTh column="regime" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Regime
            </SortableTh>
            <SortableTh column="crt" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              CRT
            </SortableTh>
            <SortableTh column="motivo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Motivo
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.map((h) => (
            <tr key={h.id}>
              <td>{formatDate(h.vigencia_inicio)}</td>
              <td>{h.vigencia_fim ? formatDate(h.vigencia_fim) : 'atual'}</td>
              <td>
                <code>{h.ie ?? '—'}</code>
              </td>
              <td>{h.ie_status ? ieStatusLabel(h.ie_status) : '—'}</td>
              <td>{h.regime ?? '—'}</td>
              <td>{h.crt ?? '—'}</td>
              <td>{h.motivo ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
