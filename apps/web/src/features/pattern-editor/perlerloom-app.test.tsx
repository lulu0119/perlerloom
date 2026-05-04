import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PerlerloomApp } from "./perlerloom-app";

const patternCanvasMockContexts: Array<{ font: string }> = [];

async function openGenerateImportDialog(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: /^new \/ import$/i }));
}

describe("Perlerloom editor shell", () => {
  beforeEach(() => {
    patternCanvasMockContexts.length = 0;
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({
        width: 2,
        height: 1,
        close: vi.fn()
      }))
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:source-preview")
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn()
    });

    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(getCanvasContext)
    });
  });

  it("renders upload settings with dithering disabled by default", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await openGenerateImportDialog(user);

    const dialog = await screen.findByRole("dialog", { name: /new \/ import/i });
    expect(within(dialog).getByRole("checkbox", { name: /enable dithering/i })).not.toBeChecked();
    expect(within(dialog).getByLabelText(/target colors/i)).toHaveValue("24");
  });

  it("shows an upload preview before generation and keeps generation explicit", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await openGenerateImportDialog(user);
    const dialog = await screen.findByRole("dialog", { name: /new \/ import/i });

    expect(within(dialog).getByText(/drop image here or click to upload/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /generate pattern/i })).toBeDisabled();

    await user.upload(within(dialog).getByLabelText(/choose source image/i), new File(["demo"], "demo.png", { type: "image/png" }));

    expect(await within(dialog).findByAltText(/selected source image/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/source: 2 × 1 px/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /generate pattern/i })).toBeEnabled();
    expect(within(dialog).getByText(/ready to generate/i)).toBeInTheDocument();
  });

  it("generates the pattern only after the generate button is clicked", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await openGenerateImportDialog(user);
    const dialog = await screen.findByRole("dialog", { name: /new \/ import/i });

    await user.upload(within(dialog).getByLabelText(/choose source image/i), new File(["demo"], "demo.png", { type: "image/png" }));
    await user.click(await within(dialog).findByRole("button", { name: /generate pattern/i }));

    expect(await screen.findByText(/pattern generated locally/i)).toBeInTheDocument();
    expect(screen.getByText(/generated chart preview/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generated pattern/i })).toHaveAttribute("aria-current", "step");
  });

  it("suggests a scale factor that keeps large images within 256 cells", async () => {
    const user = userEvent.setup();
    vi.mocked(createImageBitmap).mockResolvedValueOnce({
      width: 1000,
      height: 1000,
      close: vi.fn()
    } as ImageBitmap);
    render(<PerlerloomApp />);

    await openGenerateImportDialog(user);
    const dialog = await screen.findByRole("dialog", { name: /new \/ import/i });

    await user.upload(within(dialog).getByLabelText(/choose source image/i), new File(["large"], "large.png", { type: "image/png" }));

    expect(await within(dialog).findByText(/source: 1000 × 1000 px/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/target width/i)).toHaveValue(256);
    expect(within(dialog).getByLabelText(/target height/i)).toHaveValue(256);
    expect(within(dialog).getByLabelText(/scale factor/i)).toHaveValue(25);
    expect(within(dialog).getByText(/larger than 256 cells/i)).toBeInTheDocument();
  });

  it("updates conversion selects without reading a cleared event target", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await openGenerateImportDialog(user);
    const dialog = await screen.findByRole("dialog", { name: /new \/ import/i });

    await user.click(within(dialog).getByRole("combobox", { name: /downsampling method/i }));
    await user.click(await screen.findByRole("option", { name: /^grid mode$/i }));
    await user.click(within(dialog).getByRole("combobox", { name: /match space/i }));
    await user.click(await screen.findByRole("option", { name: /^rgb$/i }));
    await user.click(within(dialog).getByRole("combobox", { name: /cluster space/i }));
    await user.click(await screen.findByRole("option", { name: /^rgb$/i }));

    expect(within(dialog).getByRole("combobox", { name: /downsampling method/i })).toHaveTextContent(/grid mode/i);
    expect(within(dialog).getByRole("combobox", { name: /match space/i })).toHaveTextContent(/rgb/i);
    expect(within(dialog).getByRole("combobox", { name: /cluster space/i })).toHaveTextContent(/rgb/i);
  });

  it("changes the active toolbar tool", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await user.click(screen.getByRole("button", { name: /paint bucket/i }));

    expect(screen.getByTestId("chart-tool-hud")).toBeInTheDocument();
    expect(screen.getByTestId("chart-drawing-color-select")).toBeInTheDocument();
  });

  it("includes the eyedropper tool in the rail", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await user.click(screen.getByRole("button", { name: /^eyedropper$/i }));

    expect(screen.getByTestId("chart-tool-hud")).toBeInTheDocument();
    expect(screen.getByTestId("chart-eyedropper-under-pointer")).toHaveTextContent(/move over a bead/i);
  });

  it("uses a tool-specific chart cursor", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await user.click(screen.getByRole("button", { name: /hand/i }));

    expect(screen.getByLabelText(/editable bead pattern/i)).toHaveClass("cursor-grab");
  });

  it("renders the legend as compact selectable badges", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    const legend = screen.getByLabelText(/legend badges/i);
    await user.click(screen.getByRole("button", { name: /^select h7$/i }));

    expect(legend).toBeInTheDocument();
    expect(screen.getByTestId("chart-drawing-color-select")).toHaveTextContent("H7");
    expect(screen.getByRole("button", { name: /^select h7$/i }).closest("div.flex.min-h-9")).toHaveClass("rounded-full");
  });

  it("records edit history and can jump to a previous snapshot", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await user.click(screen.getByRole("button", { name: /paint bucket/i }));
    fireEvent.click(screen.getByLabelText(/editable bead pattern/i), { clientX: 85, clientY: 50 });

    expect(await screen.findByRole("button", { name: /bucket fill/i })).toHaveAttribute("aria-current", "step");
    await user.click(screen.getByRole("button", { name: /generated pattern/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /generated pattern/i })).toHaveAttribute("aria-current", "step"));
  });

  it("requires authentication before cloud save", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await user.click(screen.getByRole("button", { name: /save to cloud/i }));

    expect(screen.getByText(/sign in to save/i)).toBeInTheDocument();
  });

  it("scales pattern canvas label font when chart zoom changes", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await waitFor(() => expect(patternCanvasMockContexts.length).toBeGreaterThan(0));
    const fontAfterDefaultZoom = patternCanvasMockContexts.at(-1)!.font;
    const defaultSizeMatch = /(\d+)px\b/.exec(fontAfterDefaultZoom);
    expect(defaultSizeMatch).not.toBeNull();

    await user.selectOptions(screen.getByLabelText(/chart zoom/i), "0.5");
    await waitFor(() => {
      const lastFont = patternCanvasMockContexts.at(-1)!.font;
      expect(lastFont).not.toEqual(fontAfterDefaultZoom);
    });

    const zoomedOutSizeMatch = /(\d+)px\b/.exec(patternCanvasMockContexts.at(-1)!.font);
    expect(zoomedOutSizeMatch).not.toBeNull();
    expect(Number(zoomedOutSizeMatch![1])).toBeLessThan(Number(defaultSizeMatch![1]));
  });

  it("steps chart zoom when zoom out and zoom in buttons are clicked", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await waitFor(() => expect(patternCanvasMockContexts.length).toBeGreaterThan(0));
    const fontAt100 = patternCanvasMockContexts.at(-1)!.font;

    await user.click(screen.getByRole("button", { name: /^zoom out$/i }));
    await waitFor(() => {
      expect(patternCanvasMockContexts.at(-1)!.font).not.toEqual(fontAt100);
    });
    const fontAfterZoomOut = patternCanvasMockContexts.at(-1)!.font;

    await user.click(screen.getByRole("button", { name: /^zoom in$/i }));
    await waitFor(() => {
      expect(patternCanvasMockContexts.at(-1)!.font).not.toEqual(fontAfterZoomOut);
    });
  });
});

function getCanvasContext(contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null;
function getCanvasContext(contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings): ImageBitmapRenderingContext | null;
function getCanvasContext(contextId: "webgl", options?: WebGLContextAttributes): WebGLRenderingContext | null;
function getCanvasContext(contextId: "webgl2", options?: WebGLContextAttributes): WebGL2RenderingContext | null;
function getCanvasContext(contextId: string): CanvasRenderingContext2D | ImageBitmapRenderingContext | WebGLRenderingContext | WebGL2RenderingContext | null {
  if (contextId !== "2d") {
    return null;
  }

  const context = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(
      () =>
        ({
          colorSpace: "srgb",
          data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]),
          height: 1,
          width: 2
        }) as ImageData
    ),
    imageSmoothingEnabled: false,
    fillStyle: "",
    font: "",
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "",
    textAlign: "start",
    textBaseline: "alphabetic"
  } as unknown as CanvasRenderingContext2D;
  patternCanvasMockContexts.push(context as unknown as { font: string });
  return context;
}
