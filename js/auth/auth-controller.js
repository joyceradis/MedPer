import { SUPABASE_CONFIG, isSupabaseConfigured } from '../config/supabase-config.js';

const escapeHtml=(value='')=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
}[char]));

function brandMarkup(subtitle) {
  return `<div class="auth-brand"><img class="auth-logomark" src="./icon.svg" alt=""><div><strong><span class="wordmark-med">Med</span><span class="wordmark-per">Per</span></strong><span>${escapeHtml(subtitle)}</span></div></div>`;
}

function authShell(message='') {
  return `
    <main class="auth-shell" id="authShell">
      <section class="auth-card" aria-labelledby="authTitle">
        ${brandMarkup('Perícia estruturada')}
        <div class="auth-copy">
          <span class="eyebrow">Acesso profissional</span>
          <h1 id="authTitle">Entre na sua conta</h1>
          <p>Seus casos ficam vinculados ao seu usuário e à organização contratante.</p>
        </div>
        ${message?`<p class="auth-message" role="status">${escapeHtml(message)}</p>`:''}
        <button class="button button-google" type="button" data-auth-google>Continuar com Google</button>
        <div class="auth-divider"><span>ou</span></div>
        <form class="auth-form" data-auth-form novalidate>
          <label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required></label>
          <label class="field"><span>Senha</span><input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
          <div class="auth-actions">
            <button class="button button-primary" type="submit" data-auth-action="signin">Entrar</button>
            <button class="button button-secondary" type="submit" data-auth-action="signup">Criar conta</button>
          </div>
          <p class="form-error" data-auth-error role="alert"></p>
        </form>
        <p class="auth-legal">Ao continuar, a pessoa usuária concorda com os termos e a política de privacidade que serão publicados antes da comercialização.</p>
      </section>
    </main>`;
}

function setupShell() {
  return `
    <main class="auth-shell auth-setup" id="authShell">
      <section class="auth-card" aria-labelledby="authTitle">
        ${brandMarkup('Perícia estruturada')}
        <div class="auth-copy">
          <span class="eyebrow">Modo de desenvolvimento</span>
          <h1 id="authTitle">Acesso online ainda não ativado</h1>
          <p>Este ambiente está operando localmente. A estrutura de autenticação permanece preparada, mas ainda não está habilitada para uso real.</p>
        </div>
        <div class="auth-setup-box">
          <strong>Ambiente local</strong>
          <p>Continue para testar a aplicação sem sincronização de conta ou dados remotos.</p>
        </div>
        <button class="button button-primary" type="button" data-auth-local>Continuar em modo local</button>
      </section>
    </main>`;
}

function accountDialogMarkup() {
  return `
    <dialog class="modal modal-small auth-account-dialog" id="authAccountDialog" aria-labelledby="authAccountTitle">
      <form method="dialog">
        <header class="modal-header"><div><span class="eyebrow">Conta MedPer</span><h2 id="authAccountTitle">Conta</h2><p data-auth-account-email></p></div><button class="icon-button" value="cancel" aria-label="Fechar">×</button></header>
        <div class="account-state" data-auth-account-state></div>
        <footer class="modal-footer modal-footer-end"><button class="button button-danger" type="button" data-auth-signout>Sair</button></footer>
      </form>
    </dialog>`;
}

async function loadWorkspace(supabase,user) {
  const [{data:profile,error:profileError},{data:memberships,error:membershipError}] = await Promise.all([
    supabase.from('profiles').select('id,full_name,crm,state_registration,avatar_url,default_organization_id').eq('id',user.id).maybeSingle(),
    supabase.from('organization_members').select('role,organization:organizations(id,name,status,trial_ends_at,seat_limit,case_limit)').eq('user_id',user.id)
  ]);
  if(profileError) throw profileError;
  if(membershipError) throw membershipError;

  if(!memberships?.length){
    const fallbackName=profile?.full_name?`Espaço de ${profile.full_name}`:'Espaço pessoal';
    const {error}=await supabase.rpc('create_personal_organization',{org_name:fallbackName});
    if(error) throw error;
    return loadWorkspace(supabase,user);
  }

  const selected=memberships.find(item=>item.organization?.id===profile?.default_organization_id)||memberships[0];
  return {profile, memberships, currentOrganization:selected.organization, currentRole:selected.role};
}

