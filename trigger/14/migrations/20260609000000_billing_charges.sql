-- Cobranças Inter (Trigger TI) vinculadas a licenças B2B.
-- Aplicar no SQL Editor do Supabase após as migrations de licenses.
-- Os apps Android/Flutter não acessam esta tabela.

create table if not exists public.billing_charges (
  id uuid primary key default gen_random_uuid(),
  license_key text not null,
  charge_type text not null check (charge_type in ('INITIAL', 'MONTHLY')),
  seu_numero text not null,
  codigo_solicitacao text,
  valor_nominal numeric(12, 2) not null,
  valor_implantacao numeric(12, 2),
  valor_mensalidade numeric(12, 2),
  data_vencimento date not null,
  status text not null default 'EMITIDA'
    check (status in ('EMITIDA', 'PAGA', 'CANCELADA', 'EXPIRADA')),
  inter_situacao text,
  pix_copia_cola text,
  linha_digitavel text,
  paid_at timestamptz,
  license_updated boolean not null default false,
  inter_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_charges_license_key_idx
  on public.billing_charges (license_key);

create index if not exists billing_charges_codigo_idx
  on public.billing_charges (codigo_solicitacao)
  where codigo_solicitacao is not null;

create unique index if not exists billing_charges_seu_numero_idx
  on public.billing_charges (seu_numero);

alter table public.billing_charges enable row level security;

-- Sem políticas para anon/authenticated: apenas service_role (painel Trigger TI).

create or replace function public.touch_billing_charge_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists billing_charges_updated_at on public.billing_charges;
create trigger billing_charges_updated_at
  before update on public.billing_charges
  for each row execute function public.touch_billing_charge_updated_at();

comment on table public.billing_charges is
  'Cobranças Inter emitidas pelo painel Trigger TI para licenças B2B.';
