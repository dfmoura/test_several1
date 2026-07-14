import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type EmitirPayload } from '../api';

const DEFAULT = {
  tomadorTipo: 'PJ' as 'PF' | 'PJ',
  tomadorDoc: '',
  tomadorNome: '',
  codigoServico: '170202',
  codigoNbs: '118064000',
  descricao: 'Serviços de apoio administrativo',
  codigoMunicipio: '',
  valorServico: '',
};

export default function Emitir() {
  const [form, setForm] = useState(DEFAULT);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.status().then((s) => {
      if (!form.codigoMunicipio) {
        setForm((f) => ({ ...f, codigoMunicipio: s.emitente.codigoMunicipio }));
      }
    }).catch(() => {});
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const valor = parseFloat(form.valorServico.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      setError('Informe um valor válido');
      setLoading(false);
      return;
    }

    const payload: EmitirPayload = {
      tomador: {
        tipo: form.tomadorTipo,
        cpfCnpj: form.tomadorDoc.replace(/\D/g, ''),
        ...(form.tomadorTipo === 'PJ'
          ? { razaoSocial: form.tomadorNome }
          : { nome: form.tomadorNome }),
      },
      servico: {
        codigoServico: form.codigoServico,
        codigoNbs: form.codigoNbs,
        descricao: form.descricao,
        codigoMunicipioIncidencia: form.codigoMunicipio,
      },
      valores: { valorServico: valor },
      opSimpNac: '3',
      regApTribSN: '1',
    };

    try {
      const result = await api.emitir(payload);
      navigate('/emitidas', { state: { novaNota: result.chaveAcesso } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na emissão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>Emitir NFS-e</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <h2>Tomador (cliente)</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo</label>
            <select value={form.tomadorTipo} onChange={(e) => update('tomadorTipo', e.target.value)}>
              <option value="PJ">Pessoa Jurídica (CNPJ)</option>
              <option value="PF">Pessoa Física (CPF)</option>
            </select>
          </div>
          <div className="form-group">
            <label>{form.tomadorTipo === 'PJ' ? 'CNPJ' : 'CPF'}</label>
            <input
              value={form.tomadorDoc}
              onChange={(e) => update('tomadorDoc', e.target.value)}
              placeholder={form.tomadorTipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>{form.tomadorTipo === 'PJ' ? 'Razão Social' : 'Nome completo'}</label>
          <input
            value={form.tomadorNome}
            onChange={(e) => update('tomadorNome', e.target.value)}
            required
          />
        </div>

        <h2 style={{ marginTop: '1.5rem' }}>Serviço</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Código do serviço (LC 116)</label>
            <input
              value={form.codigoServico}
              onChange={(e) => update('codigoServico', e.target.value)}
              placeholder="Ex: 170202"
              required
            />
          </div>
          <div className="form-group">
            <label>Código NBS</label>
            <input
              value={form.codigoNbs}
              onChange={(e) => update('codigoNbs', e.target.value)}
              placeholder="Ex: 118064000"
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Descrição do serviço</label>
          <textarea
            value={form.descricao}
            onChange={(e) => update('descricao', e.target.value)}
            rows={2}
            required
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Município de incidência (IBGE)</label>
            <input
              value={form.codigoMunicipio}
              onChange={(e) => update('codigoMunicipio', e.target.value)}
              placeholder="7 dígitos — ex: 3170206"
              maxLength={7}
              required
            />
          </div>
          <div className="form-group">
            <label>Valor do serviço (R$)</label>
            <input
              value={form.valorServico}
              onChange={(e) => update('valorServico', e.target.value)}
              placeholder="1500.00"
              required
            />
          </div>
        </div>

        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Emitindo...' : 'Emitir nota fiscal'}
          </button>
        </div>
      </form>
    </>
  );
}
