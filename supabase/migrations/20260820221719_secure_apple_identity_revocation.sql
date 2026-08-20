create table if not exists private.apple_identity_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_secret_id uuid not null,
  client_id text not null check (length(client_id) between 3 and 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.apple_identity_tokens enable row level security;
revoke all on private.apple_identity_tokens from anon, authenticated;

create or replace function public.store_apple_refresh_token_service(
  p_user_id uuid,
  p_refresh_token text,
  p_client_id text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, vault
as $$
declare
  v_secret_id uuid;
begin
  if p_user_id is null
     or p_refresh_token is null
     or length(p_refresh_token) < 16
     or length(p_refresh_token) > 8192
     or p_client_id is null
     or length(p_client_id) < 3
     or length(p_client_id) > 255 then
    return false;
  end if;

  select refresh_secret_id into v_secret_id
  from private.apple_identity_tokens
  where user_id = p_user_id
  for update;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_refresh_token,
      'atlas_apple_refresh_' || p_user_id::text,
      'Atlas Sign in with Apple refresh token used only for account-deletion revocation'
    );

    insert into private.apple_identity_tokens (user_id, refresh_secret_id, client_id)
    values (p_user_id, v_secret_id, p_client_id)
    on conflict (user_id) do update
      set refresh_secret_id = excluded.refresh_secret_id,
          client_id = excluded.client_id,
          updated_at = now();
  else
    perform vault.update_secret(
      v_secret_id,
      p_refresh_token,
      'atlas_apple_refresh_' || p_user_id::text,
      'Atlas Sign in with Apple refresh token used only for account-deletion revocation'
    );

    update private.apple_identity_tokens
    set client_id = p_client_id, updated_at = now()
    where user_id = p_user_id;
  end if;

  return true;
end;
$$;

create or replace function public.get_apple_refresh_token_service(p_user_id uuid)
returns table (refresh_token text, client_id text)
language sql
security definer
set search_path = pg_catalog, public, private, vault
as $$
  select ds.decrypted_secret, a.client_id
  from private.apple_identity_tokens a
  join vault.decrypted_secrets ds on ds.id = a.refresh_secret_id
  where a.user_id = p_user_id
  limit 1
$$;

create or replace function public.delete_apple_refresh_token_service(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, vault
as $$
declare
  v_secret_id uuid;
begin
  delete from private.apple_identity_tokens
  where user_id = p_user_id
  returning refresh_secret_id into v_secret_id;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;

  return v_secret_id is not null;
end;
$$;

revoke all on function public.store_apple_refresh_token_service(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_apple_refresh_token_service(uuid) from public, anon, authenticated;
revoke all on function public.delete_apple_refresh_token_service(uuid) from public, anon, authenticated;
grant execute on function public.store_apple_refresh_token_service(uuid, text, text) to service_role;
grant execute on function public.get_apple_refresh_token_service(uuid) to service_role;
grant execute on function public.delete_apple_refresh_token_service(uuid) to service_role;
