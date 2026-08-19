create or replace function private.invoke_atlas_meta_readiness(p_activate boolean default true)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raw_token text;
  v_token_hash text;
  v_request_id bigint;
begin
  delete from private.reminder_scheduler_tokens
  where expires_at < now() - interval '5 minutes'
     or used_at < now() - interval '5 minutes';

  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');

  insert into private.reminder_scheduler_tokens (token_hash, expires_at)
  values (v_token_hash, now() + interval '2 minutes');

  select net.http_post(
    url := 'https://atlasdemofixed.vercel.app/api/whatsapp/readiness',
    body := jsonb_build_object(
      'activate', p_activate,
      'wabaId', '1553173296558731'
    ),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_raw_token,
      'Content-Type', 'application/json',
      'User-Agent', 'atlas-supabase-readiness/2.1'
    ),
    timeout_milliseconds := 60000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function private.invoke_atlas_meta_readiness(boolean) from public, anon, authenticated;

comment on function private.invoke_atlas_meta_readiness(boolean) is
  'Creates a short-lived one-time token and invokes the protected Atlas Meta readiness endpoint with the production WABA identifier, without exposing provider or scheduler credentials.';
