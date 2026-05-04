/**
 * Cell indices where a thick “major” grid line should be drawn (left/top edge of that cell),
 * including the outer right/bottom edge at `extentCells` when it is not a multiple of `step`.
 */
export function majorGridLineCellIndices(extentCells: number, step: number): number[] {
  if (!Number.isInteger(extentCells) || extentCells < 0) {
    throw new RangeError("extentCells must be a non-negative integer");
  }
  if (!Number.isInteger(step) || step < 1) {
    throw new RangeError("step must be a positive integer");
  }
  const indices: number[] = [];
  for (let index = 0; index <= extentCells; index += step) {
    indices.push(index);
  }
  const last = indices[indices.length - 1];
  if (extentCells % step !== 0 && last !== extentCells) {
    indices.push(extentCells);
  }
  return indices;
}
