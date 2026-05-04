import { describe, expect, it } from "vitest";
import { majorGridLineCellIndices } from "./major-grid-line-indices";

describe("majorGridLineCellIndices", () => {
  it("includes the outer edge when extent is not divisible by step", () => {
    expect(majorGridLineCellIndices(8, 5)).toEqual([0, 5, 8]);
    expect(majorGridLineCellIndices(7, 5)).toEqual([0, 5, 7]);
  });

  it("does not duplicate the outer edge when extent is a multiple of step", () => {
    expect(majorGridLineCellIndices(10, 5)).toEqual([0, 5, 10]);
    expect(majorGridLineCellIndices(5, 5)).toEqual([0, 5]);
  });
});
