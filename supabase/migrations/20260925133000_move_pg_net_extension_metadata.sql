-- Supabase Security Advisor flags pg_net when its extension metadata is
-- installed in public. pg_net is non-relocatable, so follow Supabase's
-- documented drop/re-create path. Apply only when net.http_request_queue is empty.
create schema if not exists extensions;

drop extension if exists pg_net;
create extension pg_net with schema extensions;
