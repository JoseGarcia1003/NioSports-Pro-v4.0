import { afterEach,describe,it,expect,vi } from 'vitest';
import { render,fireEvent,cleanup } from '@testing-library/svelte';
import NbaResearchWorkspace from '../../src/lib/components/NbaResearchWorkspace.svelte';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('NBA research: honest, interactive exploration',()=>{
  it('changes the sample window and keeps the non-predictive disclaimer visible',async()=>{
    const view=render(NbaResearchWorkspace);
    await fireEvent.click(view.getByRole('button',{name:'L5',exact:true}));
    expect(view.getByText(/5 observaciones ficticias/).textContent).toContain('no es una probabilidad predictiva');
    expect(view.getByRole('img',{name:/Totales de 5 encuentros ficticios/})).toBeTruthy();
    expect(view.queryByRole('button',{name:/apostar|crear pick/i})).toBeNull();
  });
  it('searches accent-insensitively and resets an empty result',async()=>{
    const view=render(NbaResearchWorkspace);
    await fireEvent.input(view.getByRole('searchbox',{name:'Buscar encuentro'}),{target:{value:'ambar'}});
    expect(view.getByRole('heading',{name:'Ámbar vs Índigo'})).toBeTruthy();
    await fireEvent.input(view.getByRole('searchbox',{name:'Buscar encuentro'}),{target:{value:'no-existe'}});
    expect(view.getByRole('heading',{name:'No encontramos ese encuentro.'})).toBeTruthy();
    await fireEvent.click(view.getByRole('button',{name:'Restablecer vista'}));
    expect(view.getByRole('heading',{name:'Explorador de encuentros'})).toBeTruthy();
  });
  it('resets a custom reference when a search changes the selected encounter',async()=>{
    const view=render(NbaResearchWorkspace);
    await fireEvent.input(view.getByRole('slider',{name:/Explorar otra referencia/}),{target:{value:'270'}});
    await fireEvent.input(view.getByRole('searchbox',{name:'Buscar encuentro'}),{target:{value:'coral'}});
    expect(Number(view.getByRole('slider',{name:/Explorar otra referencia/}).value)).toBe(218.5);
  });
  it('saves and filters a match, then displays an empty state after unsaving',async()=>{
    const view=render(NbaResearchWorkspace);
    await fireEvent.click(view.getByRole('button',{name:'Añadir a guardados Club Coral vs Club Oliva'}));
    await fireEvent.click(view.getAllByRole('button',{name:/Guardados 1/})[0]);
    expect(view.getByRole('heading',{name:'Coral vs Oliva'})).toBeTruthy();
    await fireEvent.click(view.getByRole('button',{name:'Quitar de guardados Club Coral vs Club Oliva'}));
    expect(view.getByRole('heading',{name:'No hay guardados en esta vista.'})).toBeTruthy();
  });
  it('never carries synthetic observations into real-data mode',async()=>{
    const view=render(NbaResearchWorkspace);
    await fireEvent.click(view.getByRole('button',{name:'Datos reales',exact:true}));
    expect(view.getByRole('heading',{name:'El análisis empieza con una fuente.'})).toBeTruthy();
    expect(view.queryByRole('heading',{name:'Explorador de encuentros'})).toBeNull();
    expect(view.queryByRole('img',{name:/Totales de/})).toBeNull();
    await fireEvent.click(view.getByRole('button',{name:'Explorar el ejemplo'}));
    expect(view.getByRole('heading',{name:'Explorador de encuentros'})).toBeTruthy();
  });
  it('recomputes reference counts and filtered sample size without pretending more rows exist',async()=>{
    const view=render(NbaResearchWorkspace);
    await fireEvent.input(view.getByRole('slider',{name:/Explorar otra referencia/}),{target:{value:'270'}});
    expect(view.getByText(/0 sobre · 10 bajo · 0 iguales/)).toBeTruthy();
    await fireEvent.click(view.getByRole('button',{name:'L20',exact:true}));
    await fireEvent.click(view.getByRole('button',{name:'Filtros',exact:true}));
    await fireEvent.change(view.getByRole('combobox',{name:'Localía del primer club'}),{target:{value:'home'}});
    expect(view.getByText(/10 observaciones ficticias de 20 solicitadas tras filtrar localía/)).toBeTruthy();
    expect(view.getByRole('img',{name:/Totales de 10 encuentros ficticios/})).toBeTruthy();
  });
  it('uses the same complete window in miniature charts and comparison cards',async()=>{
    const view=render(NbaResearchWorkspace);
    await fireEvent.input(view.getByRole('searchbox',{name:'Buscar encuentro'}),{target:{value:'ambar'}});
    await fireEvent.click(view.getByRole('button',{name:'L20',exact:true}));
    expect(view.container.querySelectorAll('.mini-chart i')).toHaveLength(20);
    expect(view.getByRole('button',{name:'L20',exact:true}).textContent).toContain('20 encuentros');
    await fireEvent.click(view.getByRole('button',{name:'Filtros',exact:true}));
    await fireEvent.change(view.getByRole('combobox',{name:'Localía del primer club'}),{target:{value:'home'}});
    expect(view.container.querySelectorAll('.mini-chart i')).toHaveLength(10);
    expect(view.getByRole('button',{name:'L20',exact:true}).textContent).toContain('10 encuentros');
  });
  it('validates manual references and synchronizes slider, comparison and reset',async()=>{
    const view=render(NbaResearchWorkspace);
    const input=view.getByRole('spinbutton',{name:'Referencia en puntos'});
    const slider=view.getByRole('slider',{name:/Explorar otra referencia/});
    const original=Number(slider.value);
    for(const value of ['','179','271','230.2']){
      await fireEvent.input(input,{target:{value}});
      await fireEvent.click(view.getByRole('button',{name:'Aplicar',exact:true}));
      expect(view.getByRole('alert').textContent).toContain('pasos de 0,5');
      expect(Number(slider.value)).toBe(original);
    }
    await fireEvent.input(input,{target:{value:'270'}});
    await fireEvent.click(view.getByRole('button',{name:'Aplicar',exact:true}));
    expect(Number(slider.value)).toBe(270);
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('button',{name:'L20',exact:true}).textContent).toContain('0/20 sobre');
    await fireEvent.input(slider,{target:{value:'235.5'}});
    expect(Number(input.value)).toBe(235.5);
    await fireEvent.click(view.getByRole('button',{name:/Volver a/}));
    expect(Number(input.value)).toBe(original);
  });
  it('opens the chosen encounter on mobile and returns without losing analysis settings',async()=>{
    vi.stubGlobal('matchMedia',()=>({matches:true}));
    const scroll=vi.fn();
    vi.stubGlobal('HTMLElement',HTMLElement);
    const originalScroll=HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView=scroll;
    try{
      const view=render(NbaResearchWorkspace);
      await fireEvent.click(view.getByRole('button',{name:'Analizar Club Coral vs Club Oliva'}));
      expect(view.container.querySelector('.lab-grid').getAttribute('data-mobile-view')).toBe('detail');
      expect(document.activeElement).toBe(view.getByRole('heading',{name:'Coral vs Oliva'}));
      await fireEvent.click(view.getByRole('button',{name:'L5',exact:true}));
      await fireEvent.input(view.getByRole('slider',{name:/Explorar otra referencia/}),{target:{value:'240'}});
      await fireEvent.click(view.getByRole('button',{name:'Encuentros 6',exact:true}));
      expect(document.activeElement).toBe(view.getByRole('heading',{name:'Explorador de encuentros'}));
      await fireEvent.click(view.getByRole('button',{name:'Análisis',exact:true}));
      expect(Number(view.getByRole('slider',{name:/Explorar otra referencia/}).value)).toBe(240);
      expect(view.getByRole('button',{name:'L5',exact:true}).getAttribute('aria-pressed')).toBe('true');
      expect(view.getByRole('heading',{name:'Coral vs Oliva'})).toBeTruthy();
      expect(scroll).toHaveBeenCalled();
    }finally{HTMLElement.prototype.scrollIntoView=originalScroll;}
  });
});
