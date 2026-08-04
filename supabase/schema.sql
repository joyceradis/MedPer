-- MedPer · esquema inicial multiusuário
-- Execute no SQL Editor de um projeto Supabase novo.

create extension if not exists pgcrypto;

create type public.organization_role as enum ('owner','admin','member','viewer');
create type public.organization_status as enum ('trial','active','past_due','suspended','cancelled');
create type public.case_visibility as enum ('private','organization');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  crm text,
  state_registration text,
  avatar_url text,
  default_organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  status public.organization_status not null default 'trial',
  trial_ends_at timestamptz,
  seat_limit integer not null default 1 check (seat_limit > 0),
  case_limit integer check (case_limit is null or case_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_default_organization_fk
  foreign key (default_organization_id) references public.organizations(id) on delete set null;

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.plans (
  id text primary key,
  name text not null,
  seat_limit integer not null default 1,
  case_limit integer,
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id text not null references public.plans(id),
  provider text not null default 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  status public.organization_status not null default 'trial',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete cascade,
  visibility public.case_visibility not null default 'private',
  title text not null,
  reference text,
  sphere text,
  branch text,
  role text,
  matter text,
  mode text,
  status text not null default 'Em preparação',
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.case_collaborators (
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organization_members_user_idx on public.organization_members(user_id);
create index cases_owner_idx on public.cases(owner_user_id);
create index cases_org_idx on public.cases(organization_id);
create index cases_updated_idx on public.cases(updated_at desc);
create index audit_case_idx on public.audit_events(case_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger organizations_touch before update on public.organizations
for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
for each row execute function public.touch_updated_at();
create trigger cases_touch before update on public.cases
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_org_member(org_id uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id and m.user_id = uid
  );
$$;

create or replace function public.is_org_admin(org_id uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = uid
      and m.role in ('owner','admin')
  );
$$;

create or replace function public.organization_can_use(org_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.organizations o
    where o.id = org_id
      and (
        o.status = 'active'
        or (o.status = 'trial' and (o.trial_ends_at is null or o.trial_ends_at > now()))
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.cases enable row level security;
alter table public.case_collaborators enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select_self on public.profiles
for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_select_member on public.organizations
for select to authenticated using (public.is_org_member(id));
create policy organizations_insert_owner on public.organizations
for insert to authenticated with check (owner_user_id = auth.uid());
create policy organizations_update_admin on public.organizations
for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy members_select_member on public.organization_members
for select to authenticated using (public.is_org_member(organization_id));
create policy members_insert_admin on public.organization_members
for insert to authenticated with check (public.is_org_admin(organization_id));
create policy members_update_admin on public.organization_members
for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy members_delete_admin on public.organization_members
for delete to authenticated using (public.is_org_admin(organization_id));

create policy plans_select_authenticated on public.plans
for select to authenticated using (active = true);

create policy subscriptions_select_admin on public.subscriptions
for select to authenticated using (public.is_org_admin(organization_id));

create policy cases_select_allowed on public.cases
for select to authenticated using (
  owner_user_id = auth.uid()
  or exists (select 1 from public.case_collaborators cc where cc.case_id = id and cc.user_id = auth.uid())
  or (visibility = 'organization' and organization_id is not null and public.is_org_member(organization_id))
);

create policy cases_insert_owner on public.cases
for insert to authenticated with check (
  owner_user_id = auth.uid()
  and (organization_id is null or (public.is_org_member(organization_id) and public.organization_can_use(organization_id)))
);

create policy cases_update_allowed on public.cases
for update to authenticated using (
  owner_user_id = auth.uid()
  or exists (select 1 from public.case_collaborators cc where cc.case_id = id and cc.user_id = auth.uid() and cc.can_edit)
) with check (
  owner_user_id = auth.uid()
  or exists (select 1 from public.case_collaborators cc where cc.case_id = id and cc.user_id = auth.uid() and cc.can_edit)
);

create policy cases_delete_owner on public.cases
for delete to authenticated using (owner_user_id = auth.uid());

create policy collaborators_select_case_access on public.case_collaborators
for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.cases c where c.id = case_id and c.owner_user_id = auth.uid())
);
create policy collaborators_manage_owner on public.case_collaborators
for all to authenticated
using (exists (select 1 from public.cases c where c.id = case_id and c.owner_user_id = auth.uid()))
with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_user_id = auth.uid()));

create policy audit_select_admin on public.audit_events
for select to authenticated using (
  actor_user_id = auth.uid()
  or (organization_id is not null and public.is_org_admin(organization_id))
);

insert into public.plans (id,name,seat_limit,case_limit,features) values
('individual','Individual',1,50,'{"guided_methodology":true,"export":true}'::jsonb),
('team','Equipe',5,250,'{"guided_methodology":true,"export":true,"sharing":true,"audit_log":true}'::jsonb)
on conflict (id) do nothing;
