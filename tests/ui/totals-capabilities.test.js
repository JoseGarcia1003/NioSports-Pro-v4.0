import { afterEach,expect,it,vi } from 'vitest';
import { render,fireEvent,cleanup,waitFor } from '@testing-library/svelte';
import Page from '../../src/routes/totales/+page.svelte';
import { capabilities } from '../../src/lib/prediction/capabilities.js';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('shows unavailable capabilities without computing or saving a prediction',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({capabilities})));
  vi.stubGlobal('fetch',fetcher);const screen=render(Page);
  await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('confirmado'));
  expect(screen.getByRole('heading',{name:'Análisis predictivo no habilitado'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:/Guardar/})).toBeNull();
  expect(fetcher.mock.calls.every(([url])=>url==='/api/predict')).toBe(true);
});
it('distinguishes service failure and allows retry without a fallback estimate',async()=>{
  const fetcher=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify({capabilities})));
  vi.stubGlobal('fetch',fetcher);const screen=render(Page);
  await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('No pudimos'));
  await fireEvent.click(screen.getByRole('button',{name:'Volver a comprobar'}));
  await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('confirmado'));
  expect(fetcher).toHaveBeenCalledTimes(2);
});
