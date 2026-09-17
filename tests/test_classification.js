const assert = require('assert');

// 1. Kinder & Familie Klassifikation (Schema-basiert)
function classifyKidsFriendly(poi) {
  if (!poi) return false;
  const types = Array.isArray(poi['@type']) ? poi['@type'] : [poi['@type'] || ''];
  const typeStr = types.join(' ').toLowerCase();
  
  const kidsTypes = ['playground', 'amusementpark', 'waterpark', 'zoo', 'aquarium', 'themepark'];
  if (kidsTypes.some(t => typeStr.includes(t))) {
    return true;
  }

  // Schema-Property: audience oder typicalAgeRange
  const audience = poi['schema:audience'] || poi['audience'];
  if (audience) {
    const audStr = JSON.stringify(audience).toLowerCase();
    if (audStr.includes('kinder') || audStr.includes('family') || audStr.includes('familie') || audStr.includes('child')) {
      return true;
    }
  }

  return false;
}

// 2. Wetterfest / Indoor vs. Outdoor Klassifikation (Schema-basiert)
function classifyWeatherType(poi) {
  if (!poi) return 'hybrid';
  const types = Array.isArray(poi['@type']) ? poi['@type'] : [poi['@type'] || ''];
  const typeStr = types.join(' ').toLowerCase();

  const indoorTypes = [
    'museum', 'artgallery', 'church', 'placeofworship', 'civicstructure', 
    'dayspa', 'publicswimmingpool', 'library', 'aquarium'
  ];
  if (indoorTypes.some(t => typeStr.includes(t))) return 'indoor';

  const outdoorTypes = [
    'park', 'landform', 'hikingtrail', 'trail', 'naturereserve', 
    'campground', 'playground', 'mountain', 'beach'
  ];
  if (outdoorTypes.some(t => typeStr.includes(t))) return 'outdoor';

  return 'hybrid';
}

// 3. Kostenloser Eintritt Klassifikation (rein nach Schema.org isAccessibleForFree)
function isFreeAdmission(poi) {
  if (!poi) return false;
  const val = poi['schema:isAccessibleForFree'];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  if (typeof val === 'object' && val && val['@value'] !== undefined) {
    return String(val['@value']).toLowerCase() === 'true';
  }
  return false;
}

// 4. Outlet & Werksverkauf Klassifikation (rein nach Schema.org / ODTA Typen)
function classifyOutlet(poi) {
  if (!poi) return false;
  const types = Array.isArray(poi['@type']) ? poi['@type'] : [poi['@type'] || ''];
  const typeStr = types.join(' ').toLowerCase();
  
  const outletTypes = ['outletstore', 'shoppingcenter', 'factoryoutlet'];
  return outletTypes.some(t => typeStr.includes(t));
}

// 5. Genuss & Brauerei/Weingut Klassifikation (rein nach Schema.org / ODTA Typen)
function classifyCulinary(poi) {
  if (!poi) return false;
  const types = Array.isArray(poi['@type']) ? poi['@type'] : [poi['@type'] || ''];
  const typeStr = types.join(' ').toLowerCase();

  // Sakralbauten / Kirchen sind NIEMALS Kulinarik/Genuss
  if (typeStr.includes('placeofworship') || typeStr.includes('church')) {
    return false;
  }

  const culinaryTypes = [
    'brewery', 'winery', 'distillery', 'foodestablishment', 
    'barorpub', 'restaurant', 'culinaryexperience'
  ];
  return culinaryTypes.some(t => typeStr.includes(t));
}

