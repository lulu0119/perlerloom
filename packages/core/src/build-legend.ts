export type PatternLegendItem = {
  code: string;
  count: number;
};

export function buildLegend(cells: (string | null)[]): PatternLegendItem[] {
  const counts = new Map<string, number>();
  for (const cell of cells) {
    if (cell !== null) {
      counts.set(cell, (counts.get(cell) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => left.code.localeCompare(right.code, "en", { numeric: true }));
}
