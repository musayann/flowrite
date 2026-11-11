/**
 * A small word-level diff for showing how a flagged sentence changes once it
 * is corrected. Inputs are single sentences (and the whole text is capped by
 * MAX_CHARS), so a plain LCS table is more than fast enough.
 */

export type DiffKind = "same" | "removed" | "added";

export type DiffPart = { text: string; kind: DiffKind };

export type MarkedPart = DiffPart & {
  /** True when this piece falls inside the range passed to `markRange`. */
  highlight: boolean;
};

/**
 * Words (letters, digits, combining marks, apostrophes and hyphens), runs of
 * whitespace, and any other single character. Every character matches one of
 * the three, so joining the tokens always rebuilds the input exactly.
 */
const TOKEN = /\s+|[\p{L}\p{M}\p{N}’'-]+|[^\s\p{L}\p{M}\p{N}]/gu;

export function tokenize(text: string): string[] {
  return text.match(TOKEN) ?? [];
}

const isBlank = (text: string) => /^\s+$/.test(text);

/**
 * Diff two strings word by word.
 *
 * Joining every part except `added` rebuilds `before`; joining every part
 * except `removed` rebuilds `after`. Within each run of changes, the removed
 * text comes first, followed by the added text.
 */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before);
  const b = tokenize(after);

  // Strip the shared prefix and suffix so the table only covers the change.
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++;
  }

  const midA = a.slice(head, a.length - tail);
  const midB = b.slice(head, b.length - tail);
  const n = midA.length;
  const m = midB.length;

  // lcs[i][j] = length of the longest common subsequence of midA[i..] and midB[j..].
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        midA[i] === midB[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const raw: DiffPart[] = a.slice(0, head).map((text) => ({ text, kind: "same" }));
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (midA[i] === midB[j]) {
      raw.push({ text: midA[i++], kind: "same" });
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      raw.push({ text: midA[i++], kind: "removed" });
    } else {
      raw.push({ text: midB[j++], kind: "added" });
    }
  }
  while (i < n) raw.push({ text: midA[i++], kind: "removed" });
  while (j < m) raw.push({ text: midB[j++], kind: "added" });
  for (const text of a.slice(a.length - tail)) raw.push({ text, kind: "same" });

  // A lone space kept between two changes splits one rewrite into fragments
  // ("~very~ ~big~" rather than "~very big~"), so fold it into the change.
  const folded: DiffPart[] = [];
  raw.forEach((part, k) => {
    const between =
      part.kind === "same" &&
      isBlank(part.text) &&
      raw[k - 1] !== undefined &&
      raw[k - 1].kind !== "same" &&
      raw[k + 1] !== undefined &&
      raw[k + 1].kind !== "same";
    if (between) {
      folded.push({ text: part.text, kind: "removed" }, { text: part.text, kind: "added" });
    } else {
      folded.push(part);
    }
  });

  // Collapse each run of changes into one removed part then one added part,
  // and merge neighbouring unchanged tokens.
  const parts: DiffPart[] = [];
  let removed = "";
  let added = "";
  const flush = () => {
    if (removed) parts.push({ text: removed, kind: "removed" });
    if (added) parts.push({ text: added, kind: "added" });
    removed = "";
    added = "";
  };
  for (const part of folded) {
    if (part.kind === "removed") {
      removed += part.text;
    } else if (part.kind === "added") {
      added += part.text;
    } else {
      flush();
      const last = parts[parts.length - 1];
      if (last?.kind === "same") last.text += part.text;
      else parts.push({ ...part });
    }
  }
  flush();

  // An inserted or deleted word can be aligned on either side of a space
  // ("is| an| engineer" or "is |an |engineer"). Slide it past its leading
  // whitespace so it starts on a word, next to the word it belongs with.
  for (let k = 1; k < parts.length - 1; k++) {
    const [prev, cur, next] = [parts[k - 1], parts[k], parts[k + 1]];
    if (cur.kind === "same" || prev.kind !== "same" || next.kind !== "same") {
      continue;
    }
    const lead = /^\s+/.exec(cur.text)?.[0];
    if (!lead || !next.text.startsWith(lead)) continue;
    prev.text += lead;
    cur.text = cur.text.slice(lead.length) + lead;
    next.text = next.text.slice(lead.length);
  }
  return parts.filter((p) => p.text);
}

/**
 * Split `parts` at the boundaries of the character range `[start, end)`,
 * counted across the joined text of `parts`, and flag the pieces inside it.
 *
 * Pass the before side of a diff (everything except `added`) to mark an
 * excerpt of the original sentence. An empty or negative range marks nothing.
 */
export function markRange(
  parts: DiffPart[],
  start: number,
  end: number,
): MarkedPart[] {
  const hasRange = start >= 0 && start < end;
  const out: MarkedPart[] = [];
  let offset = 0;

  for (const part of parts) {
    const partEnd = offset + part.text.length;
    const cuts = [offset];
    if (hasRange && start > offset && start < partEnd) cuts.push(start);
    if (hasRange && end > offset && end < partEnd) cuts.push(end);
    cuts.push(partEnd);

    for (let k = 0; k < cuts.length - 1; k++) {
      const from = cuts[k];
      const to = cuts[k + 1];
      if (from === to) continue;
      out.push({
        kind: part.kind,
        text: part.text.slice(from - offset, to - offset),
        highlight: hasRange && from >= start && to <= end,
      });
    }
    offset = partEnd;
  }
  return out;
}
