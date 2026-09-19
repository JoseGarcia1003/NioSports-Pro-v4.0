// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll,afterAll,it,expect } from 'vitest';
let db;
beforeAll(async()=>{
 db=new PGlite();
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 await db.exec(readFileSync('schema.sql','utf8'));
 // Reproduce actual unsafe grants and disabled RLS, not an already-secure fixture.
 await db.exec('grant all on all tables in schema public to anon,authenticated;');
 for(const table of ['teams','games','team_stats','predictions','odds_snapshots','model_versions','user_profiles','picks','bankroll_transactions'])await db.exec(`alter table ${table} disable row level security`);
 await db.exec("insert into user_profiles(id,email) values('a','a@example.test'),('b','b@example.test');insert into bankroll_transactions(user_id,type,amount,balance) values('a','deposit',100,100),('b','deposit',200,200);");
 await db.exec(readFileSync('supabase/migrations/20260919225153_legacy_row_security.sql','utf8'));
},60000);
afterAll(()=>db?.close());
async function as(role,uid,fn){await db.exec(`set role ${role}`);try{await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(uid?{sub:uid}:{})]);return await fn();}finally{await db.exec('reset role');}}
it('turns on RLS for every legacy table',async()=>{const {rows}=await db.query("select tablename from pg_tables where schemaname='public' and not rowsecurity");expect(rows).toEqual([]);});
it('anonymous visitors can read sports but cannot change them or read accounts',async()=>as('anon',null,async()=>{expect((await db.query('select * from teams')).rows).toHaveLength(30);for(const sql of ['delete from teams','truncate games','select * from user_profiles','select * from picks','select * from bankroll_transactions'])await expect(db.exec(sql)).rejects.toThrow();}));
it('authenticated users see only their own legacy history and profile',async()=>as('authenticated','a',async()=>{expect((await db.query('select id from user_profiles')).rows).toEqual([{id:'a'}]);expect((await db.query('select user_id from bankroll_transactions')).rows).toEqual([{user_id:'a'}]);await expect(db.exec('delete from games')).rejects.toThrow();await expect(db.exec('delete from bankroll_transactions')).rejects.toThrow();}));
it('preference upsert works but changing plan or ownership is rejected',async()=>as('authenticated','a',async()=>{await db.exec("insert into user_profiles(id,display_name) values('a','New name') on conflict(id) do update set id=excluded.id,display_name=excluded.display_name");expect((await db.query('select display_name from user_profiles')).rows[0].display_name).toBe('New name');for(const sql of ["update user_profiles set plan='elite'","update user_profiles set current_bankroll=1000000","update user_profiles set id='new-owner'","insert into user_profiles(id) values('foreign')"])await expect(db.exec(sql)).rejects.toThrow();}));
it('picks cannot cross accounts through insert, update, read or delete',async()=>{
 const insert="insert into picks(user_id,home_team,away_team,period,bet_type,line) values($1,'Home','Away','FULL','OVER',210) returning id";
 let id;
 await as('authenticated','a',async()=>{id=(await db.query(insert,['a'])).rows[0].id;await expect(db.query(insert,['b'])).rejects.toThrow();await expect(db.query("update picks set user_id='b' where id=$1",[id])).rejects.toThrow();});
 await as('authenticated','b',async()=>{expect((await db.query('select * from picks')).rows).toEqual([]);expect((await db.query('delete from picks where id=$1 returning id',[id])).rows).toEqual([]);});
 await as('authenticated','a',async()=>{expect((await db.query('select id from picks')).rows).toEqual([{id}]);await db.query('delete from picks where id=$1',[id]);});
});
