create extension if not exists pg_session_jwt;

create table if not exists public.ingresos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  monto numeric not null,
  descripcion text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gastos_presupuesto (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  monto numeric not null,
  descripcion text not null,
  categoria text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.deudas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  nombre_persona text not null,
  total_deuda numeric not null,
  tasa_interes numeric not null,
  cuotas_pagadas integer not null default 0,
  total_cuotas integer,
  cuota_mensual numeric,
  monto_actual_pendiente numeric not null,
  descripcion text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tarjetas_credito (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  linea_total numeric not null,
  monto_deuda_actual numeric not null,
  pago_minimo numeric,
  saldo_total numeric,
  linea_total_usd numeric,
  monto_deuda_actual_usd numeric,
  pago_minimo_usd numeric,
  saldo_total_usd numeric,
  descripcion text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tarjeta_pagos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  tarjeta_id uuid not null references public.tarjetas_credito(id) on delete cascade,
  monto numeric not null,
  fecha date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  token text not null unique,
  platform text not null default 'web',
  created_at timestamptz not null default now()
);

create index if not exists ingresos_user_created_idx on public.ingresos (user_id, created_at desc);
create index if not exists gastos_user_created_idx on public.gastos_presupuesto (user_id, created_at desc);
create index if not exists deudas_user_created_idx on public.deudas (user_id, created_at desc);
create index if not exists tarjetas_user_created_idx on public.tarjetas_credito (user_id, created_at desc);
create index if not exists pagos_user_tarjeta_idx on public.tarjeta_pagos (user_id, tarjeta_id, created_at desc);
create index if not exists fcm_user_idx on public.fcm_tokens (user_id);

alter table public.ingresos enable row level security;
alter table public.gastos_presupuesto enable row level security;
alter table public.deudas enable row level security;
alter table public.tarjetas_credito enable row level security;
alter table public.tarjeta_pagos enable row level security;
alter table public.fcm_tokens enable row level security;

grant select, insert, update, delete on public.ingresos to authenticated;
grant select, insert, update, delete on public.gastos_presupuesto to authenticated;
grant select, insert, update, delete on public.deudas to authenticated;
grant select, insert, update, delete on public.tarjetas_credito to authenticated;
grant select, insert, update, delete on public.tarjeta_pagos to authenticated;
grant select, insert, update, delete on public.fcm_tokens to authenticated;

create policy "own_ingresos" on public.ingresos for all to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);

create policy "own_gastos" on public.gastos_presupuesto for all to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);

create policy "own_deudas" on public.deudas for all to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);

create policy "own_tarjetas" on public.tarjetas_credito for all to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);

create policy "own_pagos" on public.tarjeta_pagos for all to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);

create policy "own_fcm_tokens" on public.fcm_tokens for all to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);
