create or replace function public.get_apple_revocation_credential_service(p_user_id uuid)
returns table(refresh_token text, client_id text, refresh_secret_id uuid)
language sql
security definer
set search_path = pg_catalog, public, private, vault
as $$
  select ds.decrypted_secret, a.client_id, a.refresh_secret_id
  from private.apple_identity_tokens a
  join vault.decrypted_secrets ds on ds.id = a.refresh_secret_id
  where a.user_id = p_user_id
  limit 1
$$;

create or replace function public.delete_apple_refresh_secret_service(p_secret_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, vault
as $$
declare
  v_deleted uuid;
begin
  if p_secret_id is null then
    return false;
  end if;

  delete from vault.secrets
  where id = p_secret_id
  returning id into v_deleted;

  return v_deleted is not null;
end;
$$;

revoke all on function public.get_apple_revocation_credential_service(uuid) from public, anon, authenticated;
revoke all on function public.delete_apple_refresh_secret_service(uuid) from public, anon, authenticated;
grant execute on function public.get_apple_revocation_credential_service(uuid) to service_role;
grant execute on function public.delete_apple_refresh_secret_service(uuid) to service_role;
