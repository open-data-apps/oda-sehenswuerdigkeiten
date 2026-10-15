const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Lädt die ausgelieferte app/app.js; nur DOM-Grenzen werden gefaked.
const noop = () => {};
const source = fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8");
const c = vm.createContext({ console, window: { location: { href: "https://fixture.test/app/", pathname: "/app/" }, addEventListener: noop },
  document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [] } });
vm.runInContext(source, c);

test("DZT-Beschreibung: **fett** wird <strong>, lose Sternchen und Überschriftenzeichen verschwinden, HTML bleibt escaped", () => {
  assert.equal(c.formatDztText("**Ein Bach** prägt"), "<strong>Ein Bach</strong> prägt");
  assert.equal(c.formatDztText("### Abgegangene Spornburg"), "Abgegangene Spornburg");
  assert.equal(c.formatDztText("Waldkirc**\n**h**"), "Waldkirc\n<strong>h</strong>");
  assert.equal(c.formatDztText('<b onclick="x">**a**</b>'), "&lt;b onclick=&quot;x&quot;&gt;<strong>a</strong>&lt;/b&gt;");
});

test("Foto-Katalog zeigt Beschreibungen formatiert", () => {
  const els = {};
  const el = (sel) => (els[sel] = els[sel] || { innerHTML: "", textContent: "" });
  const poi = { id: "p1", name: "Fehlaquelle", description: "**Ein Bach** prägt", city: "Burladingen", region: "", distanceKm: 0.5, imageUrl: "",
    isKidsFriendly: false, weatherType: "outdoor", isFree: false, isOutlet: false, isCulinary: false };
  c.renderCatalogGrid({ uid: "t", root: { querySelector: el }, allPois: [poi], filteredPois: [poi], poisLoaded: true });
  assert.match(els["#t-catalog-grid"].innerHTML, /<strong>Ein Bach<\/strong> prägt/);
});

test("Detailansicht nutzt die Formatierung für die Beschreibung", () => {
  assert.match(source, /formatDztText\(poi\.description \|\| "Für dieses Ziel/);
});

test("Markdown-Links [Text](https://…) werden klickbar, nur http(s), HTML bleibt escaped", () => {
  assert.equal(c.formatDztText("Mehr unter [Burg Hohenzollern](https://www.burg-hohenzollern.com/de) heute"),
    'Mehr unter <a href="https://www.burg-hohenzollern.com/de" target="_blank" rel="noopener noreferrer">Burg Hohenzollern</a> heute');
  assert.equal(c.formatDztText("**[Fett](http://a.de)**"), '<strong><a href="http://a.de" target="_blank" rel="noopener noreferrer">Fett</a></strong>');
  assert.equal(c.formatDztText("[x](javascript:alert(1))"), "[x](javascript:alert(1))");
  assert.equal(c.formatDztText("[x](data:text/html,a)"), "[x](data:text/html,a)");
  assert.equal(c.formatDztText("[x](//evil.de)"), "[x](//evil.de)");
  // Anführungszeichen sind schon escaped und können das href-Attribut nicht verlassen
  assert.equal(c.formatDztText('[a](https://x.de/"onmouseover="y)'),
    '<a href="https://x.de/&quot;onmouseover=&quot;y" target="_blank" rel="noopener noreferrer">a</a>');
});

test("Klick auf einen Link in der Katalogkarte öffnet kein Detail-Modal, Klick auf die Karte schon", () => {
  c.Element = class Element {};
  const handlers = {};
  const root = { addEventListener: (type, fn) => { handlers[type] = fn; }, removeEventListener: noop };
  const opened = [];
  c.openDetailModal = (_state, id) => opened.push(id);
  c.registerSwActionHandler(root, {});
  const card = Object.assign(new c.Element(), { dataset: { swAction: "open-detail", swPoiId: "p1" } });
  const target = (selfMatch) => Object.assign(new c.Element(), {
    closest: (sel) => (sel === "a[href]" ? (selfMatch ? {} : null) : sel === "[data-sw-action]" ? card : null),
  });
  handlers.click({ target: target(true) });
  assert.deepEqual(opened, []);
  handlers.click({ target: target(false) });
  assert.deepEqual(opened, ["p1"]);
});
