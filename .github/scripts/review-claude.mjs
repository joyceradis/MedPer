import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT_DIR = 'ai-review-out';
const INPUT_DIR = process.env.AI_REVIEW_INPUT_DIR || 'ai-review-input';
const EFFORT_BUDGETS = Object.freeze({ low: 2000, medium: 4000, high: 6000 });

mkdirSync(OUT_DIR, { recursive: true });
const outPath = `${OUT_DIR}/claude-findings.md`;
const write = text => writeFileSync(outPath, text, 'utf8');

try {
  const diff = readFileSync(`${INPUT_DIR}/diff.review.txt`, 'utf8');
  const context = readFileSync(`${INPUT_DIR}/review-context.md`, 'utf8');
  const meta = JSON.parse(readFileSync(`${INPUT_DIR}/meta.json`, 'utf8'));
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_REVIEW_MODEL || 'claude-opus-5';
  const effort = process.env.CLAUDE_REVIEW_EFFORT || 'high';
  const thinkingBudget = Number(
    process.env.CLAUDE_THINKING_BUDGET_TOKENS || EFFORT_BUDGETS[effort] || EFFORT_BUDGETS.high
  );
  const maxTokens = Number(process.env.CLAUDE_MAX_TOKENS || 10000);

  if (meta.skip_ai) {
    write(`_Revisão do Claude não executada: ${meta.skip_reason || 'entrada marcada para skip'}._`);
    process.exit(0);
  }
  if (!apiKey) {
    write('_`ANTHROPIC_API_KEY` não está configurada como secret do repositório — revisão do Claude não executada. Adicione o secret em Settings → Secrets and variables → Actions._');
    process.exit(0);
  }
  if (!diff.trim()) {
    write('_Nenhuma alteração de código detectada neste diff._');
    process.exit(0);
  }
  if (!Number.isInteger(thinkingBudget) || thinkingBudget < 1024) {
    throw new Error('CLAUDE_THINKING_BUDGET_TOKENS must be an integer >= 1024');
  }
  if (!Number.isInteger(maxTokens) || maxTokens <= thinkingBudget) {
    throw new Error('CLAUDE_MAX_TOKENS must be an integer greater than the thinking budget');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      thinking: {
        type: 'enabled',
        budget_tokens: thinkingBudget
      },
      system: context,
      messages: [
        {
          role: 'user',
          content: `Revise este diff do repositório MedPer. A entrada foi preparada uma única vez e é idêntica à enviada ao GPT.${meta.truncated ? ` ATENÇÃO: o diff original tinha ${meta.original_bytes} bytes e esta entrada foi truncada para ${meta.review_bytes} bytes.` : ''}\n\n\`\`\`diff\n${diff}\n\`\`\``
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    write(`_Falha ao chamar a API da Anthropic (HTTP ${response.status}, modelo \`${model}\`): ${body.slice(0, 500)}_`);
    process.exit(0);
  }

  const data = await response.json();
  const stopReason = data.stop_reason || 'unknown';
  const text = Array.isArray(data.content)
    ? data.content
        .filter(block => block?.type === 'text' && typeof block.text === 'string')
        .map(block => block.text.trim())
        .filter(Boolean)
        .join('\n\n')
    : '';

  if (stopReason === 'refusal') {
    write(`_Claude recusou a revisão (modelo \`${model}\`, stop_reason=\`refusal\`). Nenhum achado deve ser inferido desta execução._`);
    process.exit(0);
  }

  if (stopReason === 'max_tokens') {
    const prefix = `_⚠️ Revisão do Claude atingiu o limite de saída (stop_reason=\`max_tokens\`, modelo \`${model}\`, esforço \`${effort}\`, thinking budget ${thinkingBudget}, max_tokens ${maxTokens}). O conteúdo abaixo pode estar incompleto._`;
    write(text ? `${prefix}\n\n${text}` : prefix);
    process.exit(0);
  }

  if (!text) {
    write(`_Resposta sem bloco de texto da API da Anthropic (modelo \`${model}\`, stop_reason=\`${stopReason}\`). A execução não deve ser tratada como revisão válida._`);
    process.exit(0);
  }

  if (stopReason !== 'end_turn') {
    write(`_⚠️ Claude encerrou com stop_reason=\`${stopReason}\`; revise a completude do resultado._\n\n${text}`);
    process.exit(0);
  }

  write(text);
} catch (error) {
  write(`_Erro inesperado na revisão do Claude: ${String(error?.message || error)}_`);
}
