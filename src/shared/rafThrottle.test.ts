import { describe, expect, it, vi } from "vitest";
import { createRafThrottled } from "./rafThrottle";

describe("createRafThrottled", () => {
  it("coalesces multiple calls into a single animation frame", () => {
    let scheduledCallback: FrameRequestCallback | null = null;
    const raf = vi.fn((callback: FrameRequestCallback) => {
      scheduledCallback = callback;
      return 1;
    });

    const handler = vi.fn();
    const throttled = createRafThrottled(handler, raf);

    throttled("first");
    throttled("second");

    expect(raf).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();

    scheduledCallback?.(0);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("second");
  });

  it("allows a new frame after the callback runs", () => {
    let scheduledCallback: FrameRequestCallback | null = null;
    const raf = vi.fn((callback: FrameRequestCallback) => {
      scheduledCallback = callback;
      return 2;
    });

    const handler = vi.fn();
    const throttled = createRafThrottled(handler, raf);

    throttled("first");
    scheduledCallback?.(0);

    throttled("next");

    expect(raf).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("first");
  });
});
