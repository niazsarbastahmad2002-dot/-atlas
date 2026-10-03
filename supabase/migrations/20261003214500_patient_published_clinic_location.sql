-- Atlas Vision: expose only explicitly published clinic location to a valid private patient link.
-- Service-role only; no patient or appointment details are returned.

create or replace function public.patient_get_clinic_location(
  p_token_hash text
)
returns table(
  clinic_slug text,
  address_text text,
  area text,
  city text,
  latitude double precision,
  longitude double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.slug,
    profile.address_text,
    profile.area,
    profile.city,
    profile.latitude,
    profile.longitude
  from private.patient_appointment_tokens token
  join public.appointments appointment
    on appointment.id = token.appointment_id
   and appointment.clinic_id = token.clinic_id
  join public.clinic_directory_profiles profile
    on profile.clinic_id = appointment.clinic_id
   and profile.is_published
  where token.token_hash = p_token_hash
    and token.revoked_at is null
    and token.expires_at > now()
    and appointment.voided_at is null
    and char_length(p_token_hash) = 64
    and p_token_hash ~ '^[a-f0-9]{64}$'
  limit 1;
$$;

revoke all on function public.patient_get_clinic_location(text)
  from public, anon, authenticated;
grant execute on function public.patient_get_clinic_location(text)
  to service_role;
