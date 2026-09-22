import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import NbaWorkspace from '../../src/lib/components/NbaWorkspace.svelte';

const game=(id,home,away)=>({id,status:'Final',home_team:{full_name:home,abbreviation:home.slice(0,3)},visitor_team:{full_name:away,abbreviation:away.slice(0,3)},home_team_score:102,visitor_team_score:99});
const response=(data,source='balldontlie')=>new Response(JSON.stringify({data}),{headers:{'X-Data-Source':source}});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('NBA calendar interactions',()=>{
 it('filters teams and selects another match without inventing detailed statistics',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response([game(1,'Boston Celtics','Los Angeles Lakers'),game(2,'Miami Heat','New York Knicks')])));
  const screen=render(NbaWorkspace);
  await waitFor(()=>expect(screen.getByRole('region',{name:'Contexto del partido'}).textContent).toContain('Boston Celtics'));
  await fireEvent.click(screen.getByRole('button',{name:/Miami Heat/}));
  expect(screen.getByRole('region',{name:'Contexto del partido'}).textContent).toContain('New York Knicks');
  await fireEvent.input(screen.getByRole('searchbox',{name:'Buscar equipo'}),{target:{value:'Lakers'}});
  expect(screen.queryByRole('button',{name:/Miami Heat/})).toBeNull();
  expect(screen.getByRole('region',{name:'Contexto del partido'}).textContent).toContain('Boston Celtics');
 });
 it('discards a delayed response from today after switching to tomorrow',async()=>{
  let finishToday;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finishToday=resolve;})).mockResolvedValueOnce(response([game(2,'Tomorrow Home','Tomorrow Away')]));
  vi.stubGlobal('fetch',fetcher);const screen=render(NbaWorkspace);
  await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));
  await fireEvent.click(screen.getByRole('button',{name:'Mañana',exact:true}));
  await waitFor(()=>expect(screen.getByRole('button',{name:/Tomorrow Home/})).toBeTruthy());
  finishToday(response([game(1,'Obsolete Home','Obsolete Away')]));
  await waitFor(()=>expect(screen.queryByRole('button',{name:/Obsolete Home/})).toBeNull());
  expect(screen.getByRole('button',{name:/Tomorrow Home/})).toBeTruthy();
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
 });
 it('rejects fallback matches, then recovers through the retry action',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response([game(1,'Fake Home','Fake Away')],'mock-fallback')).mockResolvedValueOnce(response([]));
  vi.stubGlobal('fetch',fetcher);const screen=render(NbaWorkspace);
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('fuente disponible'));
  expect(screen.queryByRole('button',{name:/Fake Home/})).toBeNull();
  await fireEvent.click(screen.getByRole('button',{name:'Reintentar consulta'}));
  await waitFor(()=>expect(screen.getByText('Sin encuentros en el calendario recibido.')).toBeTruthy());
  expect(screen.queryByRole('alert')).toBeNull();
 });
});
