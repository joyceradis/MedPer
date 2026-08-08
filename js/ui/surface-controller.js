const SURFACES=new Set(['overview','cases','deadlines','references','models']);

export function installSurfaceController({root}){
  let destroyed=false;

  const onClick=event=>{
    if(destroyed)return;

    const surfaceButton=event.target.closest('[data-surface]');
    if(surfaceButton&&SURFACES.has(surfaceButton.dataset.surface)){
      event.preventDefault();
      window.location.hash=`#/dashboard/${surfaceButton.dataset.surface}`;
      return;
    }

    const backToCases=event.target.closest('.back-link[data-home]');
    if(backToCases){
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.hash='#/dashboard/cases';
    }
  };

  root.addEventListener('click',onClick,true);

  return{
    destroy(){
      destroyed=true;
      root.removeEventListener('click',onClick,true);
    }
  };
}
