import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT_DIR = 'ai-review-out';
mkdirSync(OUT_DIR, { recursive: true });
const outPath = `${OUT_DIR}/claude-findings.md`;
const write = text => writeFileSync(outPath, text, 'utf8');

try {
  const diff = readFileSync('diff.trimmed.txt', 'utf8');
  const context = readFileSync('.github/scripts/review-context.md', 'utf8');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_REVIEW_MODEL || 'claude-sonnet-5';

  if (!apiKey) {
    write('_`ANTHROPIC_API_KEY` não está configurada como secret do repositório — revisão do Claude não executada. Adicione o secret em Settings → Secrets and variables → Actions._');
    process.exit(0);
  }
  if (!diff.trim()) {
    write('_Nenhuma alteração de código detectada neste diff._');
    process.exit(0);
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
      max_tokens: 2000,
      system: context,
      messages: [
        { role: 'user', content: `Revise este diff do repositório MedPer:\n\n\`\`\`diff\n${diff}\n\`\`\`` }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    write(`_Falha ao chamar a API da Anthropic (HTTP ${response.status}, modelo \`${model}\`): ${body.slice(0, 500)}_`);
    process.exit(0);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text?.trim();
  write(text || '_Resposta vazia da API da Anthropic._');
} catch (error) {
  write(`_Erro inesperado na revisão do Claude: ${String(error?.message || error)}_`);
}
