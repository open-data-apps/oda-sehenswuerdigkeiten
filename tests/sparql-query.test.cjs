const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const noop = () => {};
const c = vm.createContext({ console, window: { location: { href: "https://fixture.test/app/", pathname: "/app/" }, addEventListener: noop },
  document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [] } });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8"), c);

// R2-014: Umkreissuche zuerst als Unterabfrage, Typprüfung danach (~12 s → ~4 s am DZT-Endpunkt).
test("mit Koordinaten: Umkreissuche als Unterabfrage vor der Typprüfung", () => {
  const q = c.buildDztSparqlQuery(48.7406, 9.3108, 25);
  const sub = q.indexOf("{ SELECT DISTINCT ?s WHERE {");
  assert.ok(sub > 0 && sub < q.indexOf("con:entities ?s"));
  assert.ok(q.indexOf("con:entities ?s") < q.indexOf("?s a ?targetType"));
  assert.match(q, /FILTER\(\?targetType IN \(schema:TouristAttraction, [^)]*schema:NatureReserve\)\)/);
  assert.doesNotMatch(q, /VALUES \?targetType/);
  assert.match(q, /GROUP BY \?s\s+LIMIT 300$/);
});

test("ohne Koordinaten: unveränderte Typauswahl ohne Unterabfrage", () => {
  const q = c.buildDztSparqlQuery("", "", 25);
  assert.doesNotMatch(q, /SELECT DISTINCT \?s WHERE/);
  assert.match(q, /VALUES \?targetType \{[\s\S]*schema:TouristAttraction[\s\S]*schema:NatureReserve[\s\S]*\}\n  \?s a \?targetType \./);
});
