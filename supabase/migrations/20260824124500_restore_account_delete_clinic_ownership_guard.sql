-- Account deletion must never delete an owned clinic as a side effect.
-- Owners must transfer administration or explicitly delete the clinic first.
alter table public.clinics
  drop constraint if exists clinics_owner_id_fkey;

alter table public.clinics
  add constraint clinics_owner_id_fkey
  foreign key (owner_id)
  references auth.users(id)
  on delete restrict;
