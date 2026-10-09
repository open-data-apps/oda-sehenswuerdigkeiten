// F-110 Regression: POI-IDs und Rohdaten-JSON dürfen nicht in
// Inline-JavaScript-Attributen (onclick="…") landen. Quellebenen-Prüfung
// gegen app/app.js; Verhalten wird zusätzlich per Browserprobe verifiziert.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const appJs = fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8");

assert.ok(!/onclick="window\.sw(OpenDetail|FocusPoi)_/.test(appJs), "F-110: kein onclick mit swOpenDetail/swFocusPoi und POI-ID");
assert.ok(!/onclick="navigator\.clipboard\.writeText\(\$\{/.test(appJs), "F-110: kein JSON.stringify(rawJson) im onclick-Attribut");
assert.ok(/function registerSwActionHandler/.test(appJs), "delegierter Aktions-Handler vorhanden");
assert.ok(/data-sw-action="open-detail"/.test(appJs) && /data-sw-action="focus-poi"/.test(appJs), "data-sw-action-Attribute vorhanden");
assert.ok(/data-sw-copy="/.test(appJs), "Kopier-Button nutzt data-sw-copy");

console.log("✅ test_inline_js_sinks: keine Inline-JS-Senken für DZT-Daten (F-110)");