export async function createAuthController({root,onAccessGranted=()=>{},onAccessRevoked=()=>{}}) {
  const configured=isSupabaseConfigured();
  let supabase=null;
  let session=null;
  let workspace=null;
  let appStarted=false;

  const snapshot=()=>({configured,session,workspace,appStarted});

  function ensureAccountDialog(){
    if(document.querySelector('#authAccountDialog'))return;
    document.body.insertAdjacentHTML('beforeend',accountDialogMarkup());
    document.querySelector('[data-auth-signout]')?.addEventListener('click',()=>signOut());
  }

  function openAccount(){
    ensureAccountDialog();
    const dialog=document.querySelector('#authAccountDialog');
    dialog.querySelector('[data-auth-account-email]').textContent=session?.user?.email||'Modo local';
    const org=workspace?.currentOrganization;
    dialog.querySelector('[data-auth-account-state]').innerHTML=org
      ? `<strong>${escapeHtml(org.name)}</strong><p>Status: ${escapeHtml(org.status)} · perfil: ${escapeHtml(workspace.currentRole)}</p>`
      : '<strong>Modo local</strong><p>Sem sincronização e sem conta individual.</p>';
    dialog.querySelector('[data-auth-signout]').hidden=!session;
    dialog.showModal();
  }

  async function signOut(){
    if(supabase)await supabase.auth.signOut();
    session=null;workspace=null;appStarted=false;
    onAccessRevoked();
  }

  async function authenticate(kind,email,password){
    const method=kind==='signup'?'signUp':'signInWithPassword';
    const payload={email,password};
    if(kind==='signup')payload.options={emailRedirectTo:SUPABASE_CONFIG.redirectUrl};
    const {data,error}=await supabase.auth[method](payload);
    if(error)throw error;
    if(kind==='signup'&&!data.session)return {pendingConfirmation:true};
    return {pendingConfirmation:false};
  }

  async function signInWithGoogle(){
    const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:SUPABASE_CONFIG.redirectUrl}});
    if(error)throw error;
  }

  function bindAuthScreen(){
    const localButton=root.querySelector('[data-auth-local]');
    if(localButton){
      localButton.addEventListener('click',event=>{
        event.preventDefault();
        appStarted=true;
        onAccessGranted();
      },{once:true});
    }

    root.querySelector('[data-auth-google]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{await signInWithGoogle()}catch(error){showError(error.message)}finally{button.disabled=false}
    });

    root.querySelector('[data-auth-form]')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const form=event.currentTarget;
      if(!form.reportValidity())return;
      const kind=event.submitter?.dataset.authAction||'signin';
      const formData=new FormData(form);
      form.querySelectorAll('button').forEach(button=>button.disabled=true);
      showError('');
      try{
        const result=await authenticate(kind,String(formData.get('email')||'').trim(),String(formData.get('password')||''));
        if(result.pendingConfirmation)root.querySelector('[data-auth-error]').textContent='Conta criada. Confirme o e-mail para entrar.';
      }catch(error){showError(error.message)}finally{form.querySelectorAll('button').forEach(button=>button.disabled=false)}
    });
  }

  function showError(message){
    const target=root.querySelector('[data-auth-error]');
    if(target)target.textContent=message||'';
  }

  async function handleSession(nextSession){
    session=nextSession;
    if(!session){
      workspace=null;
      appStarted=false;
      if(configured){root.innerHTML=authShell();bindAuthScreen()}
      return;
    }
    root.innerHTML='<main class="auth-shell"><section class="auth-card"><p>Preparando seu espaço…</p></section></main>';
    try{
      workspace=await loadWorkspace(supabase,session.user);
      appStarted=true;
      onAccessGranted();
    }catch(error){
      appStarted=false;
      root.innerHTML=authShell(`Não foi possível preparar a conta: ${error.message}`);
      bindAuthScreen();
    }
  }

  document.addEventListener('click',event=>{
    const account=event.target instanceof Element?event.target.closest('[data-account]'):null;
    if(account){event.preventDefault();event.stopPropagation();openAccount()}
  },true);

  if(!configured){
    root.innerHTML=setupShell();
    bindAuthScreen();
    return {configured:false,getState:snapshot,openAccount};
  }

  const module=await import('https://esm.sh/@supabase/supabase-js@2');
  supabase=module.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.publishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });

  const {data}=await supabase.auth.getSession();
  await handleSession(data.session);
  supabase.auth.onAuthStateChange((_event,nextSession)=>{void handleSession(nextSession)});

  return {configured:true,supabase,getState:snapshot,openAccount,signOut};
}
