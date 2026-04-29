/**
 * Smart chunker for source materials.
 *
 * Why: When source material is longer than the model can handle, naive `slice(0, N)`
 * throws away the conclusion / closing arguments — which are usually the most
 * informative parts of a brief. We keep both the head and the tail.
 *
 * Strategy: if total length > budget, keep ~60% from the head and ~40% from the
 * tail with a `[…N chars elided…]` separator. Works on raw character budgets so
 * it stays predictable across models.
 */
export function smartTruncateMaterials(
  text: string,
  maxChars: number
): string {
  if (!text) return "";
  if (text.length <= maxChars) return text;

  const SEPARATOR_TEMPLATE = (n: number) =>
    `\n\n[… ${n.toLocaleString()} characters elided to fit context window …]\n\n`;

  // Reserve room for the separator (estimate at 80 chars; correct after).
  const headBudget = Math.floor(maxChars * 0.6) - 40;
  const tailBudget = maxChars - headBudget - 80;

  const head = sliceAtBoundary(text, 0, headBudget);
  const tail = sliceAtBoundary(text, text.length - tailBudget, text.length);
  const elided = text.length - head.length - tail.length;

  return `${head}${SEPARATOR_TEMPLATE(elided)}${tail}`;
}

/**
 * Slice prefers paragraph / sentence boundaries within ~10% of the target so the
 * result reads cleanly to the model.
 */
function sliceAtBoundary(text: string, start: number, end: number): string {
  if (end <= start) return "";
  const raw = text.slice(start, end);
  if (start === 0) {
    // For the head: trim from the *end* at a paragraph break.
    const breakPoint = lastBreak(raw, raw.length);
    if (breakPoint > raw.length * 0.9) return raw.slice(0, breakPoint).trimEnd();
    return raw.trimEnd();
  }
  // For the tail: trim from the *start* at a paragraph break.
  const breakPoint = firstBreak(raw, 0);
  if (breakPoint < raw.length * 0.1 && breakPoint > 0) {
    return raw.slice(breakPoint).trimStart();
  }
  return raw.trimStart();
}

function lastBreak(s: string, before: number): number {
  const candidates = [
    s.lastIndexOf("\n\n", before),
    s.lastIndexOf(". ", before),
    s.lastIndexOf("\n", before),
  ];
  return Math.max(...candidates);
}

function firstBreak(s: string, after: number): number {
  const para = s.indexOf("\n\n", after);
  if (para >= 0) return para + 2;
  const sentence = s.indexOf(". ", after);
  if (sentence >= 0) return sentence + 2;
  const line = s.indexOf("\n", after);
  if (line >= 0) return line + 1;
  return 0;
}
