-- Dados do pagador por licença (preenchidos via consulta CNPJ).
-- Aplicar no SQL Editor do Supabase após as migrations de licenses.

alter table public.licenses
  add column if not exists pagador_nome text,
  add column if not exists pagador_endereco text,
  add column if not exists pagador_cidade text,
  add column if not exists pagador_uf text,
  add column if not exists pagador_cep text;

comment on column public.licenses.pagador_nome is 'Razão social / nome do pagador (Inter).';
comment on column public.licenses.pagador_endereco is 'Endereço do pagador para cobrança Inter.';
comment on column public.licenses.pagador_cidade is 'Cidade do pagador.';
comment on column public.licenses.pagador_uf is 'UF do pagador (2 letras).';
comment on column public.licenses.pagador_cep is 'CEP do pagador (somente dígitos).';
