// Encargo pericial — o que acontece antes de existir um caso.
//
// O ciclo do produto começava tarde: a perícia nascia já aceita, no momento em
// que a perita criava o caso. Na prática o encargo começa antes disso — o juízo
// nomeia, ela toma ciência, decide aceitar ou escusar, e só então há trabalho.
// Nada disso ficava registrado, e por isso "assiste desde a nomeação" era
// promessa de venda sem lastro.
//
// Este módulo é declarativo, no mesmo idioma de `protocols.js` e `checklists.js`:
// constantes congeladas, funções puras, sem estado e sem import de `store.js`.
//
// **Fronteira deliberada.** Este módulo REGISTRA o que a perita declara; não
// deduz prazo processual. O prazo de escusa nasce da ciência e é contado segundo
// regra do CPC cuja aplicação depende do caso concreto — forma de intimação,
// contagem em dias úteis, suspensões. Calcular isso seria o sistema afirmando
// sobre o processo algo que não tem como saber. O que ele faz é oferecer a
// referência legal ao lado do campo, para que ela conte e confirme.

export const APPOINTMENT_STATUS = Object.freeze({
  pending: Object.freeze({
    id: 'pending',
    label: 'Aguardando decisão',
    hint: 'Nomeação registrada; aceite ou escusa ainda não declarados.'
  }),
  accepted: Object.freeze({
    id: 'accepted',
    label: 'Encargo aceito',
    hint: 'A perita assumiu o encargo.'
  }),
  declined: Object.freeze({
    id: 'declined',
    label: 'Encargo escusado',
    hint: 'A perita apresentou escusa; o trabalho pericial não segue.'
  })
});

export const APPOINTMENT_STATUS_IDS = Object.freeze(Object.keys(APPOINTMENT_STATUS));

// Regime de remuneração. Muda a operação da perita — quando e quanto recebe —,
// não o método pericial. Fica no encargo, não no contexto metodológico.
export const FEE_REGIMES = Object.freeze([
  Object.freeze({ id: 'ajg', label: 'AJG', hint: 'Assistência judiciária gratuita; honorários pelo Estado ao final.' }),
  Object.freeze({ id: 'private', label: 'Honorários particulares', hint: 'Adiantados pela parte, conforme decisão do juízo.' }),
  Object.freeze({ id: 'public_body', label: 'Órgão público', hint: 'Autarquia, INSS ou convênio.' }),
  Object.freeze({ id: 'undefined', label: 'A definir', hint: 'Ainda não arbitrado.' })
]);

// Referência legal exibida junto do campo de prazo. É citação, não cálculo: o
// sistema mostra a regra e a perita conta o prazo do caso dela.
export const APPOINTMENT_REFERENCES = Object.freeze([
  Object.freeze({
    field: 'excuseDueAt',
    label: 'Prazo para escusa',
    basis: 'CPC, art. 157, §1º',
    note: 'O perito escusa-se em 15 dias da intimação, contados na forma da lei processual. Confira a contagem do seu caso.'
  }),
  Object.freeze({
    field: 'reportDueAt',
    label: 'Entrega do laudo',
    basis: 'CPC, art. 477',
    note: 'O laudo é protocolado ao menos 20 dias antes da audiência de instrução e julgamento, quando houver.'
  })
]);

const texto = value => (typeof value === 'string' ? value.trim() : '');

export function normalizeAppointment(input = {}) {
  const bruto = input && typeof input === 'object' ? input : {};
  const status = APPOINTMENT_STATUS[bruto.status] ? bruto.status : 'pending';
  const regime = FEE_REGIMES.some(r => r.id === bruto.feeRegimeId) ? bruto.feeRegimeId : '';
  return {
    status,
    // Data em que a perita tomou ciência da nomeação. É dela o registro; o
    // sistema não a infere de nada.
    noticedAt: texto(bruto.noticedAt),
    decidedAt: texto(bruto.decidedAt),
    feeRegimeId: regime,
    // Valor proposto, como texto: moeda, forma e parcelamento variam, e converter
    // para número aqui obrigaria a escolher um formato que a peça não usa.
    proposedFee: texto(bruto.proposedFee),
    // Motivo da escusa, quando houver. Registro da perita, nunca preenchido pelo
    // sistema.
    declineReason: texto(bruto.declineReason),
    notes: texto(bruto.notes)
  };
}

export function appointmentStatusOf(caseData = {}) {
  const encargo = normalizeAppointment(caseData.appointment);
  return APPOINTMENT_STATUS[encargo.status];
}

// O trabalho pericial só faz sentido depois do aceite. Antes disso a perita
// ainda pode escusar-se, e depois da escusa não há o que periciar.
export function isEngagementActive(caseData = {}) {
  return normalizeAppointment(caseData.appointment).status === 'accepted';
}

/**
 * O que ainda falta declarar no encargo.
 *
 * Devolve pendências, não bloqueios: um caso com encargo incompleto continua
 * abrindo e sendo trabalhado. A tela informa; não impede.
 */
export function appointmentGaps(caseData = {}) {
  const encargo = normalizeAppointment(caseData.appointment);
  const faltas = [];
  if (!encargo.noticedAt) faltas.push('Data da ciência da nomeação');
  if (encargo.status === 'pending') faltas.push('Aceite ou escusa do encargo');
  if (encargo.status === 'accepted' && !encargo.feeRegimeId) faltas.push('Regime de honorários');
  if (encargo.status === 'declined' && !encargo.declineReason) faltas.push('Motivo da escusa');
  return faltas;
}

// A carta correspondente ao estado do encargo, para que a peça esteja onde a
// decisão é tomada em vez de numa aba separada. Os textos vivem em `letters.js`.
export function letterIdForStatus(status) {
  if (status === 'accepted') return 'acceptance';
  if (status === 'declined') return 'excuse';
  return '';
}
