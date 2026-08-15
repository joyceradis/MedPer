import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT_DIR = 'ai-review-out';
mkdirSync(OUT_DIR, { recursive: true });
const outPath = `${OUT_DIR}/openai-findings.md`;
const write = text => writeFileSync(outPath, text, 'utf8');

try {
  const diff = readFileSync('diff.trimmed.txt', 'utf8');
  const context = readFileSync('.github/scripts/review-context.md', 'utf8');
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_REVIEW_MODEL || 'gpt-5';

  if (!apiKey) {
    write('_`OPENAI_API_KEY` não está configurada como secret do repositório — revisão do GPT não executada. Adicione o secret em Settings → Secrets and variables → Actions._');
    process.exit(0);
  }
  if (!diff.trim()) {
    write('_Nenhuma alteração de código detectada neste diff._');
    process.exit(0);
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: context },
        { role: 'user', content: `Revise este diff do repositório MedPer:\n\n\`\`\`diff\n${diff}\n\`\`\`` }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    write(`_Falha ao chamar a API da OpenAI (HTTP ${response.status}, modelo \`${model}\`): ${body.slice(0, 500)}_`);
    process.exit(0);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  write(text || '_Resposta vazia da API da OpenAI._');
} catch (error) {
  write(`_Erro inesperado na revisão do GPT: ${String(error?.message || error)}_`);
}
