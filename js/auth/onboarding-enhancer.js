function compactHash(value=''){
  let hash=2166136261;
  for(const char of String(value).trim().toLowerCase()){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619)>>>0;
  }
  return hash.toString(36);
}

export function personalWorkspaceIdentity(email=''){
  return {name:'Espaço pessoal',slug:`pessoal-${compactHash(email||'medper')}`.slice(0,80)};
}

export function validatePasswordConfirmation(password='',confirmation=''){
  return String(password)===String(confirmation);
}

export function normalizeFullName(value=''){
  return String(value||'').trim().replace(/\s+/g,' ');
}

function ensurePasswordToggle(input){
  if(!input||input.dataset.passwordToggleReady==='true')return;
  input.dataset.passwordToggleReady='true';
  const field=input.closest('.field');
  field?.classList.add('password-field');
  const button=document.createElement('button');
  button.type='button';
  button.className='password-visibility-toggle';
  button.textContent='Mostrar';
  button.setAttribute('aria-label','Mostrar senha');
  button.addEventListener('click',()=>{
    const showing=input.type==='text';
    input.type=showing?'password':'text';
    button.textContent=showing?'Mostrar':'Ocultar';
    button.setAttribute('aria-label',showing?'Mostrar senha':'Ocultar senha');
    input.focus();
  });
  field?.append(button);
}

function ensureFullNameField(form){
  let input=form.querySelector('[name="fullName"]');
  if(input)return input;
  const email=form.querySelector('[name="email"]');
  if(!email)return null;
  const label=document.createElement('label');
  label.className='field full-name-field';
  label.innerHTML='<span>Nome e sobrenome</span><input name="fullName" type="text" autocomplete="name" maxlength="160" required>';
  email.closest('.field')?.insertAdjacentElement('beforebegin',label);
  return label.querySelector('input');
}

function ensureConfirmationField(form){
  let input=form.querySelector('[name="passwordConfirm"]');
  if(input)return input;
  const password=form.querySelector('[name="password"]');
  if(!password)return null;
  const label=document.createElement('label');
  label.className='field password-confirm-field';
  label.innerHTML='<span>Confirmar senha</span><input name="passwordConfirm" type="password" autocomplete="new-password" minlength="12" required>';
  password.closest('.field')?.insertAdjacentElement('afterend',label);
  input=label.querySelector('input');
  ensurePasswordToggle(input);
  return input;
}

function setError(form,message=''){
  const target=form.querySelector('[data-auth-error]');
  if(target)target.textContent=message;
}

function enterSignupMode(form){
  if(!form)return;
  form.dataset.onboardingMode='signup';
  const shell=form.closest('.auth-card');
  const title=shell?.querySelector('#authTitle');
  const copy=shell?.querySelector('.auth-copy p');
  if(title)title.textContent='Crie sua conta';
  if(copy)copy.textContent='Seu perfil profissional será configurado depois, já dentro do MedPer.';
  form.querySelector('[data-api-signup-fields]')?.setAttribute('hidden','');
  const signin=form.querySelector('[data-auth-action="signin"]');
  if(signin)signin.hidden=true;
  const toggle=form.querySelector('[data-api-signup-toggle]');
  if(toggle)toggle.hidden=true;
  const submit=form.querySelector('[data-api-signup-submit]');
  if(submit){
    submit.hidden=false;
    submit.textContent='Criar conta';
    submit.classList.remove('button-secondary');
    submit.classList.add('button-primary','button-create-account');
  }
  ensureFullNameField(form);
  ensureConfirmationField(form);
  let back=form.querySelector('[data-onboarding-signin]');
  if(!back){
    back=document.createElement('button');
    back.type='button';
    back.className='button button-secondary button-back-signin';
    back.dataset.onboardingSignin='';
    back.textContent='Já tenho conta';
    form.querySelector('.auth-actions')?.append(back);
  }
  back.hidden=false;
  setError(form,'');
}

function enterSigninMode(form){
  if(!form)return;
  delete form.dataset.onboardingMode;
  const shell=form.closest('.auth-card');
  const title=shell?.querySelector('#authTitle');
  const copy=shell?.querySelector('.auth-copy p');
  if(title)title.textContent='Entre na sua conta';
  if(copy)copy.textContent='Acesse seus casos e continue seu trabalho com segurança.';
  form.querySelector('[data-auth-action="signin"]')?.removeAttribute('hidden');
  form.querySelector('[data-api-signup-toggle]')?.removeAttribute('hidden');
  const submit=form.querySelector('[data-api-signup-submit]');
  if(submit)submit.hidden=true;
  form.querySelector('.full-name-field')?.remove();
  form.querySelector('.password-confirm-field')?.remove();
  const back=form.querySelector('[data-onboarding-signin]');
  if(back)back.hidden=true;
  setError(form,'');
}

function enhanceForm(form){
  if(!form)return;
  form.querySelector('[data-api-signup-fields]')?.setAttribute('hidden','');
  const password=form.querySelector('[name="password"]');
  ensurePasswordToggle(password);
  const toggle=form.querySelector('[data-api-signup-toggle]');
  if(toggle){
    toggle.textContent='Criar minha conta';
    toggle.classList.add('button-create-account-secondary');
  }
}

export function installOnboardingEnhancer(doc=document){
  const enhance=()=>doc.querySelectorAll('[data-auth-form]').forEach(enhanceForm);

  doc.addEventListener('focusin',event=>{
    const form=event.target?.closest?.('[data-auth-form]');
    if(form)enhanceForm(form);
  },true);

  doc.addEventListener('click',event=>{
    const signup=event.target?.closest?.('[data-api-signup-toggle]');
    if(signup){
      event.preventDefault();
      event.stopImmediatePropagation();
      enterSignupMode(signup.closest('[data-auth-form]'));
      return;
    }
    const signin=event.target?.closest?.('[data-onboarding-signin]');
    if(signin){
      event.preventDefault();
      event.stopImmediatePropagation();
      enterSigninMode(signin.closest('[data-auth-form]'));
    }
  },true);

  doc.addEventListener('submit',event=>{
    const form=event.target?.closest?.('[data-auth-form]');
    if(!form||event.submitter?.dataset.authAction!=='signup')return;
    const fullName=normalizeFullName(ensureFullNameField(form)?.value||'');
    if(!fullName){
      event.preventDefault();
      event.stopImmediatePropagation();
      setError(form,'Informe seu nome e sobrenome.');
      return;
    }
    form.querySelector('[name="fullName"]').value=fullName;
    const password=form.querySelector('[name="password"]')?.value||'';
    const confirmation=ensureConfirmationField(form)?.value||'';
    if(!validatePasswordConfirmation(password,confirmation)){
      event.preventDefault();
      event.stopImmediatePropagation();
      setError(form,'As senhas precisam ser iguais.');
      return;
    }
    const email=form.querySelector('[name="email"]')?.value||'';
    const workspace=personalWorkspaceIdentity(email);
    const organizationName=form.querySelector('[name="organizationName"]');
    const organizationSlug=form.querySelector('[name="organizationSlug"]');
    if(organizationName)organizationName.value=fullName;
    if(organizationSlug)organizationSlug.value=workspace.slug;
  },true);

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',enhance,{once:true});
  else enhance();
  globalThis.addEventListener?.('load',enhance,{once:true});
}

if(typeof document!=='undefined')installOnboardingEnhancer(document);
