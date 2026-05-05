import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import i18n, { i18nInitialization, LANGUAGE_STORAGE_KEY } from "@/i18n/config";
import { PerlerloomApp } from "./perlerloom-app";

const patternCanvasMockContexts: Array<{ font: string }> = [];

function renderPerlerloomApp(): ReturnType<typeof render> {
  return render(
    <I18nextProvider i18n={i18n}>
      <PerlerloomApp />
    </I18nextProvider>
  );
}

async function openGenerateImportDialog(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const importImage = screen.queryByRole("button", { name: /^import image$/i });
  if (importImage !== null) {
    await user.click(importImage);
  } else {
    await user.click(screen.getByRole("button", { name: /^new \/ import$/i }));
  }
}

async function enterEditorWithBlankPattern(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: /create new pattern/i }));
  const newDialog = await screen.findByRole("dialog", { name: /new pattern/i });
  await user.click(within(newDialog).getByRole("button", { name: /create grid/i }));
  await screen.findByLabelText(/editable bead pattern/i);
}

describe("Perlerloom editor shell", () => {
  beforeAll(async () => {
    await i18nInitialization;
  });

  beforeEach(async () => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    await i18n.changeLanguage("en");
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

  it("starts with a welcome empty state and no canvas until a pattern exists", () => {
    renderPerlerloomApp();

    expect(screen.queryByLabelText(/editable bead pattern/i)).not.toBeInTheDocument();
    const logo = screen.getByRole("img", { name: /perlerloom logo/i });
    expect(logo).toBeInTheDocument();
    expect(logo.className).not.toMatch(/\brounded-/);
    expect(screen.getByRole("button", { name: /^import image$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create new pattern/i })).toBeInTheDocument();
  });

  it("renders upload settings with dithering disabled by default", async () => {
    const user = userEvent.setup();
    renderPerlerloomApp();

    await openGenerateImportDialog(user);

    const dialog = await screen.findByRole("dialog", { name: /new \/ import/i });
    expect(within(dialog).getByRole("checkbox", { name: /enable dithering/i })).not.toBeChecked();
    expect(within(dialog).getByLabelText(/target colors/i)).toHaveValue("24");
  });

  it("shows an upload preview before generation and keeps generation explicit", async () => {
    const user = userEvent.setup();
    renderPerlerloomApp();

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
    renderPerlerloomApp();

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
    renderPerlerloomApp();

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
    renderPerlerloomApp();

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
    renderPerlerloomApp();

    await enterEditorWithBlankPattern(user);
    await user.click(screen.getByRole("button", { name: /paint bucket/i }));

    expect(screen.getByTestId("chart-tool-hud")).toBeInTheDocument();
    expect(screen.getByTestId("chart-drawing-color-select")).toBeInTheDocument();
  });

  it("includes the eyedropper tool in the rail", async () => {
    const user = userEvent.setup();
    renderPerlerloomApp();

    await enterEditorWithBlankPattern(user);
    await user.click(screen.getByRole("button", { name: /^eyedropper$/i }));

    expect(screen.getByTestId("chart-tool-hud")).toBeInTheDocument();
    expect(screen.getByTestId("chart-eyedropper-under-pointer")).toHaveTextContent(/move over a bead/i);
  });

  it("includes the eraser tool and hides drawing color select while active", async () => {
    const user = userEvent.setup();
    renderPerlerloomApp();

    await enterEditorWithBlankPattern(user);
    await user.click(screen.getByRole("button", { name: /^eraser$/i }));

    expect(screen.getByTestId("chart-tool-hud")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-drawing-color-select")).not.toBeInTheDocument();
  });

  it("uses a tool-specific chart cursor", async () => {
    const user = userEvent.setup();
    renderPerlerloomApp();

    await enterEditorWithBlankPattern(user);
    await user.click(screen.getByRole("button", { name: /hand/i }));

    expect(screen.getByLabelText(/editable bead pattern/i)).toHaveClass("cursor-grab");
  });

  it("renders the legend as compact selectable badges", async () => {
    const user = userEvent.setup();
    renderPerlerloomApp();

    await enterEditorWithBlankPattern(user);

    const legend = screen.getByLabelText(/legend badges/i);
    const mardPalette = screen.getByLabelText(/mard palette/i);
    await user.click(within(mardPalette).getByRole("button", { name: /^H\d/ }));
    await user.click(within(mardPalette).getByRole("button", { name: /select palette color h7/i }));

    expect(legend).toBeInTheDocument();
    expect(screen.getByTestId("chart-drawing-color-select")).toHaveTextContent("H7");
    const h7Swatch = within(mardPalette).getByRole("button", { name: /select palette color h7/i });
    expect(h7Swatch.className).toMatch(/rounded-md/);
  });

  it("records edit history and can jump to a previous snapshot", async () => {
    const user = userEvent.setup();
    renderPerlerloomApp();

    await enterEditorWithBlankPattern(user);
    await user.click(screen.getByRole("button", { name: /paint bucket/i }));
    fireEvent.click(screen.getByLabelText(/editable bead pattern/i), { clientX: 85, clientY: 50 });

    expect(await screen.findByRole("button", { name: /bucket fill/i })).toHaveAttribute("aria-current", "step");
    await user.click(screen.getByRole("button", { name: /generated pattern/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /generated pattern/i })).toHaveAttribute("aria-current", "step"));
  });

  it("scales pattern canvas label font when chart zoom changes", async () => {
    const user = userEvent.setup();
    renderPerlerloomApp();

    await enterEditorWithBlankPattern(user);
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
    renderPerlerloomApp();

    await enterEditorWithBlankPattern(user);
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

  it("stores selected language in localStorage", async () => {
    const user = userEvent.setup();
    renderPerlerloomApp();
    const languageControl = screen.getByRole("combobox", { name: /language/i });
    await user.click(languageControl);
    await user.click(await screen.findByRole("option", { name: /中文/i }));
    await waitFor(() => expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh"));
  });

  it("shows Chinese interface when language is Chinese", async () => {
    await i18n.changeLanguage("zh");
    renderPerlerloomApp();
    expect(screen.getByRole("heading", { level: 1, name: "珀勒鲁姆" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /导入图片/ })).toBeInTheDocument();
  });

  it("keeps the initial browser render in English when Chinese is stored", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "zh-CN");

    renderPerlerloomApp();

    expect(screen.getByRole("heading", { level: 1, name: "Perlerloom" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Perlerloom logo" })).toBeInTheDocument();
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
