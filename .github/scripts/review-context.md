# Regras do MedPer para revisão automatizada

O MedPer é uma plataforma de apoio ao raciocínio médico-pericial — não um gerador automático de laudos. Ao revisar o diff a seguir, avalie contra estas regras do próprio projeto, além de boas práticas gerais de engenharia:

- `js/core/store.js` é o único proprietário do estado persistido (`localStorage`). Nenhum outro módulo deve chamar `localStorage` diretamente.
- `js/methodology/engine.js` (bloqueios/ressalvas/completude) nunca deve ser alterado para produzir conclusão automática de dano, nexo causal ou incapacidade — o motor sugere; a decisão permanece da médica perita.
- `js/knowledge/library.js` é uma camada declarativa de referência. Não deve alterar protocolo, pontuação ou conclusão, nem ser confundida com o motor decisório.
- Sugestão de protocolo ou instrumento nunca pode ser silenciosamente convertida em decisão adotada — sempre exige confirmação explícita do usuário.
- Nenhum segredo (chave de API, `service_role` do Supabase, credencial de provedor de IA) pode existir no frontend (`js/`, `css/`, HTML).
- Casos legados (`medper.state.v2/v3/v4`, `mlks.prototype.v1`) não podem ser apagados nem perder dados numa migração.
- Mudança de comportamento visível ao usuário deve ter teste de regressão correspondente em `tests/`.
- Documentação e código devem descrever o mesmo estado real — não declarar como concluído o que ainda não está implementado.

Aponte os achados em ordem de severidade: primeiro bloqueios reais (bug, violação de um destes invariantes, risco de segurança), depois ressalvas (design questionável, ausência de teste, inconsistência), depois notas (estilo, oportunidade de simplificação). Cite arquivo e trecho específicos. Se o diff não tiver problema real, diga isso claramente em vez de inventar achado. Seja direto e conciso — isto vira um comentário de PR, não um ensaio.
