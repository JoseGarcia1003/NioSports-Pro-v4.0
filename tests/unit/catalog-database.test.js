// @vitest-environment node
import { beforeAll,afterAll,it,expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
let db;
beforeAll(async()=>{db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;alter default privileges grant all on tables to service_role;');await db.exec(readFileSync('supabase/migrations/20260914151620_daily_prediction_catalog.sql','utf8'));},30000);
afterAll(()=>db?.close());
const payload={version:1,isDemo:false,day:'2026-09-14',timezone:'America/Guayaquil',entries:[{id:'one'}],freePickId:'one'};
it('stores one edition per day and refuses replacement',async()=>{await db.query('insert into prediction_editions(day,payload) values($1,$2)',['2026-09-14',JSON.stringify(payload)]);await expect(db.query('insert into prediction_editions(day,payload) values($1,$2)',['2026-09-14',JSON.stringify(payload)])).rejects.toThrow();});
it.each(['anon','authenticated'])('denies %s direct reads of hidden content and writes',async role=>{await db.exec(`set role ${role}`);try{await expect(db.exec('select * from prediction_editions')).rejects.toThrow();await expect(db.exec('delete from prediction_editions')).rejects.toThrow();await expect(db.exec('select * from prediction_withdrawals')).rejects.toThrow();}finally{await db.exec('reset role');}});
it('server role is append-only despite inherited Supabase grants',async()=>{await db.exec('set role service_role');try{expect((await db.query('select day from prediction_editions')).rows).toHaveLength(1);await expect(db.exec("update prediction_editions set payload='{}'")).rejects.toThrow();await expect(db.exec('delete from prediction_editions')).rejects.toThrow();}finally{await db.exec('reset role');}});
it('rejects demo editions and missing metadata',async()=>{for(const value of [{...payload,isDemo:true,day:'2026-09-15'},{}])await expect(db.query('insert into prediction_editions(day,payload) values($1,$2)',['2026-09-15',JSON.stringify(value)])).rejects.toThrow();});
it('JSON null cannot bypass metadata constraints',async()=>{for(const key of ['day','timezone','freePickId','entries'])await expect(db.query('insert into prediction_editions(day,payload) values($1,$2)',['2026-09-15',JSON.stringify({...payload,day:'2026-09-15',[key]:null})])).rejects.toThrow();});
