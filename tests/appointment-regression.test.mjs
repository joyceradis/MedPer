import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  APPOINTMENT_REFERENCES, APPOINTMENT_STATUS, FEE_REGIMES,
  appointmentGaps, appointmentStatusOf, isEngagementActive,
  letterIdForStatus, normalizeAppointment
} from '../js/models/appointment.js';
import { normalizeCase } from '../js/core/store.js';
import { renderCaseSurface } from '../js/ui/app.js';

function test(name, fn){
  try{ fn(); console.log(`✓ ${name}`); }catch(error){ console.error(`✗ ${name}`); throw error; }
}

test('um caso legado abre com o encargo pendente, nunca presumido aceito', () => {
  // Presumir aceite seria o sistema afirmando sobre o processo algo que ninguém
  // declarou — e o aceite tem consequência: depois dele não cabe mais escusa.
  const legado = normalizeCase({ id: 'c1', title: 'Caso antigo' });
  assert.equal(legado.appointment.status, 'pending');
  assert.equal(legado.appointment.noticedAt, '');
  assert.equal(isEngagementActive(legado), false);
});

test('o encargo declarado sobrevive à normalização e valor inválido não passa', () => {
  const c = normalizeCase({
    id: 'c2', title: 'Caso',
    appointment: { status: 'accepted', noticedAt: '2026-08-10', feeRegimeId: 'ajg', proposedFee: 'R$ 1.500,00' }
  });
  assert.equal(c.appointment.status, 'accepted');
  assert.equal(c.appointment.feeRegimeId, 'ajg');
  assert.equal(c.appointment.proposedFee, 'R$ 1.500,00');
  assert.equal(isEngagementActive(c), true);

  const invalido = normalizeAppointment({ status: 'inventado', feeRegimeId: 'inexistente' });
  assert.equal(invalido.status, 'pending', 'estado desconhecido volta a pendente');
  assert.equal(invalido.feeRegimeId, '', 'regime inexistente não é aceito');
  assert.deepEqual(normalizeAppointment(null), normalizeAppointment({}));
  assert.deepEqual(normalizeAppointment('texto'), normalizeAppointment({}));
});

test('as pendências do encargo informam sem bloquear', () => {
  assert.deepEqual(
    appointmentGaps({ appointment: {} }),
    ['Data da ciência da nomeação', 'Aceite ou escusa do encargo']
  );
  assert.deepEqual(
    appointmentGaps({ appointment: { status: 'accepted', noticedAt: '2026-08-10' } }),
    ['Regime de honorários']
  );
  assert.deepEqual(
    appointmentGaps({ appointment: { status: 'declined', noticedAt: '2026-08-10' } }),
    ['Motivo da escusa']
  );
  assert.deepEqual(
    appointmentGaps({ appointment: { status: 'accepted', noticedAt: '2026-08-10', feeRegimeId: 'ajg' } }),
    [], 'encargo completo não tem pendência'
  );
});

test('o módulo registra o encargo e nunca calcula prazo processual', () => {
  // Fronteira deliberada: contar o prazo de escusa depende da forma da intimação
  // e do rito do caso. O sistema cita a regra e a perita conta.
  const fonte = fs.readFileSync(new URL('../js/models/appointment.js', import.meta.url), 'utf8');
  assert.doesNotMatch(fonte, /setDate|addDays|\+\s*15|86400000|Date\.now/,
    'nenhuma aritmética de data — o módulo não deduz prazo');

  const referencias = APPOINTMENT_REFERENCES.map(r => r.basis);
  assert.ok(referencias.includes('CPC, art. 157, §1º'), 'a base da escusa é citada');
  assert.ok(referencias.includes('CPC, art. 477'), 'a base da entrega do laudo é citada');
  for (const ref of APPOINTMENT_REFERENCES) {
    assert.ok(ref.note && ref.label, `${ref.field} traz rótulo e nota`);
  }
});

test('a carta corresponde à decisão tomada', () => {
  assert.equal(letterIdForStatus('accepted'), 'acceptance');
  assert.equal(letterIdForStatus('declined'), 'excuse');
  assert.equal(letterIdForStatus('pending'), '');
  assert.equal(appointmentStatusOf({ appointment: { status: 'declined' } }).label, 'Encargo escusado');
  assert.equal(APPOINTMENT_STATUS.pending.label, 'Aguardando decisão');
  assert.ok(FEE_REGIMES.some(r => r.id === 'ajg'), 'AJG é regime de primeira classe');
});

test('a Delimitação mostra o encargo, e ele se recolhe quando resolvido', () => {
  const pendente = normalizeCase({ id: 'c3', title: 'Novo', scope: '' });
  const htmlPendente = renderCaseSurface(pendente, 'delimitation');
  assert.match(htmlPendente, /Encargo pericial/, 'com decisão pendente o painel se declara');
  assert.match(htmlPendente, /appointment\.status/, 'a decisão é registrável');
  assert.match(htmlPendente, /appointment\.noticedAt/);
  assert.match(htmlPendente, /Falta declarar/, 'as pendências aparecem');
  assert.match(htmlPendente, /CPC, art\. 157/, 'a referência de prazo fica ao lado');
  assert.doesNotMatch(htmlPendente, /is-settled/);

  const resolvido = normalizeCase({
    id: 'c4', title: 'Aceito',
    appointment: { status: 'accepted', noticedAt: '2026-08-10', feeRegimeId: 'ajg' }
  });
  const htmlResolvido = renderCaseSurface(resolvido, 'delimitation');
  assert.match(htmlResolvido, /is-settled/, 'encargo resolvido vira uma linha');
  assert.doesNotMatch(htmlResolvido, /Falta declarar/);

  // O objeto pericial continua sendo o trabalho da etapa, não some.
  assert.match(htmlPendente, /Objeto pericial/);
  assert.match(htmlResolvido, /Objeto pericial/);
});

test('o motivo da escusa só é pedido quando há escusa', () => {
  const aceito = normalizeCase({ id: 'c5', title: 'A', appointment: { status: 'accepted' } });
  assert.doesNotMatch(renderCaseSurface(aceito, 'delimitation'), /Motivo da escusa/);

  const escusado = normalizeCase({ id: 'c6', title: 'B', appointment: { status: 'declined' } });
  assert.match(renderCaseSurface(escusado, 'delimitation'), /Motivo da escusa/);
});

console.log('Appointment regression suite completed successfully.');
