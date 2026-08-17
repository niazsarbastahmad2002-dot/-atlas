create or replace function private.invoke_atlas_reminder_worker()
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

  select net.http_get(
    url := 'https://atlasdemofixed.vercel.app/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_raw_token,
      'User-Agent', 'atlas-supabase-cron/1.0'
    ),
    timeout_milliseconds := 60000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function private.invoke_atlas_reminder_worker() from public, anon, authenticated;

comment on function private.invoke_atlas_reminder_worker() is
  'Creates a short-lived one-time scheduler token and asynchronously invokes the Atlas reminder worker. Schedule only after WhatsApp production activation is complete.';
