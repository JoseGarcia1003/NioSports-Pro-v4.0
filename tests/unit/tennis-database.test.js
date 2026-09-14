// @vitest-environment node
import { beforeAll,afterAll,it,expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
let db;
beforeAll(async()=>{db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls; alter default privileges grant all on tables to service_role;');await db.exec(readFileSync('supabase/migrations/20260913040750_tennis_workspace.sql','utf8'));await db.exec(readFileSync('supabase/migrations/20260913040915_tennis_immutable_grants.sql','utf8'));},30000);
afterAll(async()=>{await db?.close();});
const payload={version:1,isDemo:false,players:[],matches:[],history:[]};
it('accepts real snapshot once and protects immutable content',async()=>{
  await db.query('insert into tennis_snapshots(id,provider,fetched_at,payload) values($1,$2,$3,$4)', ['a'.repeat(64),'test','2026-09-12T12:00:00Z',JSON.stringify(payload)]);
  await expect(db.query('insert into tennis_snapshots(id,provider,fetched_at,payload) values($1,$2,$3,$4)', ['a'.repeat(64),'test','2026-09-12T12:00:00Z',JSON.stringify(payload)])).rejects.toThrow();
});
it.each([true,null])('rejects demo or missing metadata: %s',async flag=>{
  const data={...payload,isDemo:flag};if(flag===null)delete data.isDemo;
  await expect(db.query('insert into tennis_snapshots(id,provider,fetched_at,payload) values($1,$2,$3,$4)', ['b'.repeat(64),'test','2026-09-12T13:00:00Z',JSON.stringify(data)])).rejects.toThrow();
});
it.each(['anon','authenticated'])('denies client role %s access to feeds and analysis',async role=>{
  await db.exec(`set role ${role}`);
  try{await expect(db.exec('select * from tennis_snapshots')).rejects.toThrow();await expect(db.exec('select * from tennis_analyses')).rejects.toThrow();await expect(db.exec("delete from tennis_snapshots")).rejects.toThrow();}finally{await db.exec('reset role');}
});
it('server can read and append but cannot modify snapshots',async()=>{
  await db.exec('set role service_role');
  try{expect((await db.query('select * from tennis_snapshots')).rows.length).toBe(1);await expect(db.exec("update tennis_snapshots set provider='changed'")).rejects.toThrow();}finally{await db.exec('reset role');}
});
