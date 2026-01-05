export function getFilenameFromPath(filePath: string | null | undefined): string {
  const p = (filePath ?? "").trim();
  if (!p) return "";
  const parts = p.split(/[/\\]+/);
  return parts[parts.length - 1] || "";
}

export function stripPngExt(name: string): string {
  return name.replace(/\.png$/i, "");
}


