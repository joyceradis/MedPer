// Documentos operacionais do encargo pericial — modelos de expediente.
//
// Referência de produto: o Laudomatic (laudomatic.com.br), concorrente direto,
// trata a emissão de cartas de aceite, recusa e adiamento como parte do ofício
// do perito, não como algo que se improvisa no editor de texto. Este módulo
// traz esse acerto para o MedPer.
//
// Fronteira: nada aqui é conteúdo médico-pericial. São petições administrativas
// de comunicação com o juízo — aceite, escusa, agendamento, prazo, documentos.
// Cada corpo é um RASCUNHO: a perita revisa, preenche os campos «ASSIM» e
// responde pelo texto final. As bases legais citadas são procedimentais (CPC)
// e ficam declaradas por modelo.

export const OPERATIONAL_LETTERS = Object.freeze([
  Object.freeze({
    id: 'acceptance',
    title: 'Aceite do encargo com proposta de honorários',
    when: 'Nos 5 dias seguintes à intimação da nomeação.',
    basis: 'CPC, art. 465, §2º',
    body: `Excelentíssimo(a) Senhor(a) Doutor(a) Juiz(a) de Direito da «VARA E COMARCA»

Processo nº «NÚMERO DO PROCESSO»

«NOME DA PERITA», médica, CRM «UF-NÚMERO», perita nomeada nos autos em epígrafe, vem, respeitosamente, manifestar a ACEITAÇÃO DO ENCARGO e, nos termos do art. 465, §2º, do CPC, apresentar:

1. Proposta de honorários no valor de R$ «VALOR» («VALOR POR EXTENSO»), considerada a natureza e a complexidade do objeto fixado no despacho de nomeação;
2. Currículo, com comprovação de especialização na matéria (anexo);
3. Contatos profissionais: «E-MAIL» · «TELEFONE».

Termos em que pede deferimento.

«CIDADE», «DATA».

«NOME DA PERITA»
CRM «UF-NÚMERO»`
  }),
  Object.freeze({
    id: 'excuse',
    title: 'Escusa do encargo',
    when: 'Quando houver impedimento, suspeição ou motivo legítimo que impeça de assumir.',
    basis: 'CPC, arts. 157 e 467',
    body: `Excelentíssimo(a) Senhor(a) Doutor(a) Juiz(a) de Direito da «VARA E COMARCA»

Processo nº «NÚMERO DO PROCESSO»

«NOME DA PERITA», médica, CRM «UF-NÚMERO», nomeada perita nos autos em epígrafe, vem, respeitosamente, apresentar ESCUSA DO ENCARGO, com fundamento nos arts. 157 e 467 do CPC, pelo seguinte motivo: «MOTIVO DA ESCUSA».

Requer, assim, seja acolhida a escusa, com a designação de outro profissional para o encargo.

Termos em que pede deferimento.

«CIDADE», «DATA».

«NOME DA PERITA»
CRM «UF-NÚMERO»`
  }),
  Object.freeze({
    id: 'scheduling',
    title: 'Comunicação de data e local do exame',
    when: 'Definidos data, hora e local — as partes precisam ser cientificadas.',
    basis: 'CPC, art. 474',
    body: `Excelentíssimo(a) Senhor(a) Doutor(a) Juiz(a) de Direito da «VARA E COMARCA»

Processo nº «NÚMERO DO PROCESSO»

«NOME DA PERITA», perita nomeada nos autos em epígrafe, vem, respeitosamente, informar que o exame pericial foi designado para o dia «DATA DO EXAME», às «HORA», no seguinte endereço: «LOCAL DO EXAME».

Requer a intimação das partes para ciência, nos termos do art. 474 do CPC. O(a) periciando(a) deverá comparecer com documento de identificação e a documentação médica de que dispuser.

Termos em que pede deferimento.

«CIDADE», «DATA».

«NOME DA PERITA»
CRM «UF-NÚMERO»`
  }),
  Object.freeze({
    id: 'extension',
    title: 'Pedido de prorrogação de prazo',
    when: 'Quando o laudo não puder ser entregue no prazo, por motivo justificado.',
    basis: 'CPC, art. 476',
    body: `Excelentíssimo(a) Senhor(a) Doutor(a) Juiz(a) de Direito da «VARA E COMARCA»

Processo nº «NÚMERO DO PROCESSO»

«NOME DA PERITA», perita nomeada nos autos em epígrafe, vem, respeitosamente, expor que, por motivo justificado — «MOTIVO» —, não será possível apresentar o laudo no prazo fixado.

Requer, assim, a prorrogação do prazo, na forma do art. 476 do CPC.

Termos em que pede deferimento.

«CIDADE», «DATA».

«NOME DA PERITA»
CRM «UF-NÚMERO»`
  }),
  Object.freeze({
    id: 'documents',
    title: 'Solicitação de documentos complementares',
    when: 'Quando falta aos autos peça necessária ao exame — prontuários, imagens, registros.',
    basis: 'CPC, art. 473, §3º',
    body: `Excelentíssimo(a) Senhor(a) Doutor(a) Juiz(a) de Direito da «VARA E COMARCA»

Processo nº «NÚMERO DO PROCESSO»

«NOME DA PERITA», perita nomeada nos autos em epígrafe, vem, respeitosamente, expor que, para a realização do exame pericial, é necessária a seguinte documentação, ainda não constante dos autos: «RELACIONAR OS DOCUMENTOS».

Requer, com fundamento no art. 473, §3º, do CPC, a intimação de «PARTE OU TERCEIRO DETENTOR» para apresentá-la.

Termos em que pede deferimento.

«CIDADE», «DATA».

«NOME DA PERITA»
CRM «UF-NÚMERO»`
  })
]);
