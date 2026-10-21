-- Shared rotation, conservative request budgets and expiring leases. No API keys here.
create table public.teaching_provider_state (
 provider text primary key check(provider in ('gemini','groq','openrouter','cloudflare')),
 last_used_at timestamptz not null default '-infinity',
 lease_id uuid,
 lease_until timestamptz not null default '-infinity',
 cooldown_until timestamptz not null default '-infinity',
 usage_day date,
 day_count integer not null default 0,
 minute_window timestamptz not null default '-infinity',
 minute_count integer not null default 0
);
insert into public.teaching_provider_state(provider) values('gemini'),('groq'),('openrouter'),('cloudflare');
alter table public.teaching_provider_state enable row level security;
revoke all on public.teaching_provider_state from public,anon,authenticated;
grant select,update on public.teaching_provider_state to service_role;

create function public.claim_teaching_provider(p_enabled text[],p_exclude text[],p_daily_limit integer,p_minute_limit integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare chosen text; lease uuid; current_time_at timestamptz:=clock_timestamp(); today date;
begin
 if p_daily_limit not between 1 and 10000 or p_minute_limit not between 1 and 60 or p_daily_limit is null or p_minute_limit is null then
  raise exception 'Invalid teaching provider budgets';
 end if;
 -- Claims from all application instances must see each other's reservations.
 perform pg_advisory_xact_lock(74202110212000);
 current_time_at:=clock_timestamp();
 today:=(current_time_at at time zone 'UTC')::date;
 select provider into chosen from public.teaching_provider_state
 where provider=any(p_enabled) and not(provider=any(coalesce(p_exclude,array[]::text[])))
 and cooldown_until<=current_time_at and lease_until<=current_time_at
 and (usage_day is distinct from today or day_count<p_daily_limit)
 and (minute_window<=current_time_at-interval '1 minute' or minute_count<p_minute_limit)
 order by last_used_at,array_position(p_enabled,provider) limit 1 for update;
 if chosen is null then return null;end if;
 lease:=gen_random_uuid();
 update public.teaching_provider_state set
 last_used_at=current_time_at,lease_id=lease,lease_until=current_time_at+interval '50 seconds',
 day_count=case when usage_day=today then day_count+1 else 1 end,usage_day=today,
 minute_count=case when minute_window>current_time_at-interval '1 minute' then minute_count+1 else 1 end,
 minute_window=case when minute_window>current_time_at-interval '1 minute' then minute_window else current_time_at end
 where provider=chosen;
 return jsonb_build_object('provider',chosen,'lease_id',lease);
end;$$;

create function public.finish_teaching_provider(p_provider text,p_lease_id uuid,p_cooldown_seconds integer)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare affected integer;
begin
 if p_cooldown_seconds is null or p_cooldown_seconds<0 then raise exception 'Invalid provider cooldown';end if;
 update public.teaching_provider_state set lease_id=null,lease_until='-infinity',
 cooldown_until=greatest(cooldown_until,clock_timestamp()+make_interval(secs=>p_cooldown_seconds))
 where provider=p_provider and lease_id=p_lease_id;
 get diagnostics affected=row_count;
 return affected=1;
end;$$;
revoke all on function public.claim_teaching_provider(text[],text[],integer,integer) from public,anon,authenticated;
revoke all on function public.finish_teaching_provider(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_teaching_provider(text[],text[],integer,integer) to service_role;
grant execute on function public.finish_teaching_provider(text,uuid,integer) to service_role;
