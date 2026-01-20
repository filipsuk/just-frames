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

  await loadSampleImage(page);

  await expect(page.getByRole("heading", { name: "Pick a frame ratio" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Instagram Story (9:16)" })).toBeVisible();

  await page.screenshot({ path: "test-results/wizard-ratio.png", fullPage: true });

  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();

  await page.getByLabel("Border").fill("12");
  await expect(page.getByText("12%")).toBeVisible();

  await page.screenshot({ path: "test-results/wizard-preview.png", fullPage: true });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Done" }).click(),
  ]);

  expect(download.suggestedFilename()).toBe("just-frame.jpg");
});
