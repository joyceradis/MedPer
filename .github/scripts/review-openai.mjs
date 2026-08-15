import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT_DIR = 'ai-review-out';
const INPUT_DIR = process.env.AI_REVIEW_INPUT_DIR || 'ai-review-input';
const MAX_COMPLETION_TOKENS = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS || 6000);

mkdirSync(OUT_DIR, { recursive: true });
const outPath = `${OUT_DIR}/openai-findings.md`;
const write = text => writeFileSync(outPath, text, 'utf8');

try {
  const diff = readFileSync(`${INPUT_DIR}/diff.review.txt`, 'utf8');
  const context = readFileSync(`${INPUT_DIR}/review-context.md`, 'utf8');
  const meta = JSON.parse(readFileSync(`${INPUT_DIR}/meta.json`, 'utf8'));
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_REVIEW_MODEL || 'gpt-5';

  if (meta.skip_ai) {
    write(`_Revisão do GPT não executada: ${meta.skip_reason || 'entrada marcada para skip'}._`);
    process.exit(0);
  }
  if (!apiKey) {
    write('_`OPENAI_API_KEY` não está configurada como secret do repositório — revisão do GPT não executada. Adicione o secret em Settings → Secrets and variables → Actions._');
    process.exit(0);
  }
  if (!diff.trim()) {
    write('_Nenhuma alteração de código detectada neste diff._');
    process.exit(0);
  }
  if (!Number.isInteger(MAX_COMPLETION_TOKENS) || MAX_COMPLETION_TOKENS < 1) {
    throw new Error('OPENAI_MAX_COMPLETION_TOKENS must be a positive integer');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      store: false,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      messages: [
        { role: 'system', content: context },
        {
          role: 'user',
          content: `Revise este diff do repositório MedPer. A entrada foi preparada uma única vez e é idêntica à enviada ao Claude.${meta.truncated ? ` ATENÇÃO: o diff original tinha ${meta.original_bytes} bytes e esta entrada foi truncada para ${meta.review_bytes} bytes.` : ''}\n\n\`\`\`diff\n${diff}\n\`\`\``
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    write(`_Falha ao chamar a API da OpenAI (HTTP ${response.status}, modelo \`${model}\`): ${body.slice(0, 500)}_`);
    process.exit(0);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  const text = typeof message?.content === 'string' ? message.content.trim() : '';

  if (message?.refusal) {
    write(`_A API da OpenAI recusou a revisão (modelo \`${model}\`): ${String(message.refusal).slice(0, 500)}_`);
    process.exit(0);
  }

  write(text || '_Resposta vazia da API da OpenAI._');
} catch (error) {
  write(`_Erro inesperado na revisão do GPT: ${String(error?.message || error)}_`);
}
