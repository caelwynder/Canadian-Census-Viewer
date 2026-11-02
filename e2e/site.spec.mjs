import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CODE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "code");
const page = (name, query = "") => pathToFileURL(path.join(CODE, name)).href + query;

test.beforeEach(async ({ page: p }, info) => {
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  info.errors = errors;
});

test.afterEach(async ({}, info) => {
  expect(info.errors, "console errors").toEqual([]);
});

test("title page draws every view thumbnail", async ({ page: p }) => {
  await p.goto(page("main.html"));
  await expect(p.locator(".view-card")).toHaveCount(4);
  await expect(p.locator("#regions a")).toHaveCount(14);
  const drawn = await p.locator("canvas.thumb").evaluateAll((canvases) =>
    canvases.map((c) => c.getContext("2d").getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0))
  );
  expect(drawn).toEqual([true, true, true, true]);
});

test("title page search opens the division on the map", async ({ page: p }) => {
  await p.goto(page("main.html"));
  await p.fill("#search", "Montréal, Quebec");
  await p.locator("#search").dispatchEvent("change");
  await expect(p).toHaveURL(/map\.html\?region=canada.*cd=2466/);
  await expect(p.locator(".place-name")).toHaveText("Montréal");
});

test("choropleth recolours when the metric changes", async ({ page: p }) => {
  await p.goto(page("map.html", "?region=ontario"));
  await expect(p.locator("#headline")).toHaveText("Population");
  await p.selectOption("#metric", "household_income");
  await expect(p.locator("#headline")).toHaveText(/Median household income/);
  await expect(p.locator("#legend")).toContainText("$");
  await expect(p).toHaveURL(/metric=household_income/);
  await expect(p.locator(".year-button", { hasText: "2006" })).toBeDisabled();
});

test("vs Canada recolours a metric by its gap from the national figure", async ({ page: p }) => {
  await p.goto(page("map.html", "?region=ontario&metric=unemployment"));
  await p.getByRole("button", { name: "vs Canada" }).click();
  await expect(p).toHaveURL(/baseline=canada/);
  await expect(p.locator("#legend")).toContainText("Below Canada");
  await expect(p.locator("#legend-tip")).toContainText("Canada's 7.7%");
  await p.selectOption("#metric", "population");
  await expect(p.locator("#baseline")).toBeHidden();
});

test("dot density toggles on and switches colour scheme", async ({ page: p }) => {
  await p.goto(page("map.html", "?region=ontario"));
  await p.getByRole("button", { name: "Dots" }).click();
  await expect(p.locator("#headline")).toHaveText("13.4 million Ontarians, by age");
  await expect(p.locator("#legend")).toContainText("1 dot = 1,000 people");
  await expect(p.locator("canvas.dot-layer")).toHaveCount(1);
  await p.selectOption("#scheme", "tenure");
  await expect(p.locator("#headline")).toHaveText(/Ontario households, by tenure/);
  await expect(p).toHaveURL(/view=dots.*dots=tenure/);
  await p.getByRole("button", { name: "Map" }).click();
  await expect(p.locator("canvas.dot-layer")).toHaveCount(0);
});

test("clicking a division opens its profile and Escape closes it", async ({ page: p }) => {
  await p.goto(page("map.html", "?region=ontario"));
  await expect(p.locator("#drawer")).toBeHidden();
  await p.mouse.click(640, 300);
  await expect(p.locator("#drawer")).toBeVisible();
  await expect(p.locator(".summary")).toHaveCount(0);
  await expect(p.locator("#drawer .box").first()).toContainText("Growth since 2006");
  await expect(p.locator(".place-name")).toBeFocused();
  await p.keyboard.press("Escape");
  await expect(p.locator("#drawer")).toBeHidden();
});

test("compare swaps the baseline to another division", async ({ page: p }) => {
  await p.goto(page("map.html", "?region=ontario&cd=3520"));
  await p.locator(".similar").first().getByRole("button", { name: /^Compare Toronto with/ }).click();
  await expect(p.locator(".compare-banner")).toContainText("Comparing with");
  await expect(p).toHaveURL(/vs=\d{4}/);
  await p.getByRole("button", { name: /^Stop comparing/ }).click();
  await expect(p.locator(".compare-banner")).toHaveCount(0);
});

test("region menu loads a province", async ({ page: p }) => {
  await p.goto(page("map.html", "?region=ontario&view=dots"));
  await p.selectOption("#region", "quebec");
  await expect(p).toHaveURL(/region=quebec/);
  await expect(p.locator("#headline")).toHaveText(/people in Quebec, by age/);
  await expect(p.locator(".leaflet-interactive")).toHaveCount(98);
});

test("legend info button opens and closes its tip", async ({ page: p }) => {
  await p.goto(page("map.html", "?region=ontario"));
  const info = p.getByRole("button", { name: "About this view" });
  await expect(p.locator("#legend-tip")).toBeHidden();
  await info.click();
  await expect(p.locator("#legend-tip")).toBeVisible();
  await expect(p.locator("#legend-tip")).toContainText("Ontario census divisions");
  await p.mouse.move(640, 300);
  await expect(p.locator("#legend-tip")).toBeVisible();
  await p.keyboard.press("Escape");
  await expect(p.locator("#legend-tip")).toBeHidden();
});

test("theme toggle is remembered across pages", async ({ page: p }) => {
  await p.goto(page("map.html"));
  await p.getByRole("button", { name: /dark and light theme/ }).click();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "light");
  await p.goto(page("main.html"));
  await expect(p.locator("html")).toHaveAttribute("data-theme", "light");
});

test("phone layout fits the command bar and legend on screen @phone", async ({ page: p }) => {
  await p.goto(page("map.html", "?region=ontario"));
  const width = p.viewportSize().width;
  for (const selector of [".commandbar", ".legend-card"]) {
    const box = await p.locator(selector).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
});
