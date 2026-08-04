-- Cria o espaço pessoal inicial de um usuário autenticado.
create or replace function public.create_personal_organization(org_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_org_id uuid;
  safe_slug text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select default_organization_id into new_org_id
  from public.profiles where id = auth.uid();

  if new_org_id is not null then
    return new_org_id;
  end if;

  safe_slug := lower(regexp_replace(coalesce(nullif(trim(org_name), ''), 'espaco-pessoal'), '[^a-zA-Z0-9]+', '-', 'g'));
  safe_slug := trim(both '-' from safe_slug) || '-' || substr(replace(auth.uid()::text, '-', ''), 1, 8);

  insert into public.organizations (
    name, slug, owner_user_id, status, trial_ends_at, seat_limit, case_limit
  ) values (
    coalesce(nullif(trim(org_name), ''), 'Espaço pessoal'),
    safe_slug,
    auth.uid(),
    'trial',
    now() + interval '14 days',
    1,
    50
  ) returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  insert into public.subscriptions (organization_id, plan_id, status, current_period_start, current_period_end)
  values (new_org_id, 'individual', 'trial', now(), now() + interval '14 days');

  update public.profiles
  set default_organization_id = new_org_id
  where id = auth.uid();

  return new_org_id;
end;
$$;

grant execute on function public.create_personal_organization(text) to authenticated;
