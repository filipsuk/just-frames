export type AnimationFrameScheduler = (callback: FrameRequestCallback) => number;

export const createRafThrottled = <Args extends unknown[]>(
  handler: (...args: Args) => void,
  schedule: AnimationFrameScheduler = requestAnimationFrame,
): ((...args: Args) => void) => {
  let rafId: number | null = null;
  let latestArgs: Args | null = null;

  return (...args: Args) => {
    latestArgs = args;
    if (rafId !== null) {
      return;
    }

    rafId = schedule(() => {
      rafId = null;
      if (!latestArgs) {
        return;
      }
      const argsToUse = latestArgs;
      latestArgs = null;
      handler(...argsToUse);
    });
  };
};
