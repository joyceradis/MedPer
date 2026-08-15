export const DEFAULT_DIFF_LIMIT_BYTES = 60000;

export function isZeroSha(value) {
  return typeof value === 'string' && /^0{40}$/.test(value);
}

export function isDocumentationOnly(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return false;

  return paths.every(rawPath => {
    const path = String(rawPath || '').replace(/^\.\//, '');
    // `.github/**` é configuração operante do próprio pipeline — workflows, scripts
    // e `review-context.md`, que é o system prompt dos dois revisores. Tratar esses
    // arquivos como documentação permitiria alterar as instruções do mecanismo de
    // revisão sem passar por revisão nenhuma.
    if (path.startsWith('.github/')) return false;
    return path.startsWith('docs/') || /\.md$/i.test(path);
  });
}

export function resolvePushBase({ before, beforeAvailable = true, parent, emptyTree }) {
  if (before && !isZeroSha(before) && beforeAvailable) return before;
  if (parent) return parent;
  return emptyTree || '';
}

export function truncateDiff(diff, limitBytes = DEFAULT_DIFF_LIMIT_BYTES) {
  const text = String(diff ?? '');
  const source = Buffer.from(text, 'utf8');

  if (source.length <= limitBytes) {
    return {
      text,
      truncated: false,
      originalBytes: source.length,
      reviewBytes: source.length,
      limitBytes
    };
  }

  let reviewText = source.subarray(0, limitBytes).toString('utf8');
  if (reviewText.endsWith('\uFFFD')) reviewText = reviewText.slice(0, -1);

  while (Buffer.byteLength(reviewText, 'utf8') > limitBytes) {
    reviewText = reviewText.slice(0, -1);
  }

  return {
    text: reviewText,
    truncated: true,
    originalBytes: source.length,
    reviewBytes: Buffer.byteLength(reviewText, 'utf8'),
    limitBytes
  };
}

function pathFromDiffHeader(header) {
  const marker = ' b/';
  const index = header.lastIndexOf(marker);
  if (index === -1) return '';
  return header.slice(index + marker.length).replace(/^"|"$/g, '');
}

export function analyzeDiffCoverage(fullDiff, reviewText, changedPaths = []) {
  const source = String(fullDiff ?? '');
  const review = String(reviewText ?? '');
  const paths = Array.isArray(changedPaths) ? changedPaths.map(String) : [];
  const sourceBytes = Buffer.byteLength(source, 'utf8');
  const reviewBytes = Buffer.byteLength(review, 'utf8');

  if (reviewBytes >= sourceBytes) {
    return {
      includedPaths: [...paths],
      partialPath: '',
      omittedPaths: []
    };
  }

  const headers = [...source.matchAll(/^diff --git .*$/gm)].map(match => ({
    index: match.index ?? 0,
    path: pathFromDiffHeader(match[0])
  }));

  if (headers.length === 0) {
    return {
      includedPaths: [],
      partialPath: paths[0] || '',
      omittedPaths: paths.slice(paths.length > 0 ? 1 : 0)
    };
  }

  const includedPaths = [];
  const omittedPaths = [];
  let partialPath = '';

  for (let index = 0; index < headers.length; index += 1) {
    const current = headers[index];
    const next = headers[index + 1];
    const startByte = Buffer.byteLength(source.slice(0, current.index), 'utf8');
    const endByte = Buffer.byteLength(source.slice(0, next?.index ?? source.length), 'utf8');
    const path = current.path || paths[index] || '';

    if (!path) continue;
    if (endByte <= reviewBytes) includedPaths.push(path);
    else if (startByte < reviewBytes && !partialPath) partialPath = path;
    else omittedPaths.push(path);
  }

  const classified = new Set([...includedPaths, partialPath, ...omittedPaths].filter(Boolean));
  for (const path of paths) {
    if (!classified.has(path)) omittedPaths.push(path);
  }

  return { includedPaths, partialPath, omittedPaths };
}
