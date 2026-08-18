import { SUPABASE_CONFIG, isSupabaseConfigured } from '../config/supabase-config.js';
import { API_CONFIG, isApiConfigured } from '../config/api-config.js';
import { createApiAuthClient } from '../api/auth-client.js';
import { createApiSessionStore } from './api-session.js';

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
          <label class="field"><span>Senha</span><input name="password" type="password" autocomplete="current-password" minlength="12" required></label>
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

function apiAuthShell(message='') {
  return `
    <main class="auth-shell" id="authShell">
      <section class="auth-card" aria-labelledby="authTitle">
        ${brandMarkup('Perícia estruturada')}
        <div class="auth-copy">
          <span class="eyebrow">Acesso profissional</span>
          <h1 id="authTitle">Entre na sua conta</h1>
          <p>Autenticação e sincronização protegidas pela API MedPer.</p>
        </div>
        ${message?`<p class="auth-message" role="status">${escapeHtml(message)}</p>`:''}
        <form class="auth-form" data-auth-form novalidate>
          <label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required></label>
          <label class="field"><span>Senha</span><input name="password" type="password" autocomplete="current-password" minlength="12" required></label>
          <div data-api-signup-fields hidden>
            <label class="field"><span>Nome da organização / espaço profissional</span><input name="organizationName" type="text" autocomplete="organization"></label>
            <label class="field"><span>Identificador da organização</span><input name="organizationSlug" type="text" inputmode="url" placeholder="ex.: clinica-radis"></label>
          </div>
          <div class="auth-actions">
            <button class="button button-primary" type="submit" data-auth-action="signin">Entrar</button>
            <button class="button button-secondary" type="button" data-api-signup-toggle>Criar conta</button>
            <button class="button button-secondary" type="submit" data-auth-action="signup" data-api-signup-submit hidden>Criar e entrar</button>
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

function slugify(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
}

async function createFastApiAuthController({root,onAccessGranted,onAccessRevoked}){
  const client=createApiAuthClient({baseUrl:API_CONFIG.baseUrl});
  const sessions=createApiSessionStore();
  let session=sessions.get();
  let appStarted=false;

  const snapshot=()=>({
    configured:true,
    provider:'api',
    session:session?{user:{email:session.email||''}}:null,
    workspace:session?.organizationName?{currentOrganization:{name:session.organizationName},currentRole:'member'}:null,
    appStarted
  });

  function ensureAccountDialog(){
    if(document.querySelector('#authAccountDialog'))return;
    document.body.insertAdjacentHTML('beforeend',accountDialogMarkup());
    document.querySelector('[data-auth-signout]')?.addEventListener('click',()=>signOut());
  }

  function openAccount(){
    ensureAccountDialog();
    const dialog=document.querySelector('#authAccountDialog');
    dialog.querySelector('[data-auth-account-email]').textContent=session?.email||'Conta MedPer';
    dialog.querySelector('[data-auth-account-state]').innerHTML=session?.organizationName
      ? `<strong>${escapeHtml(session.organizationName)}</strong><p>Sincronização remota ativa.</p>`
      : '<strong>Conta MedPer</strong><p>Sincronização remota ativa.</p>';
    dialog.querySelector('[data-auth-signout]').hidden=false;
    dialog.showModal();
  }

  async function signOut(){
    const refreshToken=sessions.getRefreshToken();
    try{if(refreshToken)await client.logout(refreshToken);}catch{}
    sessions.clear();
    session=null;
    appStarted=false;
    onAccessRevoked();
  }

  const grant=(pair,metadata={})=>{
    session=sessions.set({...pair,...metadata});
    appStarted=true;
    onAccessGranted();
  };

  function render(message=''){
    root.innerHTML=apiAuthShell(message);
    const form=root.querySelector('[data-auth-form]');
    const signupFields=root.querySelector('[data-api-signup-fields]');
    const signupSubmit=root.querySelector('[data-api-signup-submit]');
    const signupToggle=root.querySelector('[data-api-signup-toggle]');

    signupToggle?.addEventListener('click',()=>{
      signupFields.hidden=false;
      signupSubmit.hidden=false;
      signupToggle.hidden=true;
      form.querySelector('[name="organizationName"]').required=true;
    });

    form?.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!form.reportValidity())return;
      const kind=event.submitter?.dataset.authAction||'signin';
      const data=new FormData(form);
      const email=String(data.get('email')||'').trim();
      const password=String(data.get('password')||'');
      form.querySelectorAll('button').forEach(button=>button.disabled=true);
      const errorTarget=form.querySelector('[data-auth-error]');
      if(errorTarget)errorTarget.textContent='';
      try{
        if(kind==='signup'){
          const organizationName=String(data.get('organizationName')||'').trim();
          const organizationSlug=slugify(String(data.get('organizationSlug')||'').trim()||organizationName);
          if(!organizationName||!organizationSlug)throw new Error('Informe o nome da organização ou espaço profissional.');
          const pair=await client.register({organizationName,organizationSlug,email,password});
          grant(pair,{email,organizationName,organizationSlug});
        }else{
          const pair=await client.signIn(email,password);
          grant(pair,{email});
        }
      }catch(error){
        if(errorTarget)errorTarget.textContent=error.message||'Não foi possível entrar.';
      }finally{
        form.querySelectorAll('button').forEach(button=>button.disabled=false);
      }
    });
  }

  if(session?.refresh_token){
    try{
      const refreshed=await client.refresh(session.refresh_token);
      session=sessions.set({...refreshed,email:session.email||'',organizationName:session.organizationName||'',organizationSlug:session.organizationSlug||''});
      appStarted=true;
    }catch{
      sessions.clear();
      session=null;
    }
  }

  if(!appStarted)render();

  return {
    configured:true,
    provider:'api',
    getState:snapshot,
    getAccessToken:()=>sessions.getAccessToken(),
    openAccount,
    signOut
  };
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
  if(isApiConfigured())return createFastApiAuthController({root,onAccessGranted,onAccessRevoked});

  const configured=isSupabaseConfigured();
  let supabase=null;
  let session=null;
  let workspace=null;
  let appStarted=false;

  const snapshot=()=>({configured,provider:configured?'supabase':'local',session,workspace,appStarted});

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
    return {configured:false,provider:'local',getState:snapshot,getAccessToken:()=>'',openAccount};
  }

  const module=await import('https://esm.sh/@supabase/supabase-js@2');
  supabase=module.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.publishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });

  const {data}=await supabase.auth.getSession();
  await handleSession(data.session);
  supabase.auth.onAuthStateChange((_event,nextSession)=>{void handleSession(nextSession)});

  return {configured:true,provider:'supabase',supabase,getState:snapshot,getAccessToken:()=>session?.access_token||'',openAccount,signOut};
}
