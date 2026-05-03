import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PerlerloomApp } from "./perlerloom-app";

describe("Perlerloom editor shell", () => {
  beforeEach(() => {
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

  it("renders upload settings with dithering disabled by default", () => {
    render(<PerlerloomApp />);

    expect(screen.getByRole("checkbox", { name: /enable dithering/i })).not.toBeChecked();
    expect(screen.getByLabelText(/target colors/i)).toHaveValue(24);
  });

  it("shows an upload preview before generation and keeps generation explicit", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    expect(screen.getByText(/drop image here or click to upload/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate pattern/i })).toBeDisabled();

    await user.upload(screen.getByLabelText(/choose source image/i), new File(["demo"], "demo.png", { type: "image/png" }));

    expect(await screen.findByAltText(/selected source image/i)).toBeInTheDocument();
    expect(screen.getByText(/source: 2 x 1 px/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate pattern/i })).toBeEnabled();
    expect(screen.getByText(/ready to generate/i)).toBeInTheDocument();
  });

  it("generates the pattern only after the generate button is clicked", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await user.upload(screen.getByLabelText(/choose source image/i), new File(["demo"], "demo.png", { type: "image/png" }));
    await user.click(await screen.findByRole("button", { name: /generate pattern/i }));

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

    await user.upload(screen.getByLabelText(/choose source image/i), new File(["large"], "large.png", { type: "image/png" }));

    expect(await screen.findByText(/source: 1000 x 1000 px/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target width/i)).toHaveValue(256);
    expect(screen.getByLabelText(/target height/i)).toHaveValue(256);
    expect(screen.getByLabelText(/scale factor/i)).toHaveValue(25);
    expect(screen.getByText(/larger than 256 cells/i)).toBeInTheDocument();
  });

  it("updates conversion selects without reading a cleared event target", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await user.selectOptions(screen.getByLabelText(/downsampling method/i), "gridMode");
    await user.selectOptions(screen.getByLabelText(/match space/i), "rgb");
    await user.selectOptions(screen.getByLabelText(/cluster space/i), "rgb");

    expect(screen.getByLabelText(/downsampling method/i)).toHaveValue("gridMode");
    expect(screen.getByLabelText(/match space/i)).toHaveValue("rgb");
    expect(screen.getByLabelText(/cluster space/i)).toHaveValue("rgb");
  });

  it("changes the active toolbar tool", async () => {
    const user = userEvent.setup();
    render(<PerlerloomApp />);

    await user.click(screen.getByRole("button", { name: /paint bucket/i }));

    expect(screen.getByText(/active tool: paint bucket/i)).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: /select h7, 22 beads/i }));

    expect(legend).toBeInTheDocument();
    expect(screen.getByText(/active color: h7/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select h7, 22 beads/i })).toHaveClass("rounded-full");
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
});

function getCanvasContext(contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null;
function getCanvasContext(contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings): ImageBitmapRenderingContext | null;
function getCanvasContext(contextId: "webgl", options?: WebGLContextAttributes): WebGLRenderingContext | null;
function getCanvasContext(contextId: "webgl2", options?: WebGLContextAttributes): WebGL2RenderingContext | null;
function getCanvasContext(contextId: string): CanvasRenderingContext2D | ImageBitmapRenderingContext | WebGLRenderingContext | WebGL2RenderingContext | null {
  if (contextId !== "2d") {
    return null;
  }

  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
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
}
