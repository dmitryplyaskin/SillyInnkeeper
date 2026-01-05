export function mergeOptions(
  selected: string[],
  serverOptions: Array<{ value: string; count: number }>
): Array<{ value: string; label: string }> {
  const map = new Map<string, number>();
  for (const opt of serverOptions) map.set(opt.value, opt.count);
  for (const sel of selected) {
    if (!map.has(sel)) map.set(sel, 0);
  }
  return Array.from(map.entries()).map(([value, count]) => ({
    value,
    label: `${value} (${count})`,
  }));
}


