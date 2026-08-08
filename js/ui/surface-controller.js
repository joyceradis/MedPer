const SURFACES=new Set(['overview','cases','deadlines','references','models']);

function currentSurface(){
  const match=window.location.hash.match(/^#\/dashboard\/([^/]+)/);
  return match&&SURFACES.has(match[1])?match[1]:'overview';
}

function navigate(surface){
  if(!SURFACES.has(surface))return;
  const next=`#/dashboard/${surface}`;
  if(window.location.hash===next){
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash=next;
}

export function installSurfaceController({root}){
  let destroyed=false;

  const onClick=event=>{
    if(destroyed)return;

    const backToCases=event.target.closest('.back-link[data-home]');
    if(backToCases&&window.location.hash.startsWith('#/case/')){
      event.preventDefault();
      event.stopImmediatePropagation();
      navigate('cases');
      return;
    }

    const surfaceButton=event.target.closest('[data-surface]');
    if(!surfaceButton)return;
    const surface=surfaceButton.dataset.surface;
    if(!SURFACES.has(surface))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    navigate(surface);
  };

  root.addEventListener('click',onClick,true);

  return{
    currentSurface,
    destroy(){
      destroyed=true;
      root.removeEventListener('click',onClick,true);
    }
  };
}
