// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, it, expect } from 'vitest';
let db;
beforeAll(async()=>{
  db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync('schema.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260919225143_identity_billing_ledger.sql','utf8'));
},60000);
afterAll(async()=>await db?.close());
async function apply(user,key,kind,amount,ticket=null,odds=null,outcome=null){
  const result=await db.query('select bankroll_apply($1,$2,$3,$4,$5,$6,$7,$8) as data',[user,key.padStart(16,'0'),kind,amount,ticket,odds,outcome,'fixture']);
  return result.rows[0].data;
}
it('keeps all movements in the balance beyond the 100-row display limit',async()=>{
  for(let i=0;i<105;i++)await apply('many',`deposit-${i}`, 'deposit',100);
  const {rows}=await db.query("select bankroll_snapshot('many') as data");
  expect(rows[0].data.wallet.available_minor).toBe(10500);
  expect(rows[0].data.entryCount).toBe(105);
  expect(rows[0].data.entries).toHaveLength(100);
});
it('deduplicates requests and rejects conflicting retries',async()=>{
  await apply('retry','request-a','deposit',1000);
  const state=await apply('retry','request-a','deposit',1000);
  expect(state.wallet.available_minor).toBe(1000);
  await expect(apply('retry','request-a','deposit',2000)).rejects.toThrow();
});
it('reserves stake and settles exactly once without mixing capital and profit',async()=>{
  await apply('ticket','deposit','deposit',10000);
  const state=await apply('ticket','stake','stake',1000,null,1.91);
  expect(state.wallet).toMatchObject({available_minor:9000,reserved_minor:1000,profit_minor:0});
  const id=state.tickets[0].id;
  await expect(apply('other-user','steal','settle',0,id,null,'win')).rejects.toThrow();
  const settled=await apply('ticket','settle','settle',0,id,null,'win');
  expect(settled.wallet).toMatchObject({available_minor:10910,reserved_minor:0,profit_minor:910,deposited_minor:10000});
  await expect(apply('ticket','duplicate','settle',0,id,null,'win')).rejects.toThrow();
});
it.each(['push','void','loss'])('handles %s with exact minor units',async outcome=>{
  await apply(outcome,'deposit','deposit',10000);
  const state=await apply(outcome,'stake','stake',1000,null,1.91);
  const settled=await apply(outcome,'settle','settle',0,state.tickets[0].id,null,outcome);
  expect(settled.wallet.available_minor).toBe(outcome==='loss'?9000:10000);
  expect(settled.wallet.reserved_minor).toBe(0);
});
it('rolls back failed withdrawals',async()=>{
  await apply('low','deposit','deposit',100);
  await expect(apply('low','withdraw','withdraw',101)).rejects.toThrow();
  const {rows}=await db.query("select bankroll_snapshot('low') as data");
  expect(rows[0].data.entryCount).toBe(1);
  expect(rows[0].data.wallet.available_minor).toBe(100);
});
it('denies direct client writes to entitlements and ledger',async()=>{
  await db.exec('set role authenticated;');
  try{
    await expect(db.exec("insert into billing_accounts(user_id,plan) values('attacker','elite')")).rejects.toThrow();
    await expect(db.exec("select bankroll_apply('attacker','aaaaaaaaaaaaaaaa','deposit',100,null,null,null,'')")).rejects.toThrow();
  }finally{await db.exec('reset role;');}
});
it('server can record movements but cannot rewrite or delete ledger history',async()=>{
 await db.exec('set role service_role');
 try {expect((await apply('server-check','deposit','deposit',1000)).wallet.available_minor).toBe(1000);
  for(const sql of ['delete from ledger_entries',"update ledger_entries set delta_minor=1",'truncate bankroll_wallets'])await expect(db.exec(sql)).rejects.toThrow();
 }finally{await db.exec('reset role');}
});
it('deduplicates Stripe events and rejects older entitlement state',async()=>{
  const sql='select billing_apply_event($1,$2,$3,$4,$5,$6,$7,$8,$9) as applied';
  const args=['evt-current','subscription.updated',100,'billing-user','cus-a','sub-a','elite','active','2099-01-01'];
  expect((await db.query(sql,args)).rows[0].applied).toBe(true);
  expect((await db.query(sql,args)).rows[0].applied).toBe(false);
  expect((await db.query(sql,['evt-old',args[1],99,...args.slice(3,6),'free','canceled',null])).rows[0].applied).toBe(false);
  expect((await db.query("select plan from billing_accounts where user_id='billing-user'")).rows[0].plan).toBe('elite');
});
