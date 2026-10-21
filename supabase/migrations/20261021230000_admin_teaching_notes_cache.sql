begin;
-- Private application cache. Neither question text nor credentials are stored here.
create table public.admin_teaching_notes_cache (
 cache_key text primary key check(cache_key ~ '^[a-f0-9]{64}$'),
 explanation text,
 hint text,
 provider text,
 generated_at timestamptz,
 expires_at timestamptz not null default '-infinity',
 lease_id uuid,
 lease_until timestamptz not null default '-infinity',
 constraint teaching_cache_complete check (
  (explanation is null and hint is null and provider is null and generated_at is null)
  or (explanation is not null and length(btrim(explanation)) between 20 and 1500
   and hint is not null and length(btrim(hint)) between 10 and 500
   and provider is not null and length(provider) between 1 and 80 and generated_at is not null)
 )
);
create index admin_teaching_notes_cache_expiry on public.admin_teaching_notes_cache(expires_at);
alter table public.admin_teaching_notes_cache enable row level security;
revoke all on public.admin_teaching_notes_cache from public,anon,authenticated;
grant all on public.admin_teaching_notes_cache to service_role;

create function public.claim_teaching_notes_cache(p_cache_key text,p_ttl_seconds integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.admin_teaching_notes_cache;v_now timestamptz;v_lease uuid;v_expiry timestamptz;
begin
 if p_cache_key is null or p_cache_key !~ '^[a-f0-9]{64}$' or p_ttl_seconds is null or p_ttl_seconds not between 60 and 604800 then
  raise exception 'Invalid teaching cache request' using errcode='22023';end if;
 -- Coordinate only identical inputs, including across serverless instances/admins.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_cache_key,24));
 v_now:=pg_catalog.clock_timestamp();
 -- Bounded retention of unused entries, independent of whether they are hit again.
 delete from public.admin_teaching_notes_cache where expires_at<v_now-interval '7 days' and lease_until<=v_now;
 insert into public.admin_teaching_notes_cache(cache_key) values(p_cache_key) on conflict do nothing;
 select * into v_row from public.admin_teaching_notes_cache where cache_key=p_cache_key for update;
 v_expiry:=least(v_row.expires_at,v_row.generated_at+make_interval(secs=>p_ttl_seconds));
 if v_row.explanation is not null and v_expiry>v_now then
  return jsonb_build_object('state','hit','explanation',v_row.explanation,'hint',v_row.hint,'provider',v_row.provider,
   'generated_at',v_row.generated_at,'expires_at',v_expiry);
 end if;
 if v_row.lease_until>v_now then
  return jsonb_build_object('state','busy','retry_after',greatest(1,ceil(extract(epoch from v_row.lease_until-v_now))::integer));
 end if;
 v_lease:=gen_random_uuid();
 update public.admin_teaching_notes_cache set lease_id=v_lease,lease_until=v_now+interval '90 seconds' where cache_key=p_cache_key;
 return jsonb_build_object('state','claimed','lease_id',v_lease);
end;$$;

create function public.finish_teaching_notes_cache(p_cache_key text,p_lease_id uuid,p_explanation text,p_hint text,p_provider text,p_ttl_seconds integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_now timestamptz:=pg_catalog.clock_timestamp();v_row public.admin_teaching_notes_cache;
begin
 if p_ttl_seconds is null or p_ttl_seconds not between 60 and 604800
  or (p_explanation is null and (p_hint is not null or p_provider is not null))
  or (p_explanation is not null and (length(btrim(p_explanation)) not between 20 and 1500 or p_hint is null
   or length(btrim(p_hint)) not between 10 and 500 or p_provider is null or length(p_provider) not between 1 and 80)) then
  raise exception 'Invalid teaching cache result' using errcode='22023';end if;
 if p_explanation is null then
  -- A failed generation releases its reservation and is never a cache hit.
  update public.admin_teaching_notes_cache set lease_id=null,lease_until='-infinity'
   where cache_key=p_cache_key and lease_id=p_lease_id and lease_until>v_now returning * into v_row;
 else
  update public.admin_teaching_notes_cache set lease_id=null,lease_until='-infinity',
   explanation=btrim(p_explanation),hint=btrim(p_hint),provider=p_provider,generated_at=v_now,
   expires_at=v_now+make_interval(secs=>p_ttl_seconds)
   where cache_key=p_cache_key and lease_id=p_lease_id and lease_until>v_now returning * into v_row;
 end if;
 if not found then return null;end if;
 return jsonb_build_object('generated_at',v_row.generated_at,'expires_at',v_row.expires_at);
end;$$;
revoke all on function public.claim_teaching_notes_cache(text,integer),public.finish_teaching_notes_cache(text,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.claim_teaching_notes_cache(text,integer),public.finish_teaching_notes_cache(text,uuid,text,text,text,integer) to service_role;
commit;
