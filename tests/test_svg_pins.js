const assert = require('assert');

// SVG Pin Builder Funktion (wird in app.js verwendet)
function createSvgPin(type, isKids, weatherType, isOutlet, isCulinary) {
  let color = "#16a34a"; // Outdoor default
  let glyph = "🌲";

  if (type === "center") {
    color = "#d97706";
    glyph = "★";
  } else if (isOutlet) {
    color = "#c026d3";
    glyph = "🛍️";
  } else if (isCulinary) {
    color = "#b91c1c";
    glyph = "🍷";
  } else if (isKids) {
    color = "#ea580c";
    glyph = "🧸";
  } else if (weatherType === "indoor") {
    color = "#2563eb";
    glyph = "🏛️";
  } else if (weatherType === "hybrid") {
    color = "#7c3aed";
    glyph = "✨";
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42" class="sw-svg-pin">
    <defs>
      <filter id="sw-pin-shadow" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <path filter="url(#sw-pin-shadow)" d="M16 0C7.163 0 0 7.163 0 16c0 10.5 13.5 24.3 15.1 25.8a1.2 1.2 0 0 0 1.8 0C18.5 40.3 32 26.5 32 16 32 7.163 24.837 0 16 0z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="16" cy="15" r="9" fill="#ffffff"/>
    <text x="16" y="16" font-size="11" text-anchor="middle" dominant-baseline="central">${glyph}</text>
  </svg>`;

  return { color, glyph, svg };
}

// Tests
console.log('--- TEST: SVG Pin Generation ---');

// 1. Kids Pin
const kidsPin = createSvgPin('poi', true, 'outdoor');
assert.strictEqual(kidsPin.color, '#ea580c', 'Kids pin should be orange');
assert.strictEqual(kidsPin.glyph, '🧸', 'Kids pin glyph should be teddy');
assert(kidsPin.svg.includes('viewBox="0 0 32 42"'), 'SVG must have proper viewBox');
assert(kidsPin.svg.includes('dominant-baseline="central"'), 'SVG must have centered baseline');

// 2. Indoor Pin
const indoorPin = createSvgPin('poi', false, 'indoor');
assert.strictEqual(indoorPin.color, '#2563eb', 'Indoor pin should be blue');
assert.strictEqual(indoorPin.glyph, '🏛️', 'Indoor pin glyph should be temple');

// 3. Outdoor Pin
const outdoorPin = createSvgPin('poi', false, 'outdoor');
assert.strictEqual(outdoorPin.color, '#16a34a', 'Outdoor pin should be green');
assert.strictEqual(outdoorPin.glyph, '🌲', 'Outdoor pin glyph should be tree');

// 4. Center Pin
const centerPin = createSvgPin('center', false, 'hybrid');
assert.strictEqual(centerPin.color, '#d97706', 'Center pin should be amber');
assert.strictEqual(centerPin.glyph, '★', 'Center pin glyph should be star');

// 5. Outlet Pin
const outletPin = createSvgPin('poi', false, 'indoor', true, false);
assert.strictEqual(outletPin.color, '#c026d3', 'Outlet pin should be magenta');
assert.strictEqual(outletPin.glyph, '🛍️', 'Outlet pin glyph should be shopping bag');

// 6. Culinary Pin
const culinaryPin = createSvgPin('poi', false, 'outdoor', false, true);
assert.strictEqual(culinaryPin.color, '#b91c1c', 'Culinary pin should be ruby red');
assert.strictEqual(culinaryPin.glyph, '🍷', 'Culinary pin glyph should be wine glass');

console.log('✅ All SVG Pin tests PASSED!');
