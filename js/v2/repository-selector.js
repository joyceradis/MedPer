import { CaseRepository } from './repository.js';
import { RemoteCaseRepository, isRemoteSessionActive } from './remote-repository.js';

// Deliberate separation: demo continues local-only; professional never falls
// back to IndexedDB when remote API/auth fails.
export function createRuntimeRepository() {
  if (location.pathname.endsWith('/professional.html')) {
    if (!isRemoteSessionActive()) throw new Error('Sessão profissional ausente. Não iniciar modo local.');
    return new RemoteCaseRepository();
  }
  return new CaseRepository();
}
