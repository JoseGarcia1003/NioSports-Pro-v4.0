import { env } from '$env/dynamic/private';
import { createHash } from 'node:crypto';
import { adminDatabase } from './entitlements.js';
import { validateDataset, analyzeMatch } from '$lib/tennis/domain.js';

export async function readLimitedJSON(response, maxBytes=10000000) {
  if(!response.ok) throw new Error('Feed request failed');
  if(Number(response.headers.get('content-length'))>maxBytes) throw new Error('Feed too large');
  const reader=response.body?.getReader();
  if(!reader)throw new Error('Empty feed');
  const chunks=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw new Error('Feed too large');chunks.push(value);}}
  finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function ingestTennis(now=Date.now()) {
  if(!env.TENNIS_FEED_URL || !env.TENNIS_API_KEY || !env.TENNIS_PROVIDER_ID) throw new Error('Tennis provider not configured');
  const target=new URL(env.TENNIS_FEED_URL);
  if(target.protocol!=='https:'||target.username||target.password)throw new Error('Invalid feed URL');
  // The URL is trusted server configuration, never a query/body parameter.
  const response=await fetch(target,{headers:{Authorization:`Bearer ${env.TENNIS_API_KEY}`,Accept:'application/json'},signal:AbortSignal.timeout(15000),redirect:'error',cache:'no-store'});
  const payload=validateDataset(await readLimitedJSON(response),{now});
  if(payload.provider!==env.TENNIS_PROVIDER_ID)throw new Error('Provider mismatch');
  if(now-Date.parse(payload.fetchedAt)>6*3600000)throw new Error('Stale provider delivery');
  const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const db=adminDatabase();
  const {error}=await db.from('tennis_snapshots').insert({id:hash,provider:payload.provider,fetched_at:payload.fetchedAt,payload});
  if(error){
    if(error.code!=='23505')throw new Error('Snapshot storage failed');
    const {data:existing,error:readError}=await db.from('tennis_snapshots').select('id').eq('id',hash).maybeSingle();
    if(readError||!existing)throw new Error('Conflicting provider delivery');
  }
  return {snapshotId:hash,matches:payload.matches.length,players:payload.players.length,fetchedAt:payload.fetchedAt};
}

export async function latestTennis() {
  if(!env.TENNIS_PROVIDER_ID)return null;
  const {data,error}=await adminDatabase().from('tennis_snapshots').select('id,payload').eq('provider',env.TENNIS_PROVIDER_ID).order('fetched_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw new Error('Tennis storage unavailable');
  if(!data)return null;
  validateDataset(data.payload);
  return data;
}

export async function recordTennisAnalysis(snapshot,match,now=Date.now()) {
  const result=analyzeMatch(snapshot.payload,match,now);
  const {error}=await adminDatabase().from('tennis_analyses').insert({snapshot_id:snapshot.id,match_id:match.id,model_version:result.modelVersion,result});
  if(error){
    if(error.code!=='23505')throw new Error('Analysis audit unavailable');
    const {data:stored,error:readError}=await adminDatabase().from('tennis_analyses').select('result').eq('snapshot_id',snapshot.id).eq('match_id',match.id).eq('model_version',result.modelVersion).single();
    if(readError||!stored)throw new Error('Analysis audit unavailable');
    return stored.result;
  }
  return result;
}
