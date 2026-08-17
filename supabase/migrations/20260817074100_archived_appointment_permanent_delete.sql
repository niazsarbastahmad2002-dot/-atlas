create or replace function private.can_admin_clinic(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1
      from public.clinics c
      where c.id = target_clinic
        and c.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = target_clinic
        and cm.user_id = (select auth.uid())
        and cm.role in ('owner', 'manager')
    )
  );
$$;

revoke all on function private.can_admin_clinic(uuid) from public;
grant execute on function private.can_admin_clinic(uuid) to authenticated;

drop policy if exists appointments_delete_archived_admin on public.appointments;
create policy appointments_delete_archived_admin
on public.appointments
for delete
to authenticated
using (
  voided_at is not null
  and private.can_admin_clinic(clinic_id)
);
