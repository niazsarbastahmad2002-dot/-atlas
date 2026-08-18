create or replace function public.get_patient_appointment(p_token_hash text)
returns table(
  clinic_name text,
  doctor_name text,
  appointment_at timestamptz,
  appointment_status text,
  reminder_language text,
  token_expires_at timestamptz,
  queue_position integer,
  appointments_ahead integer
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  update private.patient_appointment_tokens t
    set last_used_at = now()
  where t.token_hash = p_token_hash
    and t.revoked_at is null
    and t.expires_at > now();

  return query
  with target as (
    select
      c.name as clinic_name,
      a.id as appointment_id,
      a.clinic_id,
      a.doctor_id,
      a.doctor_name,
      a.appointment_at,
      a.created_at,
      a.status as appointment_status,
      a.reminder_language,
      t.expires_at as token_expires_at
    from private.patient_appointment_tokens t
    join public.appointments a
      on a.id = t.appointment_id
     and a.clinic_id = t.clinic_id
    join public.clinics c on c.id = t.clinic_id
    where t.token_hash = p_token_hash
      and t.revoked_at is null
      and t.expires_at > now()
      and a.status <> 'voided'
  ), positioned as (
    select
      target.*,
      case
        when target.appointment_status in ('pending', 'confirmed') then (
          select count(*)::integer
          from public.appointments q
          where q.clinic_id = target.clinic_id
            and q.voided_at is null
            and q.status in ('pending', 'confirmed')
            and (
              (target.doctor_id is not null and q.doctor_id = target.doctor_id)
              or (target.doctor_id is null and q.doctor_id is null and q.doctor_name = target.doctor_name)
            )
            and (q.appointment_at at time zone 'Asia/Baghdad')::date
              = (target.appointment_at at time zone 'Asia/Baghdad')::date
            and (
              q.appointment_at < target.appointment_at
              or (q.appointment_at = target.appointment_at and q.created_at < target.created_at)
              or (q.appointment_at = target.appointment_at and q.created_at = target.created_at and q.id < target.appointment_id)
            )
        )
        else null
      end as appointments_ahead
    from target
  )
  select
    positioned.clinic_name,
    positioned.doctor_name,
    positioned.appointment_at,
    positioned.appointment_status,
    positioned.reminder_language,
    positioned.token_expires_at,
    case when positioned.appointments_ahead is null then null else positioned.appointments_ahead + 1 end as queue_position,
    positioned.appointments_ahead
  from positioned;
end;
$function$;
