import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCaseFilesClient } from '../js/api/case-files-client.js';
import { buildFilesMarkup, formatSize } from '../js/ui/case-files-controller.js';

// ---------------------------------------------------------------- cliente

const chamadas=[];
const respostaJson=(status,corpo)=>({ok:status<400,status,json:async()=>corpo,blob:async()=>corpo});

const fetchFalso=async(url,options={})=>{
  chamadas.push({url,options});
  const alvo=String(url);
  if(alvo.endsWith('/cases/caso-1/files')&&(!options.method||options.method==='GET')){
    return respostaJson(200,[{id:'f1',name:'prontuario.pdf',contentType:'application/pdf',size:2048}]);
  }
  if(alvo.endsWith('/cases/caso-1/files')&&options.method==='POST'){
    return respostaJson(201,{id:'f2',name:'laudo.pdf'});
  }
  if(alvo.endsWith('/cases/caso-1/files/f1')){
    return {ok:true,status:200,blob:async()=>'conteudo-decifrado'};
  }
  if(alvo.endsWith('/cases/caso-1/files/recusado')){
    return respostaJson(415,{detail:'Arquivo de imagem (JPEG) não é aceito nesta fase. Documento digitalizado deve ser convertido em PDF antes de anexar.'});
  }
  throw new Error(`requisição inesperada: ${alvo}`);
};

const client=createCaseFilesClient({baseUrl:'https://api.medper.test',getAccessToken:()=>'token-123',fetchImpl:fetchFalso});

const lista=await client.list('caso-1');
assert.equal(lista[0].name,'prontuario.pdf');
assert.equal(chamadas[0].options.headers.Authorization,'Bearer token-123','a listagem vai autenticada');

const enviado=await client.upload('caso-1',new File([new Uint8Array([37,80,68,70])],'laudo.pdf',{type:'application/pdf'}));
assert.equal(enviado.id,'f2');
const envio=chamadas[1].options;
assert.equal(envio.method,'POST');
assert.ok(envio.body instanceof FormData,'o corpo é multipart');
assert.equal(envio.body.get('upload').name,'laudo.pdf');
// Declarar `Content-Type` à mão apaga o boundary gerado pelo FormData e o
// servidor não consegue mais separar as partes do corpo.
assert.equal(envio.headers['Content-Type'],undefined,'o boundary do multipart é do navegador');

const blob=await client.download('caso-1','f1');
assert.equal(blob,'conteudo-decifrado');

// A mensagem de recusa do servidor é o que a perita tem para agir. Trocá-la por
// "HTTP 415" transformaria uma instrução ("converta em PDF") num código.
await assert.rejects(
  ()=>client.download('caso-1','recusado'),
  error=>{
    assert.equal(error.status,415);
    assert.match(error.message,/convertido em PDF/);
    assert.match(error.message,/JPEG/);
    return true;
  }
);

const desligado=createCaseFilesClient({baseUrl:'',getAccessToken:()=>'',fetchImpl:fetchFalso});
assert.equal(desligado.enabled,false,'sem baseUrl o cliente não finge estar disponível');
await assert.rejects(()=>desligado.list('caso-1'),/conexão com o servidor MedPer/);

const semSessao=createCaseFilesClient({baseUrl:'https://api.medper.test',getAccessToken:()=>'',fetchImpl:fetchFalso});
await assert.rejects(()=>semSessao.list('caso-1'),/Sessão remota indisponível/);

// ---------------------------------------------------------------- marcação

assert.equal(formatSize(512),'512 B');
assert.equal(formatSize(2048),'2 KB');
assert.equal(formatSize(3*1024*1024),'3.0 MB');

const vazio=buildFilesMarkup({status:'ready',files:[]});
assert.match(vazio,/Nenhum documento dos autos anexado/);
assert.match(vazio,/data-case-file-input/,'o campo de anexo existe mesmo sem documentos');

const preenchido=buildFilesMarkup({status:'ready',files:[{id:'f1',name:'prontuario.pdf',contentType:'application/pdf',size:2048}]});
assert.match(preenchido,/prontuario\.pdf/);
assert.match(preenchido,/PDF · 2 KB/);
assert.match(preenchido,/data-case-file-download="f1"/);

// O aviso do que não entra fica ao lado do botão, antes do envio — não como
// mensagem de erro depois de a perita já ter tentado anexar a fotografia.
assert.match(vazio,/fotografia não entra nesta fase/i);

