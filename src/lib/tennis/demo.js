import { calendarDays, dateKey } from './domain.js';

// Fictional players and events. Never ingest this dataset into production.
export function demoDataset(now=Date.now(), timezone='America/Guayaquil') {
  const days=calendarDays(now,timezone);
  const names=['Elena Vargas','Sofía Marin','Clara Dubois','Nina Keller','Lucía Costa','Eva Novak','Maya Silva','Anna Moreau','Adrián Ríos','Mateo Vidal','Lucas Laurent','Nicolás Weber','Daniel Costa','Leo Novak','Marco Silva','Alex Moreau'];
  const players=names.map((name,i)=>({id:`demo-p${i}`,name,gender:i<8?'women':'men',rank:12+i*7,country:['ESP','FRA','GER','POR'][i%4]}));
  const history=[];
  for(let gender=0;gender<2;gender++)for(let day=180;day>=1;day--) {
    const a=(day%8)+gender*8,b=((day+1+(Math.floor(day/8)%6))%8)+gender*8;
    const endedAt=new Date(now-day*86400000).toISOString();
    history.push({id:`demo-h${gender}-${day}`,a:players[a].id,b:players[b].id,winner:players[day%5<3?Math.min(a,b):Math.max(a,b)].id,surface:['hard','clay','grass'][day%3],circuit:gender?'ATP':'WTA',status:'completed',discipline:'singles',endedAt,observedAt:endedAt});
  }
  // Keep four future demo matches per local day, even just before midnight.
  const endOfDay=(start,key)=>{let low=start,high=start+30*3600000;for(let i=0;i<40;i++){const mid=Math.floor((low+high)/2);if(dateKey(mid,timezone)===key)low=mid;else high=mid;}return high;};
  const todayEnd=endOfDay(now,days[0]);
  const tomorrowEnd=endOfDay(todayEnd,days[1]);
  const instants=Array.from({length:8},(_,i)=>{const start=i<4?now:todayEnd,end=i<4?todayEnd:tomorrowEnd;return Math.floor(start+(end-start)*((i%4)+.5)/4);});
  const matches=Array.from({length:8},(_,i)=>{
    const gender=i%2,base=gender?8:0,offset=(Math.floor(i/2)*2)%8;
    return {id:`demo-m${i}`,a:players[base+offset].id,b:players[base+offset+1].id,circuit:gender?['ATP','Challenger','ITF Men','ATP'][Math.floor(i/2)]:['WTA','WTA 125','ITF Women','WTA'][Math.floor(i/2)],tournament:['Costa Open · Ejemplo','Jardines Trophy · Ejemplo','Riviera Cup · Ejemplo','Capital Open · Ejemplo'][Math.floor(i/2)],round:i<4?'Cuartos de final':'Semifinal',surface:['hard','clay','grass','hard'][Math.floor(i/2)],indoor:i>=6,bestOf:3,discipline:'singles',status:'scheduled',startAt:new Date(instants[i]).toISOString()};
  });
  return {version:1,provider:'NioSports · laboratorio de demostración',isDemo:true,fetchedAt:new Date(now).toISOString(),coverage:['ATP','WTA','Challenger','WTA 125','ITF Men','ITF Women'],players,matches,history,injuries:[],playerStats:players.map((p,i)=>({playerId:p.id,season:new Date(now).getUTCFullYear(),surface:'all',asOf:new Date(now).toISOString(),matches:40,servicePoints:2000,firstServeIn:1200+i*10,firstServeWon:800+i*8,secondServePoints:800-i*10,secondServeWon:320+i*5,breakPointsFaced:150,breakPointsSaved:85+i*2,breakOpportunities:170,breaksConverted:70+i,aces:100+i*3,doubleFaults:70-i}))};
}
