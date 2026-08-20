create table if not exists private.whatsapp_connections (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  provider text not null default 'meta' check (provider in ('meta', 'infobip', '360dialog')),
  connection_mode text not null default 'coexistence' check (connection_mode = 'coexistence'),
  waba_id text not null check (waba_id ~ '^[0-9]{5,32}$'),
  phone_number_id text not null check (phone_number_id ~ '^[0-9]{5,32}$'),
  business_id text check (business_id is null or business_id ~ '^[0-9]{5,32}$'),
  display_phone_number text check (display_phone_number is null or char_length(display_phone_number) between 8 and 32),
  verified_name text check (verified_name is null or char_length(verified_name) between 1 and 120),
  token_secret_id uuid references vault.secrets(id) on delete set null,
  status text not null default 'connected' check (status in ('pending', 'connected', 'disabled', 'error')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.whatsapp_connections is
  'Server-only WhatsApp provider connection metadata. Access tokens are stored encrypted in Supabase Vault.';

alter table private.whatsapp_connections enable row level security;
revoke all on private.whatsapp_connections from public, anon, authenticated;

create unique index if not exists whatsapp_connections_waba_id_key
  on private.whatsapp_connections (waba_id)
  where status <> 'disabled';
create unique index if not exists whatsapp_connections_phone_number_id_key
  on private.whatsapp_connections (phone_number_id)
  where status <> 'disabled';

create or replace function public.store_meta_whatsapp_connection(
  p_clinic_id uuid,
  p_waba_id text,
  p_phone_number_id text,
  p_business_id text,
  p_display_phone_number text,
  p_verified_name text,
  p_access_token text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_secret_name text;
begin
  if p_clinic_id is null
     or p_waba_id !~ '^[0-9]{5,32}$'
     or p_phone_number_id !~ '^[0-9]{5,32}$'
     or (p_business_id is not null and p_business_id !~ '^[0-9]{5,32}$')
     or p_access_token is null
     or char_length(p_access_token) < 32
     or char_length(p_access_token) > 4096
     or (p_display_phone_number is not null and char_length(p_display_phone_number) not between 8 and 32)
     or (p_verified_name is not null and char_length(p_verified_name) not between 1 and 120)
  then
    return false;
  end if;

  if not exists (select 1 from public.clinics c where c.id = p_clinic_id) then
    return false;
  end if;

  select c.token_secret_id
    into v_secret_id
  from private.whatsapp_connections c
  where c.clinic_id = p_clinic_id;

  v_secret_name := 'atlas_whatsapp_' || replace(p_clinic_id::text, '-', '_');

  if v_secret_id is null then
    select vault.create_secret(
      p_access_token,
      v_secret_name,
      'Atlas Meta Embedded Signup business token',
      null
    ) into v_secret_id;
  else
    perform vault.update_secret(
      v_secret_id,
      p_access_token,
      v_secret_name,
      'Atlas Meta Embedded Signup business token',
      null
    );
  end if;

  insert into private.whatsapp_connections (
    clinic_id,
    provider,
    connection_mode,
    waba_id,
    phone_number_id,
    business_id,
    display_phone_number,
    verified_name,
    token_secret_id,
    status,
    connected_at,
    updated_at
  ) values (
    p_clinic_id,
    'meta',
    'coexistence',
    p_waba_id,
    p_phone_number_id,
    p_business_id,
    p_display_phone_number,
    p_verified_name,
    v_secret_id,
    'connected',
    now(),
    now()
  )
  on conflict (clinic_id) do update set
    provider = excluded.provider,
    connection_mode = excluded.connection_mode,
    waba_id = excluded.waba_id,
    phone_number_id = excluded.phone_number_id,
    business_id = excluded.business_id,
    display_phone_number = excluded.display_phone_number,
    verified_name = excluded.verified_name,
    token_secret_id = excluded.token_secret_id,
    status = 'connected',
    connected_at = now(),
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.store_meta_whatsapp_connection(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.store_meta_whatsapp_connection(uuid, text, text, text, text, text, text) to service_role;

create or replace function public.get_meta_whatsapp_connection_status(p_clinic_id uuid)
returns table(
  provider text,
  connection_mode text,
  waba_id text,
  phone_number_id text,
  business_id text,
  display_phone_number text,
  verified_name text,
  status text,
  connected_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    c.provider,
    c.connection_mode,
    c.waba_id,
    c.phone_number_id,
    c.business_id,
    c.display_phone_number,
    c.verified_name,
    c.status,
    c.connected_at
  from private.whatsapp_connections c
  where c.clinic_id = p_clinic_id;
$$;

revoke all on function public.get_meta_whatsapp_connection_status(uuid) from public, anon, authenticated;
grant execute on function public.get_meta_whatsapp_connection_status(uuid) to service_role;

create or replace function public.get_meta_whatsapp_delivery_config(p_clinic_id uuid)
returns table(
  access_token text,
  waba_id text,
  phone_number_id text,
  display_phone_number text,
  verified_name text,
  status text
)
language sql
security definer
set search_path = ''
as $$
  select
    s.decrypted_secret,
    c.waba_id,
    c.phone_number_id,
    c.display_phone_number,
    c.verified_name,
    c.status
  from private.whatsapp_connections c
  join vault.decrypted_secrets s on s.id = c.token_secret_id
  where c.clinic_id = p_clinic_id
    and c.provider = 'meta'
    and c.status = 'connected';
$$;

revoke all on function public.get_meta_whatsapp_delivery_config(uuid) from public, anon, authenticated;
grant execute on function public.get_meta_whatsapp_delivery_config(uuid) to service_role;
