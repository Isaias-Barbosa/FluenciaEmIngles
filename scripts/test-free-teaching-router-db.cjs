const assert=require('node:assert/strict'),fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
(async()=>{const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 await db.exec(fs.readFileSync('supabase/migrations/20261021200000_free_teaching_provider_router.sql','utf8'));
 const role=async name=>{await db.exec('reset role');await db.exec(`set role ${name}`);};
 const providers=['gemini','groq','openrouter','cloudflare'];
 const claim=async(enabled=providers,excluded=[],day=100,minute=2)=>(await db.query('select claim_teaching_provider($1,$2,$3,$4) as lease',[enabled,excluded,day,minute])).rows[0].lease;
 const finish=async(lease,seconds=0)=>(await db.query('select finish_teaching_provider($1,$2,$3) as done',[lease.provider,lease.lease_id,seconds])).rows[0].done;
 for(const name of ['anon','authenticated']){await role(name);await assert.rejects(claim(),/permission denied/);await assert.rejects(db.query('select * from teaching_provider_state'),/permission denied/);await assert.rejects(finish({provider:'gemini',lease_id:'10000000-0000-4000-8000-000000000001'}),/permission denied/);}
 await role('service_role');await assert.rejects(claim(providers,[],0,2),/Invalid/);
 const leases=await Promise.all(providers.map(()=>claim()));assert.equal(new Set(leases.map(x=>x.provider)).size,4,'concurrent requests never share active provider');assert.equal(await claim(),null,'all providers leased');
 for(const lease of leases)assert.equal(await finish(lease),true);
 const next=await claim();assert.equal(next.provider,leases[0].provider,'least recently used rotation');await finish(next,3600);
 const afterCooldown=await claim();assert.notEqual(afterCooldown.provider,next.provider);await finish(afterCooldown);
 assert.equal(await claim([next.provider]),null,'cooldown shared across requests');
 await role('postgres');await db.exec("update teaching_provider_state set cooldown_until='-infinity',minute_window=clock_timestamp()-interval '2 minutes',minute_count=0,lease_until='-infinity'");await role('service_role');
 const daily=await claim(['gemini'],[],1);assert.equal(daily,null,'attempts already counted for daily cap');
 await role('postgres');await db.exec("update teaching_provider_state set usage_day=((clock_timestamp() at time zone 'UTC')::date-1),day_count=1000");await role('service_role');
 const newDay=await claim(['gemini'],[],1);assert.equal(newDay.provider,'gemini','daily reset');await finish(newDay);assert.equal(await claim(['gemini'],[],1),null);
 const one=await claim(['groq'],[],100,1);await finish(one);assert.equal(await claim(['groq'],[],100,1),null,'minute budget');
 await role('postgres');await db.exec("update teaching_provider_state set minute_window=clock_timestamp()-interval '61 seconds' where provider='groq'");await role('service_role');const two=await claim(['groq'],[],100,1);assert.equal(two.provider,'groq');
 // Recover a crashed execution. The original worker may not release the newer lease.
 await role('postgres');await db.exec("update teaching_provider_state set lease_until=clock_timestamp()-interval '1 second',minute_window=clock_timestamp()-interval '61 seconds' where provider='groq'");await role('service_role');
 const fresh=await claim(['groq']);assert.notEqual(fresh.lease_id,two.lease_id);assert.equal(await finish(two,9999),false);assert.equal(await claim(['groq']),null);assert.equal(await finish(fresh),true);
 const excluded=await claim(['openrouter'],['openrouter']);assert.equal(excluded,null);
 await role('postgres');const row=(await db.query("select * from teaching_provider_state where provider='gemini'")).rows[0];assert.equal(row.day_count,1,'new day persisted count');assert.equal(row.lease_id,null);
 console.log('Free teaching router DB passed: service-only access, shared rotation, concurrent leases, cooldown, budgets, UTC daily reset, minute reset, crash recovery and stale lease protection.');
}finally{await db.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
