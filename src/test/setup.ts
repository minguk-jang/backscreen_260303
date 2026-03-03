import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

const canvasContextStub = {
  fillStyle: "",
  font: "",
  textAlign: "left",
  strokeStyle: "",
  lineWidth: 1,
  fillRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arcTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn()
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: vi.fn(() => canvasContextStub)
});

Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
  value: vi.fn(() => "data:image/png;base64,mock")
});