const comErro=buildFilesMarkup({status:'ready',files:[],refusals:['lesao.jpg: Arquivo de imagem (JPEG) não é aceito nesta fase.']});
assert.match(comErro,/lesao\.jpg/,'a recusa nomeia o arquivo');
assert.match(comErro,/notice-danger/);

// Num lote misto a tela precisa mostrar as duas coisas: o que entrou e o que foi
// recusado. Só a lista, e a perita conclui que a fotografia entrou; só a recusa,
// e ela conclui que o lote inteiro falhou.
const misto=buildFilesMarkup({status:'ready',files:[{id:'f1',name:'prontuario.pdf',contentType:'application/pdf',size:2048}],refusals:['lesao.jpg: Arquivo de imagem (JPEG) não é aceito nesta fase.']});
assert.match(misto,/prontuario\.pdf/);
assert.match(misto,/lesao\.jpg/);

// A recusa e a falha de listagem NÃO podem dividir o mesmo campo. A releitura da
// lista roda logo depois de cada envio; enquanto as duas eram o mesmo `error`,
// ela zerava a recusa antes de a perita ler — escolher uma fotografia não
// produzia efeito visível nenhum na tela, nem sucesso nem recusa.
const controladorFonte=fs.readFileSync(new URL('../js/ui/case-files-controller.js',import.meta.url),'utf8');
assert.match(controladorFonte,/refusals:anterior\.refusals/,
  'a releitura da lista tem de preservar a recusa do envio anterior');

const enviando=buildFilesMarkup({status:'ready',files:[],busy:true});
assert.match(enviando,/Enviando…/);
assert.match(enviando,/disabled/,'não dá para disparar um segundo envio por cima do primeiro');

// Escape: nome de arquivo vem de fora e é exibido como texto, nunca como marcação.
const hostil=buildFilesMarkup({status:'ready',files:[{id:'x','name':'<img src=x onerror=alert(1)>.pdf',contentType:'application/pdf',size:10}]});
assert.ok(!hostil.includes('<img src=x'),'o nome do arquivo é escapado');
assert.match(hostil,/&lt;img/);

// ------------------------------------------------- fronteira de privacidade

// Nome de arquivo reidentifica ("prontuario-maria-silva.pdf"). O store é
// persistido em localStorage, então a lista NÃO pode passar por ele — se passar,
// o dado que a cifragem no servidor protege fica em claro no disco do aparelho.
const controlador=fs.readFileSync(new URL('../js/ui/case-files-controller.js',import.meta.url),'utf8')
  .replace(/^\s*\/\/.*$/gm,'');  // o comentário explica a regra; quem a viola é o código
assert.ok(!/store\.update|setPath|localStorage|sessionStorage/.test(controlador),
  'o controlador de documentos não pode gravar nome de arquivo no store nem no armazenamento local');

// E a etapa precisa continuar dizendo a verdade em modo local, sem oferecer um
// botão de anexar que não anexaria.
const app=fs.readFileSync(new URL('../js/ui/app.js',import.meta.url),'utf8');
assert.match(app,/data-case-files/,'a etapa de autos monta o ponto de ancoragem');
assert.match(app,/exige conexão com o servidor MedPer/,'sem servidor, a etapa explica por quê');

// ------------------------------------------------- id local x id remoto
//
// O caso nasce com um id gerado no navegador e só ganha o id do servidor quando
// sincroniza — `sync.remoteCaseId`. São valores diferentes. Enquanto o ponto de
// montagem publicava `c.id`, toda requisição de anexo ia para uma perícia que o
// servidor não conhece: 404 em TODO caso criado pela interface. O defeito não
// aparecia em teste que semeasse o mesmo id dos dois lados.
const montagem=app.match(/function caseFilesMount\(c\)\{[^\n]*/)[0];
assert.match(montagem,/data-case-id="\$\{esc\(c\.sync\?\.remoteCaseId\|\|''\)\}"/,
  'o ponto de montagem publica o id do servidor, nunca o id local');
assert.ok(!/data-case-id="\$\{esc\(c\.id\)\}"/.test(montagem),
  'o id local não pode ser publicado como id de caso do servidor');

// E o controlador não pode inventar um id quando o remoto falta.
assert.ok(!/location\.hash/.test(controladorFonte),
  'sem id remoto, o controlador não deduz outro id da URL');

const naoSincronizado=buildFilesMarkup({synced:false});
assert.match(naoSincronizado,/ainda não está no servidor/);
assert.ok(!naoSincronizado.includes('data-case-file-input'),
  'perícia não sincronizada não oferece botão que resultaria em 404');

console.log('Case files regression suite completed successfully.');
