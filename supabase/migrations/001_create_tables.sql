-- ═══════════════════════════════════════════════════════════════════════════════
-- Monei: Financial data tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ingresos
create table ingresos (
  id uuid primary key default gen_random_uuid(),
  monto numeric not null,
  descripcion text not null default '',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Presupuesto (gastos)
create table gastos_presupuesto (
  id uuid primary key default gen_random_uuid(),
  monto numeric not null,
  descripcion text not null default '',
  categoria text not null default 'General',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Deudas
create table deudas (
  id uuid primary key default gen_random_uuid(),
  nombre_persona text not null,
  total_deuda numeric not null,
  tasa_interes numeric not null default 0,
  cuotas_pagadas integer not null default 0,
  total_cuotas integer,
  cuota_mensual numeric,
  monto_actual_pendiente numeric not null,
  descripcion text not null default '',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Tarjetas de crédito
create table tarjetas_credito (
  id uuid primary key default gen_random_uuid(),
  linea_total numeric not null,
  monto_deuda_actual numeric not null,
  pago_minimo numeric,
  saldo_total numeric,
  descripcion text not null default '',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Pagos de tarjetas
create table tarjeta_pagos (
  id uuid primary key default gen_random_uuid(),
  tarjeta_id uuid not null references tarjetas_credito(id) on delete cascade,
  monto numeric not null,
  fecha text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════════════════
create index idx_ingresos_user on ingresos(user_id);
create index idx_gastos_user on gastos_presupuesto(user_id);
create index idx_deudas_user on deudas(user_id);
create index idx_tarjetas_user on tarjetas_credito(user_id);
create index idx_pagos_user on tarjeta_pagos(user_id);
create index idx_pagos_tarjeta on tarjeta_pagos(tarjeta_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════════════════
alter table ingresos enable row level security;
alter table gastos_presupuesto enable row level security;
alter table deudas enable row level security;
alter table tarjetas_credito enable row level security;
alter table tarjeta_pagos enable row level security;

-- Ingresos
create policy "Users can view own ingresos" on ingresos for select using (auth.uid() = user_id);
create policy "Users can insert own ingresos" on ingresos for insert with check (auth.uid() = user_id);
create policy "Users can update own ingresos" on ingresos for update using (auth.uid() = user_id);
create policy "Users can delete own ingresos" on ingresos for delete using (auth.uid() = user_id);

-- Gastos presupuesto
create policy "Users can view own gastos" on gastos_presupuesto for select using (auth.uid() = user_id);
create policy "Users can insert own gastos" on gastos_presupuesto for insert with check (auth.uid() = user_id);
create policy "Users can update own gastos" on gastos_presupuesto for update using (auth.uid() = user_id);
create policy "Users can delete own gastos" on gastos_presupuesto for delete using (auth.uid() = user_id);

-- Deudas
create policy "Users can view own deudas" on deudas for select using (auth.uid() = user_id);
create policy "Users can insert own deudas" on deudas for insert with check (auth.uid() = user_id);
create policy "Users can update own deudas" on deudas for update using (auth.uid() = user_id);
create policy "Users can delete own deudas" on deudas for delete using (auth.uid() = user_id);

-- Tarjetas de crédito
create policy "Users can view own tarjetas" on tarjetas_credito for select using (auth.uid() = user_id);
create policy "Users can insert own tarjetas" on tarjetas_credito for insert with check (auth.uid() = user_id);
create policy "Users can update own tarjetas" on tarjetas_credito for update using (auth.uid() = user_id);
create policy "Users can delete own tarjetas" on tarjetas_credito for delete using (auth.uid() = user_id);

-- Pagos de tarjetas
create policy "Users can view own pagos" on tarjeta_pagos for select using (auth.uid() = user_id);
create policy "Users can insert own pagos" on tarjeta_pagos for insert with check (auth.uid() = user_id);
create policy "Users can delete own pagos" on tarjeta_pagos for delete using (auth.uid() = user_id);
