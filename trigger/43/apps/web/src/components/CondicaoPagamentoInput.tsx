import { useId, type InputHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { useCondicoesPagamentoSugestoes } from '../lib/useCondicoesPagamentoSugestoes';
import { useAuth } from '../lib/auth';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'list'> & {
  value: string;
  onChange: (value: string) => void;
  /** Exibe link para cadastro de sugestões (PAR). */
  showCadastroLink?: boolean;
  /** Oculta o hint abaixo do campo (default true). */
  showHint?: boolean;
};

/**
 * Texto livre com sugestões da EMP (datalist) — um único campo.
 * ADR: snapshot no documento; aqui só preenchimento assistido.
 */
export function CondicaoPagamentoInput({
  value,
  onChange,
  disabled,
  placeholder,
  maxLength = 64,
  showCadastroLink = false,
  showHint = true,
  ...rest
}: Props) {
  const listId = useId();
  const { empresaId, initialized, hasAnyPermission } = useAuth();
  const sugestoes = useCondicoesPagamentoSugestoes(empresaId, initialized);

  return (
    <div className="condicao-pagamento-field">
      <input
        {...rest}
        list={listId}
        value={value}
        disabled={disabled}
        placeholder={placeholder ?? 'Digite ou escolha na lista (ex.: 28 DDL)'}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={listId}>
        {sugestoes.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {showHint ? (
        showCadastroLink && hasAnyPermission('condicao_pagamento.ler', 'parceiro.ler', 'orcamento.ler') ? (
          <span className="form-hint">
            {sugestoes.length} condição(ões) cadastradas · texto livre permitido ·{' '}
            <Link to="/condicoes-pagamento">gerenciar lista</Link>
          </span>
        ) : (
          <span className="form-hint">
            Digite uma condição ou selecione na lista ao focar o campo · máx. {maxLength} caracteres.
          </span>
        )
      ) : null}
    </div>
  );
}
