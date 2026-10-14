// Opt-in Browserprüfung des Ergebnisumfangs (geladen / gefiltert / angezeigt) gegen die echte
// App unter /app/. Nutzt eine vorhandene Playwright-Installation (PLAYWRIGHT_MODULE) und Chrome.
// Synthetische Datensätze ersetzen nur im Test die lokale Demo-Fixture; externe Anfragen
// (Kartenkacheln, Bilder) werden lokal mit einem leeren Bild beantwortet.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const root = path.resolve(__dirname, "..");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };

function serve() {
  const server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function pois(n) {
  return Array.from({ length: n }, (_, i) => {
    const nr = String(i + 1).padStart(3, "0");
    return { "@id": `https://fixture.test/poi/${nr}`, "@type": ["https://schema.org/TouristAttraction"],
      "schema:name": `Testziel ${nr}`, "schema:description": "Synthetischer Datensatz",
      "schema:geo": { "schema:latitude": String(48.2917 + i * 0.0004), "schema:longitude": "9.1122" },
      "schema:address": { "schema:addressLocality": "Burladingen" } };
  });
}

async function openApp(browser, base, n, viewport) {
  const page = await browser.newPage({ viewport });
  const fehler = [];
  // Bekannt und erwartet: Das Cockpit-Logo nutzt ./assets/ (richtig in ODAS-Live), das unter
  // Live Server /app/assets/ ergibt (404, siehe Skill-Konvention „Pfade zu Dateien aus assets/“).
  const lokalErwartet = (url) => url.endsWith("/app/assets/odas-app-icon.svg");
  page.on("console", (m) => {
    if (m.type() === "error" && !lokalErwartet(m.location().url)) fehler.push(`${m.text()} ${m.location().url}`);
  });
  page.on("pageerror", (e) => fehler.push(String(e)));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.fulfill({ status: 200, contentType: "image/png", body: PNG });
    if (url.pathname.endsWith("/assets/demo-pois.json")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(pois(n)) });
    return route.continue();
  });
  await page.goto(`${base}/app/`);
  await page.waitForFunction((n) => (document.querySelector('[id$="-result-scope"]') || {}).textContent === `Geladen: ${n} · Passend zum Filter: ${n}.`, n, { timeout: 20000 });
  return { page, fehler };
}
const scopeText = (page) => page.locator('[id$="-result-scope"]').textContent();

let server, base, browser;
test.before(async () => {
  server = await serve();
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: "chrome", headless: true });
});
test.after(async () => { await browser?.close(); server?.close(); });

for (const n of [37, 61, 300]) {
  test(`Desktop: ${n} geladen – Katalog, Filter, Nulltreffer, Seitenwechsel`, async () => {
    const { page, fehler } = await openApp(browser, base, n, { width: 1440, height: 900 });
    await page.locator('[id$="-catalog-toggle"]').click();
    const shown = Math.min(n, 60);
    await page.waitForFunction((s) => document.querySelectorAll(".sw-catalog-card").length === s, shown);
    assert.equal(await page.locator('[id$="-catalog-title"]').textContent(), `Sehenswürdigkeiten Katalog (${shown})`);
    assert.equal(await page.locator('[id$="-catalog-scope"]').textContent(),
      `${shown} von ${n} gefilterten Treffern angezeigt · ${n} geladen. Im Foto-Katalog werden höchstens 60 Karten angezeigt.`);
    await page.locator('[id$="-catalog-back-btn"]').click();

    const erwartet = pois(n).filter((p) => p["schema:name"].toLowerCase().includes("testziel 01")).length;
    await page.locator('[id$="-search"]').fill("Testziel 01");
    await page.waitForFunction((t) => document.querySelector('[id$="-result-scope"]').textContent === t, `Geladen: ${n} · Passend zum Filter: ${erwartet}.`);
    await page.locator('[id$="-search"]').fill("zzzz");
    await page.waitForFunction((t) => document.querySelector('[id$="-result-scope"]').textContent === t, `Geladen: ${n} · Passend zum Filter: 0.`);
    assert.match(await page.locator('[id$="-drawer-list"]').textContent(), /Keine Treffer/);
    await page.locator('[id$="-search"]').fill("");
    await page.waitForFunction((t) => document.querySelector('[id$="-result-scope"]').textContent === t, `Geladen: ${n} · Passend zum Filter: ${n}.`);

    await page.evaluate(() => { window.location.hash = "#beschreibung"; });
    await page.waitForFunction(() => /Methodik/.test(document.body.textContent));
    await page.evaluate(() => { window.location.hash = "#startseite"; });
    await page.waitForFunction(() => document.querySelectorAll(".sw-fullscreen-wrapper").length === 1);
    assert.equal(await scopeText(page), `Geladen: ${n} · Passend zum Filter: ${n}.`);
    assert.deepEqual(fehler, []);
    await page.close();
  });
}

test("Mobil 390×844: Hinweise erreichbar, Liste/Karte wechselbar, Katalog begrenzt", async () => {
  const { page, fehler } = await openApp(browser, base, 61, { width: 390, height: 844 });
  await page.locator('[id$="-mobile-view-toggle"]').click();
  const hinweis = page.locator(".sw-result-scope-note");
  await hinweis.scrollIntoViewIfNeeded();
  assert.equal(await hinweis.isVisible(), true);
  const box = await hinweis.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390, `Hinweis ragt aus dem Bild: ${JSON.stringify(box)}`);
  assert.match(await hinweis.textContent(), /höchstens 300 Datensätze/);
  await page.locator('[id$="-mobile-view-toggle"]').click();
  await page.locator('[id$="-catalog-toggle"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".sw-catalog-card").length === 60);
  assert.equal(await page.locator('[id$="-catalog-scope"]').isVisible(), true);
  assert.deepEqual(fehler, []);
  await page.close();
});
