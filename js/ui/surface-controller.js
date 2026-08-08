import { renderDashboardSurface } from './dashboard-view.js';

const SURFACES=new Set(['overview','cases','deadlines','references','models']);

function currentSurface(){
  const match=window.location.hash.match(/^#\/dashboard\/([^/]+)/);
  return match&&SURFACES.has(match[1])?match[1]:'overview';
}

export function installSurfaceController({root,store}){
  let filter='active';
  let destroyed=false;

  const render=()=>{
    if(destroyed||window.location.hash.startsWith('#/case/'))return;
    root.innerHTML=renderDashboardSurface(store.getState(),currentSurface(),filter);
  };

  const onClick=event=>{
    const surfaceButton=event.target.closest('[data-surface]');
    if(surfaceButton){
      event.preventDefault();
      window.location.hash=`#/dashboard/${surfaceButton.dataset.surface}`;
      return;
    }
    const filterButton=event.target.closest('[data-case-filter]');
    if(filterButton&&currentSurface()==='cases'){
      filter=filterButton.dataset.caseFilter;
      queueMicrotask(render);
    }
  };

  const onHash=()=>queueMicrotask(render);
  root.addEventListener('click',onClick);
  window.addEventListener('hashchange',onHash);
  const unsubscribe=store.subscribe(()=>queueMicrotask(render));
  queueMicrotask(render);

  return{destroy(){destroyed=true;root.removeEventListener('click',onClick);window.removeEventListener('hashchange',onHash);unsubscribe?.();}};
}
