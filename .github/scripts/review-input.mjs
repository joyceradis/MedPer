export const DEFAULT_DIFF_LIMIT_BYTES = 60000;

export function isZeroSha(value) {
  return typeof value === 'string' && /^0{40}$/.test(value);
}

export function isDocumentationOnly(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return false;

  return paths.every(rawPath => {
    const path = String(rawPath || '').replace(/^\.\//, '');
    return path.startsWith('docs/') || /\.md$/i.test(path);
  });
}

export function resolvePushBase({ before, parent, emptyTree }) {
  if (before && !isZeroSha(before)) return before;
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
