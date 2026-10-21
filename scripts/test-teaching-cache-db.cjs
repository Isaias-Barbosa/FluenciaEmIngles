const assert=require('node:assert/strict'),fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
const key=n=>String(n).padStart(64,'a');
(async()=>{const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 await db.exec(fs.readFileSync('supabase/migrations/20261021230000_admin_teaching_notes_cache.sql','utf8'));
 const role=async name=>{await db.exec('reset role');await db.exec(`set role ${name}`);};
 const claim=async(k=key(1),ttl=86400)=>(await db.query('select claim_teaching_notes_cache($1,$2) as result',[k,ttl])).rows[0].result;
 const finish=async(k,id,explanation='Hello é uma saudação para iniciar uma conversa.',hint='Pense em como iniciar uma conversa.',ttl=86400)=>(await db.query('select finish_teaching_notes_cache($1,$2,$3,$4,$5,$6) as result',[k,id,explanation,hint,explanation?'Groq':null,ttl])).rows[0].result;
 for(const name of ['anon','authenticated']){await role(name);await assert.rejects(claim(),/permission denied/);await assert.rejects(db.query('select * from admin_teaching_notes_cache'),/permission denied/);await assert.rejects(finish(key(1),'10000000-0000-4000-8000-000000000001'),/permission denied/);}
 await role('service_role');await assert.rejects(claim('invalid'),/Invalid/);await assert.rejects(claim(key(1),0),/Invalid/);await assert.rejects(claim(key(1),604801),/Invalid/);
 const parallel=await Promise.all([claim(),claim()]);assert.deepEqual(parallel.map(r=>r.state),['claimed','busy'],'one generation for identical simultaneous requests');assert.ok(parallel[1].retry_after>0&&parallel[1].retry_after<=90);
 const other=await claim(key(2));assert.equal(other.state,'claimed','different question remains independent');
 const saved=await finish(key(1),parallel[0].lease_id);assert.equal((Date.parse(saved.expires_at)-Date.parse(saved.generated_at))/1000,86400);
 const hit=await claim();assert.equal(hit.state,'hit');assert.equal(hit.provider,'Groq');assert.match(hit.explanation,/saudação/);assert.equal(hit.lease_id,undefined);assert.equal(hit.generated_at,saved.generated_at);assert.equal((await claim()).generated_at,saved.generated_at,'hits do not extend validity');
 assert.equal(await finish(key(1),parallel[0].lease_id),null,'completed lease cannot be replayed');
 await finish(key(2),other.lease_id,null,null);const released=await claim(key(2));assert.equal(released.state,'claimed','failure releases without caching');assert.notEqual(released.lease_id,other.lease_id);
 await role('postgres');await db.query("update admin_teaching_notes_cache set expires_at=clock_timestamp()-interval '1 second' where cache_key=$1",[key(1)]);await role('service_role');
 const expired=await claim();assert.equal(expired.state,'claimed','expired content is never returned');
 await role('postgres');await db.query("update admin_teaching_notes_cache set lease_until=clock_timestamp()-interval '1 second' where cache_key=$1",[key(1)]);await role('service_role');
 const recovered=await claim();assert.notEqual(recovered.lease_id,expired.lease_id);assert.equal(await finish(key(1),expired.lease_id),null,'stale worker cannot overwrite newer lease');assert.equal((await claim()).state,'busy');await finish(key(1),recovered.lease_id);
 await role('postgres');await db.query("update admin_teaching_notes_cache set generated_at=clock_timestamp()-interval '2 minutes',expires_at=clock_timestamp()+interval '1 day' where cache_key=$1",[key(1)]);await role('service_role');
 const shortened=await claim(key(1),60);assert.equal(shortened.state,'claimed','lower configured TTL invalidates older entries immediately');const oneMinute=await finish(key(1),shortened.lease_id,undefined,undefined,60);const longer=await claim(key(1),604800);assert.equal(longer.state,'hit');assert.equal(longer.expires_at,oneMinute.expires_at,'higher TTL never silently extends a stored result');
 const invalid=await claim(key(3));await assert.rejects(finish(key(3),invalid.lease_id,'short','short'),/Invalid/);assert.equal((await claim(key(3))).state,'busy');await finish(key(3),invalid.lease_id,null,null);
 await role('postgres');await db.query("update admin_teaching_notes_cache set expires_at=clock_timestamp()-interval '8 days',lease_until='-infinity' where cache_key=$1",[key(1)]);await role('service_role');await claim(key(4));await role('postgres');assert.equal((await db.query('select count(*) from admin_teaching_notes_cache where cache_key=$1',[key(1)])).rows[0].count,0,'old unused entries are removed');
 console.log('Teaching cache DB passed: private roles, shared hits, exact TTL, single-flight concurrency, independent inputs, failure release, expiry, stale leases, config changes, result validation and cleanup.');
}finally{await db.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
