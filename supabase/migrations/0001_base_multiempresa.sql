-- ERP de Ordens de Serviço de Campo — base multiempresa (multi-tenant)
-- Cada linha pertence a um tenant (empresa cliente). RLS garante o isolamento.

create extension if not exists pgcrypto;

create type papel_usuario as enum ('master', 'gestor', 'atendente', 'tecnico');
create type status_os as enum ('aberto', 'agendado', 'em_deslocamento', 'em_atendimento', 'concluido', 'cancelado');
create type tipo_movimento as enum ('retirado', 'deixado');

-- ───────── Empresas e marca (white-label) ─────────
create table tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  plano text not null default 'basico',
  modulos jsonb not null default '{"agenda":true,"mapa":true,"estoque":true,"ia":false,"gestao":false}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table tenant_branding (
  tenant_id uuid primary key references tenants on delete cascade,
  nome_empresa text not null,
  subtitulo text,
  tag text default 'ERP',
  cor_primaria text default '#0284c7',
  logo_url text,
  email_contato text,
  telefone_contato text,
  cidade_base text,
  tema text not null default 'gelo' check (tema in ('gelo', 'esmeralda'))
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  tenant_id uuid not null references tenants on delete cascade,
  nome text not null,
  papel papel_usuario not null default 'tecnico',
  telefone text,
  ativo boolean not null default true
);
create index on profiles (tenant_id);

-- Funções auxiliares usadas pelas políticas
create function auth_tenant() returns uuid language sql stable security definer set search_path = public as
$$ select tenant_id from profiles where id = auth.uid() and ativo $$;

create function auth_papel() returns papel_usuario language sql stable security definer set search_path = public as
$$ select papel from profiles where id = auth.uid() and ativo $$;

-- ───────── Dados operacionais ─────────
create table clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default auth_tenant() references tenants on delete cascade,
  razao_social text not null,
  documento text,
  contato text, telefone text, email text, endereco text,
  lat double precision, lng double precision,
  deleted_at timestamptz,
  criado_em timestamptz not null default now()
);
create index on clientes (tenant_id, razao_social);

create table equipamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default auth_tenant() references tenants on delete cascade,
  cliente_id uuid references clientes on delete set null,
  modelo text not null,
  serie text not null,
  deleted_at timestamptz,
  unique (tenant_id, serie)
);

create table catalogo_pecas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default auth_tenant() references tenants on delete cascade,
  nome text not null,
  codigo text,
  ativo boolean not null default true
);

create table tenant_contadores (
  tenant_id uuid primary key references tenants on delete cascade,
  ultima_os integer not null default 0
);

create table ordens_servico (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default auth_tenant() references tenants on delete cascade,
  numero integer not null,
  cliente_id uuid references clientes on delete set null,
  tecnico_id uuid references profiles on delete set null,
  status status_os not null default 'aberto',
  contato_local text, acompanhante jsonb,
  relato_defeito text, parecer_tecnico text,
  agendado_para timestamptz, iniciado_em timestamptz, concluido_em timestamptz,
  assinou_tecnico_em timestamptz, assinou_cliente_em timestamptz,
  deleted_at timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, numero)
);
create index on ordens_servico (tenant_id, status, agendado_para);
create index on ordens_servico (tenant_id, tecnico_id);

create function set_numero_os() returns trigger language plpgsql as $$
begin
  insert into tenant_contadores (tenant_id, ultima_os) values (new.tenant_id, 1)
  on conflict (tenant_id) do update set ultima_os = tenant_contadores.ultima_os + 1
  returning ultima_os into new.numero;
  return new;
end $$;
create trigger trg_numero_os before insert on ordens_servico
  for each row when (new.numero is null) execute function set_numero_os();
alter table ordens_servico alter column numero drop not null;

create function touch_atualizado() returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;
create trigger trg_touch_os before update on ordens_servico
  for each row execute function touch_atualizado();

create table os_pecas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default auth_tenant() references tenants on delete cascade,
  os_id uuid not null references ordens_servico on delete cascade,
  peca_id uuid references catalogo_pecas, descricao text not null,
  quantidade integer not null default 1, motivo text
);
create index on os_pecas (os_id);

create table os_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default auth_tenant() references tenants on delete cascade,
  os_id uuid not null references ordens_servico on delete cascade,
  tipo tipo_movimento not null,
  equipamento_id uuid references equipamentos, modelo text, serie text
);
create index on os_movimentacoes (os_id);

create table os_fotos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default auth_tenant() references tenants on delete cascade,
  os_id uuid not null references ordens_servico on delete cascade,
  storage_path text not null, legenda text,
  criado_em timestamptz not null default now()
);

