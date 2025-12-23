function isRegexLikeToken(token: string): boolean {
  const t = token.trim();
  if (!t.startsWith("/")) return false;
  // naive: closing / exists later
  // /.../flags
  const lastSlash = findClosingRegexSlash(t);
  return lastSlash > 0;
}

function findClosingRegexSlash(token: string): number {
  // token is trimmed and starts with '/'
  let escaped = false;
  for (let i = 1; i < token.length; i += 1) {
    const ch = token[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === "/") return i;
  }
  return -1;
}

export function parseCommaListSmart(input: string): string[] {
  const out: string[] = [];
  let buf = "";

  let escaped = false;
  let tokenMayBeRegex = true;
  let inRegex = false;

  const flush = () => {
    const token = buf.trim();
    if (token.length > 0) out.push(token);
    buf = "";
    tokenMayBeRegex = true;
    inRegex = false;
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (escaped) {
      buf += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      const next = input[i + 1];
      // allow escaping comma: '\,' -> literal comma
      if (next === ",") {
        buf += ",";
        i += 1;
        continue;
      }
      escaped = true;
      buf += ch;
      continue;
    }

    if (!inRegex) {
      // We consider the token as regex only if it begins with '/' ignoring leading spaces.
      if (tokenMayBeRegex && buf.trim().length === 0 && ch === "/") {
        inRegex = true;
        tokenMayBeRegex = false;
        buf += ch;
        continue;
      }
      if (ch === ",") {
        flush();
        continue;
      }
      if (ch.trim().length > 0) tokenMayBeRegex = false;
      buf += ch;
      continue;
    }

    // inRegex: commas are not separators until we hit closing unescaped '/'
    if (ch === "/") {
      buf += ch;
      inRegex = false;
      continue;
    }
    buf += ch;
  }

  flush();
  return out;
}

export function stringifyCommaListSmart(values: string[]): string {
  return values
    .map((v) => (typeof v === "string" ? v : String(v ?? "")))
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .map((v) => {
      // For non-regex tokens, escape commas so roundtrip is possible.
      if (!isRegexLikeToken(v) && v.includes(",")) return v.replaceAll(",", "\\,");
      return v;
    })
    .join(", ");
}


