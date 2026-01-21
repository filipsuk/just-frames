import { test, expect, type Page } from "@playwright/test";

const sampleImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y4GZ1sAAAAASUVORK5CYII=",
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

  await expect(page.getByRole("heading", { name: "Choose a photo" })).toBeVisible();
  await expect(page.getByLabel("Frame ratio")).toBeVisible();
  await expect(page.getByRole("button", { name: "Select photo" })).toBeVisible();

  await loadSampleImage(page);

  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  await expect(page.getByLabel("Border")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Just Frames" })).not.toBeVisible();

  await page.getByLabel("Border").fill("12");
  await expect(page.getByText("12%")).toBeVisible();

  const isScrollable = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
  expect(isScrollable).toBe(false);

  await page.screenshot({ path: "test-results/wizard-preview.png", fullPage: true });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Done" }).click(),
  ]);

  expect(download.suggestedFilename()).toBe("just-frame.jpg");
  await expect(page.getByRole("heading", { name: "Just Frames" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose a photo" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Choose a photo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Done" })).not.toBeVisible();
});