create table os_assinaturas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default auth_tenant() references tenants on delete cascade,
  os_id uuid not null references ordens_servico on delete cascade,
  quem text not null check (quem in ('tecnico', 'cliente')),
  nome text, imagem_path text not null,
  hash_sha256 text, assinado_em timestamptz not null default now()
);

create table tecnico_localizacao (
  tecnico_id uuid primary key references profiles on delete cascade,
  tenant_id uuid not null default auth_tenant() references tenants on delete cascade,
  lat double precision not null, lng double precision not null,
  bateria integer, atualizado_em timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  usuario_id uuid default auth.uid(),
  acao text not null, tabela text, registro_id uuid, detalhe jsonb,
  criado_em timestamptz not null default now()
);

-- ───────── RLS: isolamento total por empresa ─────────
do $$
declare t text;
begin
  foreach t in array array['clientes','equipamentos','catalogo_pecas','os_pecas','os_movimentacoes',
                           'os_fotos','os_assinaturas','tecnico_localizacao'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (tenant_id = auth_tenant())', t||'_sel', t);
    execute format('create policy %I on %I for insert with check (tenant_id = auth_tenant())', t||'_ins', t);
    execute format('create policy %I on %I for update using (tenant_id = auth_tenant())', t||'_upd', t);
    execute format('create policy %I on %I for delete using (tenant_id = auth_tenant() and auth_papel() in (''master'',''gestor''))', t||'_del', t);
  end loop;
end $$;

alter table tenants enable row level security;
create policy tenants_sel on tenants for select using (id = auth_tenant());

alter table tenant_branding enable row level security;
create policy branding_sel on tenant_branding for select using (tenant_id = auth_tenant());
create policy branding_upd on tenant_branding for update using (tenant_id = auth_tenant() and auth_papel() in ('master','gestor'));

alter table profiles enable row level security;
create policy profiles_sel on profiles for select using (tenant_id = auth_tenant());
create policy profiles_upd on profiles for update using (tenant_id = auth_tenant() and auth_papel() in ('master','gestor'));

alter table tenant_contadores enable row level security;

-- Técnico só enxerga as próprias O.S.; demais papéis veem todas da empresa
alter table ordens_servico enable row level security;
create policy os_sel on ordens_servico for select using (
  tenant_id = auth_tenant() and (auth_papel() <> 'tecnico' or tecnico_id = auth.uid()));
create policy os_ins on ordens_servico for insert with check (
  tenant_id = auth_tenant() and auth_papel() <> 'tecnico');
create policy os_upd on ordens_servico for update using (
  tenant_id = auth_tenant() and (auth_papel() <> 'tecnico' or tecnico_id = auth.uid()));
create policy os_del on ordens_servico for delete using (
  tenant_id = auth_tenant() and auth_papel() = 'master');

alter table audit_log enable row level security;
create policy audit_sel on audit_log for select using (tenant_id = auth_tenant() and auth_papel() in ('master','gestor'));
create policy audit_ins on audit_log for insert with check (tenant_id = auth_tenant());

-- ───────── Gestor Master: limpeza controlada (sempre auditada) ─────────
create function master_apagar(escopo text) returns void language plpgsql security definer set search_path = public as $$
declare tid uuid := auth_tenant();
begin
  if auth_papel() <> 'master' then raise exception 'Apenas o Gestor Master pode executar esta ação'; end if;
  insert into audit_log (tenant_id, acao, detalhe) values (tid, 'master_apagar', jsonb_build_object('escopo', escopo));
  if escopo in ('os', 'tudo') then delete from ordens_servico where tenant_id = tid; end if;
  if escopo in ('clientes', 'tudo') then delete from equipamentos where tenant_id = tid; delete from clientes where tenant_id = tid; end if;
  if escopo not in ('os', 'clientes', 'tudo') then raise exception 'Escopo inválido'; end if;
end $$;

-- ───────── Onboarding de nova empresa (chamado pelo seu painel de vendas) ─────────
create function criar_empresa(p_nome text, p_slug text, p_user_id uuid, p_nome_usuario text)
returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  insert into tenants (nome, slug) values (p_nome, p_slug) returning id into tid;
  insert into tenant_branding (tenant_id, nome_empresa) values (tid, p_nome);
  insert into profiles (id, tenant_id, nome, papel) values (p_user_id, tid, p_nome_usuario, 'master');
  return tid;
end $$;
revoke execute on function criar_empresa from public, anon, authenticated;

-- Tempo real para dashboard e mapa
alter publication supabase_realtime add table ordens_servico, tecnico_localizacao;
