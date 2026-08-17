create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists private.reminder_scheduler_tokens (
  token_hash text primary key,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reminder_scheduler_tokens_hash_format check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint reminder_scheduler_tokens_expiry_after_creation check (expires_at > created_at)
);

alter table private.reminder_scheduler_tokens enable row level security;
revoke all on table private.reminder_scheduler_tokens from public, anon, authenticated;

create or replace function public.consume_reminder_scheduler_token(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consumed boolean;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  delete from private.reminder_scheduler_tokens
  where expires_at < now() - interval '5 minutes'
     or used_at < now() - interval '5 minutes';

  update private.reminder_scheduler_tokens
  set used_at = now()
  where token_hash = p_token_hash
    and used_at is null
    and expires_at > now()
  returning true into v_consumed;

  return coalesce(v_consumed, false);
end;
$$;

revoke all on function public.consume_reminder_scheduler_token(text) from public, anon, authenticated;
grant execute on function public.consume_reminder_scheduler_token(text) to service_role;
