drop policy if exists clinics_delete on public.clinics;

create policy clinics_delete
on public.clinics
for delete
to authenticated
using (owner_id = (select auth.uid()));
