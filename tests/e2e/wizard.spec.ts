import { test, expect, type Page } from "@playwright/test";

const sampleImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAABOElEQVR4nO3OMQ0AAAjAsElHOhb4liVUQZl3hh0owQ6UYAdKsAMl2IES7EAJdqAEO1CCHSjBDpRgB0qwAyXYgRLsQAl2oAQ7UIIdKMEOlGAHSrADJdiBEuxACXagBDtQgh0owQ6UYAdKsAMl2IES7EAJdqAEO1CCHSjBDpRgB0qwAyXYgRLsQAl2oAQ7UIIdKMEOlGAHSrADJdiBEuxACXagBDtQgh0owQ6UYAdKsAMl2IES7EAJdqAEO1CCHSjBDpRgB0qwAyXYgRLsQAl2oAQ7UIIdKMEOlGAHSrADJdiBEuxACXagBDtQgh0owQ6UYAdKsAMl2IES7EAJdqAEO1CCHSjBDpRgB0qwAyXYgRLsQAl2oAQ7UIIdKMEOlGAHSrADJdiBEuxACXagBDtQgh0owQ6UYAdKFkd+m2cPIOlDAAAAAElFTkSuQmCC",
  "base64",
);

const loadSampleImage = async (page: Page) => {
  await page.setInputFiles("#photo-input", {
    name: "sample.png",
    mimeType: "image/png",
    buffer: sampleImage,
  });
};

test("guides the user through the wizard flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Select photo" })).toBeVisible();

  await loadSampleImage(page);

  await expect(page.getByLabel("Frame ratio")).toBeVisible();
  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  await expect(page.getByLabel("Border")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Just Frames" })).not.toBeVisible();

  await page.getByLabel("Border").fill("12");
  await expect(page.getByText("12%")).toBeVisible();

  const isScrollable = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
  expect(isScrollable).toBe(false);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Done" }).click(),
  ]);

  expect(download.suggestedFilename()).toBe("just-frame.jpg");
  await expect(page.getByRole("heading", { name: "Just Frames" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Done" })).not.toBeVisible();
});

test("allows closing the preview to return to the photo step", async ({ page }) => {
  await page.goto("/");

  await loadSampleImage(page);

  const previewScreen = page.locator(".preview-screen");
  const closeButton = page.getByRole("button", { name: "Close preview" });

  await expect(previewScreen).toHaveCSS("background-color", "rgb(11, 11, 11)");
  await expect(closeButton).toHaveCSS("background-color", "rgb(15, 15, 15)");
  await expect(closeButton).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();

  await expect(page.getByRole("heading", { name: "Just Frames" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Done" })).not.toBeVisible();
});

test("reselecting the same photo after closing the preview opens it again", async ({ page }) => {
  await page.goto("/");

  await loadSampleImage(page);
  await page.getByRole("button", { name: "Close preview" }).click();

  await loadSampleImage(page);

  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
});

test("shares the framed image on mobile devices", async ({ page }) => {
  await page.addInitScript(() => {
    const shareCalls: unknown[] = [];
    (window as { __shareCalls?: unknown[] }).__shareCalls = shareCalls;
    Object.defineProperty(navigator, "userAgent", {
      get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    Object.defineProperty(navigator, "userAgentData", {
      get: () => ({ mobile: true }),
    });
    navigator.share = async (data) => {
      shareCalls.push(data);
    };
    navigator.canShare = () => true;
  });

  await page.goto("/");
  await loadSampleImage(page);

  await page.screenshot({ path: "test-results/wizard-preview.png", fullPage: true });

  await page.getByRole("button", { name: "Done" }).click();

  await expect.poll(async () =>
    page.evaluate(() => (window as { __shareCalls?: unknown[] }).__shareCalls?.length ?? 0),
  ).toBe(1);
  await expect(page.getByRole("button", { name: "Done" })).not.toBeVisible();
});

test("downloads the framed image on desktop devices", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    const shareCalls: unknown[] = [];
    (window as { __shareCalls?: unknown[] }).__shareCalls = shareCalls;
    navigator.share = async (data) => {
      shareCalls.push(data);
    };
    navigator.canShare = () => true;
  });

  await page.goto("/");
  await loadSampleImage(page);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Done" }).click(),
  ]);

  expect(download.suggestedFilename()).toBe("just-frame.jpg");
  await expect.poll(async () =>
    page.evaluate(() => (window as { __shareCalls?: unknown[] }).__shareCalls?.length ?? 0),
  ).toBe(0);
});