// 6. Normalisierung von DZT-Rohobjekten
function normalizeDztPoi(rawPoi, refLat, refLng) {
  if (!rawPoi) return null;

  const id = rawPoi['@id'] || '';
  const name = typeof rawPoi['schema:name'] === 'object' ? (rawPoi['schema:name']['@value'] || '') : (rawPoi['schema:name'] || 'Unbekannte Sehenswürdigkeit');
  
  let description = '';
  if (Array.isArray(rawPoi['schema:description'])) {
    const deEntry = rawPoi['schema:description'].find(d => typeof d === 'object' && d['@language'] === 'de') || rawPoi['schema:description'][0];
    description = typeof deEntry === 'object' ? (deEntry['@value'] || '') : String(deEntry || '');
  } else if (typeof rawPoi['schema:description'] === 'object') {
    description = rawPoi['schema:description']['@value'] || '';
  } else {
    description = rawPoi['schema:description'] || '';
  }

  // Geo
  let lat = null;
  let lng = null;
  const geo = rawPoi['schema:geo'];
  if (geo) {
    const rawLat = geo['schema:latitude'] || geo['latitude'];
    const rawLng = geo['schema:longitude'] || geo['longitude'];
    lat = typeof rawLat === 'object' ? parseFloat(rawLat['@value']) : parseFloat(rawLat);
    lng = typeof rawLng === 'object' ? parseFloat(rawLng['@value']) : parseFloat(rawLng);
  }

  // Address
  const addr = rawPoi['schema:address'] || {};
  const street = addr['schema:streetAddress'] || addr['streetAddress'] || '';
  const postalCode = addr['schema:postalCode'] || addr['postalCode'] || '';
  const city = addr['schema:addressLocality'] || addr['schema:adressLocality'] || addr['addressLocality'] || '';
  const region = addr['schema:addressRegion'] || addr['addressRegion'] || '';

  // Image
  let imageUrl = '';
  let imageLicense = '';
  let imageCopyright = '';
  let images = [];
  const img = rawPoi['schema:image'];
  if (Array.isArray(img) && img.length > 0) {
    images = img.map(i => {
      if (typeof i === 'string') {
        return { url: i, license: '', copyright: '' };
      } else if (typeof i === 'object' && i) {
        return {
          url: i['schema:contentUrl'] || i['contentUrl'] || '',
          license: i['schema:license'] || i['license'] || '',
          copyright: i['schema:copyrightNotice'] || i['copyrightNotice'] || ''
        };
      }
      return null;
    }).filter(i => i && i.url);
    if (images.length > 0) {
      imageUrl = images[0].url;
      imageLicense = images[0].license;
      imageCopyright = images[0].copyright;
    }
  } else if (typeof img === 'object' && img) {
    const url = img['schema:contentUrl'] || img['contentUrl'] || '';
    if (url) {
      imageUrl = url;
      imageLicense = img['schema:license'] || img['license'] || '';
      imageCopyright = img['schema:copyrightNotice'] || img['copyrightNotice'] || '';
      images = [{ url, license: imageLicense, copyright: imageCopyright }];
    }
  } else if (typeof img === 'string' && img) {
    imageUrl = img;
    images = [{ url: img, license: '', copyright: '' }];
  }

  // Distanzberechnung wenn Referenzpunkt vorhanden (Haversine-Formel)
  let distanceKm = null;
  if (lat !== null && lng !== null && refLat && refLng && !isNaN(lat) && !isNaN(lng)) {
    const R = 6371; // km
    const dLat = (lat - refLat) * Math.PI / 180;
    const dLon = (lng - refLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(refLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceKm = Math.round(R * c * 10) / 10;
  }

  const isOutlet = classifyOutlet(rawPoi);
  const isCulinary = classifyCulinary(rawPoi);

  let category = 'attraction';
  if (isOutlet) category = 'outlet';
  else if (isCulinary) category = 'culinary';

  return {
    id,
    name,
    description,
    lat,
    lng,
    street,
    postalCode,
    city,
    region,
    imageUrl,
    imageLicense,
    imageCopyright,
    images,
    distanceKm,
    category,
    isOutlet,
    isCulinary,
    isKidsFriendly: classifyKidsFriendly(rawPoi),
    weatherType: classifyWeatherType(rawPoi),
    isFree: isFreeAdmission(rawPoi),
    raw: rawPoi
  };
}

// 7. SPARQL Binding Conversion
function convertSparqlBindingToPoi(b) {
  const types = b.types && b.types.value ? b.types.value.split(",") : ["https://schema.org/TouristAttraction"];
  return {
    "@id": b.s ? b.s.value : "",
    "@type": types,
    "schema:name": b.name ? b.name.value : "Sehenswürdigkeit",
    "schema:description": b.desc ? b.desc.value : "",
    "schema:geo": (b.lat && b.lng) ? {
      "@type": "GeoCoordinates",
      "schema:latitude": parseFloat(b.lat.value),
      "schema:longitude": parseFloat(b.lng.value)
    } : null,
    "schema:address": {
      "@type": "PostalAddress",
      "schema:streetAddress": b.street ? b.street.value : "",
      "schema:postalCode": b.postal ? b.postal.value : "",
      "schema:addressLocality": b.city ? b.city.value : ""
    },
    "schema:image": b.img ? {
      "@type": "ImageObject",
      "schema:contentUrl": b.img.value
    } : null,
    "schema:isAccessibleForFree": b.free ? (b.free.value === "true" || b.free.value === "1") : undefined
  };
}

// ==================== TEST SUITE ====================
console.log('--- TEST: Classification & Normalization (Schema-Standard) ---');

// 1. Kids (Schema-based)
assert.strictEqual(classifyKidsFriendly({'@type': 'https://schema.org/Playground'}), true, 'Playground must be kids-friendly');
assert.strictEqual(classifyKidsFriendly({'@type': ['https://schema.org/AmusementPark']}), true, 'AmusementPark must be kids-friendly');
assert.strictEqual(classifyKidsFriendly({'@type': ['https://schema.org/WaterPark']}), true, 'WaterPark must be kids-friendly');
assert.strictEqual(classifyKidsFriendly({'@type': ['https://schema.org/TouristAttraction'], 'schema:audience': {'@type': 'PeopleAudience', 'audienceType': 'Family'}}), true, 'Family audience must be kids-friendly');
assert.strictEqual(classifyKidsFriendly({'@type': ['https://schema.org/Church'], 'schema:name': 'Kirchenarchiv', 'schema:description': 'Urkunden von 1400 mit Erwähnung von Kindern'}), false, 'Historical mention of kids does not make Church kids-friendly');

// 2. Weather (Schema-based)
assert.strictEqual(classifyWeatherType({'@type': 'https://schema.org/Museum'}), 'indoor', 'Museum is indoor');
assert.strictEqual(classifyWeatherType({'@type': 'https://schema.org/Park'}), 'outdoor', 'Park is outdoor');
assert.strictEqual(classifyWeatherType({'@type': 'https://schema.org/PlaceOfWorship'}), 'indoor', 'Church/PlaceOfWorship is indoor');
assert.strictEqual(classifyWeatherType({'@type': 'https://schema.org/NatureReserve'}), 'outdoor', 'NatureReserve is outdoor');
assert.strictEqual(classifyWeatherType({'@type': 'https://schema.org/TouristAttraction'}), 'hybrid', 'Generic attraction is hybrid');

// 3. Free Admission (Schema-based)
assert.strictEqual(isFreeAdmission({'schema:isAccessibleForFree': true}), true, 'Boolean true is free');
assert.strictEqual(isFreeAdmission({'schema:isAccessibleForFree': {'@value': 'true'}}), true, 'Object @value true is free');
assert.strictEqual(isFreeAdmission({'schema:isAccessibleForFree': 'true'}), true, 'String true is free');
assert.strictEqual(isFreeAdmission({'schema:isAccessibleForFree': false}), false, 'Boolean false is not free');
assert.strictEqual(isFreeAdmission({'schema:name': 'Beliebiger Ort ohne Free Property'}), false, 'No free property means false');

// 4. Outlet & Werksverkauf (Schema-based)
assert.strictEqual(classifyOutlet({'@type': ['https://schema.org/Store', 'https://schema.org/OutletStore']}), true, 'OutletStore must be outlet');
assert.strictEqual(classifyOutlet({'@type': ['https://schema.org/ShoppingCenter']}), true, 'ShoppingCenter must be outlet');
assert.strictEqual(classifyOutlet({'@type': ['https://schema.org/TouristAttraction'], 'schema:name': 'Burg Hohenzollern'}), false, 'Burg Hohenzollern is not an outlet');

// 5. Genuss & Brauerei/Weingut (Schema-based)
assert.strictEqual(classifyCulinary({'@type': ['https://schema.org/Brewery']}), true, 'Brewery must be culinary');
assert.strictEqual(classifyCulinary({'@type': ['https://schema.org/Winery']}), true, 'Winery must be culinary');
assert.strictEqual(classifyCulinary({'@type': ['https://schema.org/Distillery']}), true, 'Distillery must be culinary');
assert.strictEqual(classifyCulinary({'@type': ['https://schema.org/FoodEstablishment']}), true, 'FoodEstablishment must be culinary');

// *** DER ENTSCHEIDENDE TESTFALL: Talheimer Bergkirche ***
const talheimerBergkirche = {
  '@id': 'https://mein.toubiz.de/api/v1/article/017345e5-c49f-408e-9eb0-3a47ed4eaa1e',
  '@type': [
    'https://schema.org/Place',
    'https://schema.org/LandmarksOrHistoricalBuildings',
    'https://schema.org/TouristAttraction',
    'https://schema.org/PlaceOfWorship',
    'https://schema.org/Church',
    'https://odta.io/voc/Infrastructure'
  ],
  'schema:name': 'Talheimer Bergkirche',
  'schema:description': 'Nach Beendigung des Erbfolgestreits und der Untersagung, die Gebäude in ein Brauhaus umzubauen, wurde das gesamte Anwesen 1766 abgebrochen.'
};
assert.strictEqual(classifyCulinary(talheimerBergkirche), false, 'Talheimer Bergkirche MUST NOT be classified as culinary despite historical Brauhaus text!');

// 6. Normalization with SPARQL binding
const sparqlBinding = {
  s: { value: "https://mein.toubiz.de/api/v1/article/a1b4a68d" },
  name: { value: "Marktplatz Hechingen" },
  desc: { value: "Zentraler Stadtraum mit Kugelbahn für Kinder und viel Grün." },
  lat: { value: "48.3525" },
  lng: { value: "8.9639" },
  street: { value: "Marktplatz 1" },
  postal: { value: "72379" },
  city: { value: "Hechingen" },
  types: { value: "https://schema.org/Place,https://schema.org/Playground,https://schema.org/TouristAttraction" },
  img: { value: "https://mein.toubiz.de/api/v1/media/img123/view" },
  free: { value: "true" }
};

const converted = convertSparqlBindingToPoi(sparqlBinding);
const normSparql = normalizeDztPoi(converted, 48.2917, 9.1122);
assert.strictEqual(normSparql.name, "Marktplatz Hechingen");
assert.strictEqual(normSparql.lat, 48.3525);
assert.strictEqual(normSparql.isKidsFriendly, true, "Playground type makes it kids-friendly");
assert.strictEqual(normSparql.isFree, true, "Marktplatz with free=true should be free");
assert.strictEqual(normSparql.weatherType, "outdoor", "Playground type makes it outdoor");
assert.strictEqual(normSparql.images.length, 1);
assert.strictEqual(normSparql.images[0].url, "https://mein.toubiz.de/api/v1/media/img123/view");

// 7. Multi-Image Normalization Test
const multiImagePoi = {
  '@id': 'test_multi_img',
  'schema:name': 'Burg Hohenzollern',
  'schema:image': [
    { 'schema:contentUrl': 'https://example.com/burg1.jpg', 'schema:license': 'CC-BY', 'schema:copyrightNotice': 'Foto 1' },
    { 'schema:contentUrl': 'https://example.com/burg2.jpg', 'schema:license': 'CC-BY-SA', 'schema:copyrightNotice': 'Foto 2' },
    { 'schema:contentUrl': 'https://example.com/burg3.jpg' }
  ]
};
const normMulti = normalizeDztPoi(multiImagePoi, 48.2917, 9.1122);
assert.strictEqual(normMulti.images.length, 3, "Should extract 3 images");
assert.strictEqual(normMulti.imageUrl, 'https://example.com/burg1.jpg', "First image should be default imageUrl");
assert.strictEqual(normMulti.images[1].copyright, 'Foto 2');
assert.strictEqual(normMulti.images[2].url, 'https://example.com/burg3.jpg');

console.log('✅ All Schema-standard classification tests PASSED!');
