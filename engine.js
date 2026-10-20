// aivergunning.nl — snelcheck v0.2 (21-10-2026: vergunningvrije m² zoals Struck, luchtfoto-kaart, monumentcheck)
// Draait in een browser (fetch + CORS). Alleen openbare PDOK-bronnen, geen API-key nodig.
// Gebruik: const res = await snelcheck({adres:'Essenlaan 149 Zwanenburg', wens:'uitbouw', diepte:3})
// wens: 'uitbouw' | 'opbouw' | 'dakkapel' | 'splitsing'   opties: diepte (m), dakvlak ('achter'|'voor'|'zij')

async function snelcheck(input) {
  const stap = input.onStap || (() => {});
  const CRS = 'http://www.opengis.net/def/crs/EPSG/0/28992';
  const RP = 'https://service.pdok.nl/kadaster/ruimtelijke-plannen/wms/v1_0?';
  const BAG = 'https://api.pdok.nl/kadaster/bag/ogc/v2/collections/';
  const BRK = 'https://api.pdok.nl/kadaster/brk-kadastrale-kaart/ogc/v1/collections/perceel/items';
  const RCE = 'https://service.pdok.nl/rce/ps-ch/wms/v1_0?';
  const log = [];
  const j = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); };
  const bboxQ = (x, y, d) => `bbox=${x - d},${y - d},${x + d},${y + d}&bbox-crs=${encodeURIComponent(CRS)}&crs=${encodeURIComponent(CRS)}`;

  // ---------- geometrie-hulpjes ----------
  const ringPip = (p, ring) => { let ins = false; for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) { const [xi, yi] = ring[i], [xk, yk] = ring[k]; if (((yi > p[1]) !== (yk > p[1])) && (p[0] < (xk - xi) * (p[1] - yi) / (yk - yi) + xi)) ins = !ins; } return ins; };
  const polyPip = (p, poly) => ringPip(p, poly[0]) && !poly.slice(1).some(h => ringPip(p, h));
  const pip = (p, g) => !g ? false : g.type === 'Polygon' ? polyPip(p, g.coordinates) : g.type === 'MultiPolygon' ? g.coordinates.some(pl => polyPip(p, pl)) : false;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const add = (a, b, t = 1) => [a[0] + b[0] * t, a[1] + b[1] * t];
  const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const r1 = (v) => Math.round(v * 10) / 10;
  const outerRing = (g) => g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0][0];

  // ---------- 1. adres ----------
  const q = encodeURIComponent(input.adres);
  const loc = (await j(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${q}&rows=1&fq=type:adres&fl=weergavenaam,centroide_rd,adresseerbaarobject_id,nummeraanduiding_id,gemeentenaam,postcode`)).response.docs[0];
  if (!loc) return { fout: 'Adres niet gevonden' };
  stap('adres', loc.weergavenaam);
  const [X, Y] = loc.centroide_rd.match(/POINT\(([\d.]+) ([\d.]+)\)/).slice(1).map(Number);
  let C = [X, Y];

  // ---------- 2. BAG pand + verblijfsobject, BRK perceel ----------
  let perceel = null;
  try { perceel = (await j(`${BRK}?f=json&${bboxQ(X, Y, 0.3)}`)).features[0] || null; } catch (e) { log.push('BRK: ' + e.message); }
  const ringC = (r) => { const q = r.slice(0, -1); return [q.reduce((s, v) => s + v[0], 0) / q.length, q.reduce((s, v) => s + v[1], 0) / q.length]; };
  let pandBox = bboxQ(X, Y, 30);
  if (perceel) { const pr = outerRing(perceel.geometry); const xs = pr.map(v => v[0]), ys = pr.map(v => v[1]); pandBox = `bbox=${Math.min(...xs) - 1},${Math.min(...ys) - 1},${Math.max(...xs) + 1},${Math.max(...ys) + 1}&bbox-crs=${encodeURIComponent(CRS)}&crs=${encodeURIComponent(CRS)}`; }
  const pandenFc = await j(`${BAG}pand/items?f=json&limit=100&${pandBox}`);
  const vboFc = await j(`${BAG}verblijfsobject/items?f=json&${bboxQ(X, Y, 25)}&limit=200`);
  const vbo = vboFc.features.find(f => f.properties.identificatie === loc.adresseerbaarobject_id);
  const vboPt = vbo && vbo.geometry && vbo.geometry.type === 'Point' ? vbo.geometry.coordinates : null;
  const opPerceel = (f) => !perceel || pip(ringC(outerRing(f.geometry)), perceel.geometry);
  const pand = pandenFc.features.find(f => pip(C, f.geometry))
    || (vboPt && pandenFc.features.find(f => pip(vboPt, f.geometry)))
    || pandenFc.features.filter(f => (f.properties.aantal_verblijfsobjecten || 0) > 0 && opPerceel(f)).sort((a, b) => b.properties.aantal_verblijfsobjecten - a.properties.aantal_verblijfsobjecten)[0];
  if (pand && !pip(C, pand.geometry)) { C = ringC(outerRing(pand.geometry)); log.push('Adrespunt ligt niet in het pand; middelpunt pand gebruikt'); }
  const bijgebouwen = perceel ? pandenFc.features.filter(f => f !== pand && (f.properties.aantal_verblijfsobjecten || 0) === 0 && opPerceel(f)) : [];

  stap('woning', pand ? `Pand uit ${pand.properties.bouwjaar}` : 'Pand niet gevonden');
  // ---------- 3. plankaart (Ruimtelijke plannen WMS, GetFeatureInfo op een raster) ----------
  const LAYERS = 'enkelbestemming,dubbelbestemming,bouwvlak,maatvoering,gebiedsaanduiding,bouwaanduiding,functieaanduiding';
  const fi = async (x, y, layers) => {
    const p = new URLSearchParams({ service: 'WMS', version: '1.3.0', request: 'GetFeatureInfo', layers, query_layers: layers, styles: '', crs: 'EPSG:28992', bbox: `${x - 0.5},${y - 0.5},${x + 0.5},${y + 0.5}`, width: '3', height: '3', i: '1', j: '1', info_format: 'application/json', feature_count: '30' });
    try { return (await j(RP + p)).features || []; } catch (e) { log.push('FI ' + e.message.slice(0, 60)); return []; }
  };
  const pts = [];
  for (let dx = -18; dx <= 18; dx += 6) for (let dy = -18; dy <= 18; dy += 6) pts.push([X + dx, Y + dy]);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; pts.push([X + 28 * Math.cos(a), Y + 28 * Math.sin(a)]); }
  const feats = new Map();
  for (let i = 0; i < pts.length; i += 12) {
    const res = await Promise.all(pts.slice(i, i + 12).map(p => fi(p[0], p[1], LAYERS)));
    res.flat().forEach(f => { if (f.properties.historisch === '0' && !feats.has(f.id)) feats.set(f.id, f); });
  }
  const planFeats = await fi(X, Y, 'bestemmingsplangebied');
  stap('plan', `${feats.size} kaartvlakken gelezen`);
  const all = [...feats.values()];
  const layerOf = (f) => f.id.split('.')[0];
  const at = (p, layer) => all.filter(f => layerOf(f).startsWith(layer) && pip(p, f.geometry));

  // hoofdplan = jongste plan met een enkelbestemming op het adrespunt
  const enkelHier = at(C, 'enkelbestemming').sort((a, b) => (b.properties.datum || '').localeCompare(a.properties.datum || ''));
  const hoofd = enkelHier[0];
  if (!hoofd) return { fout: 'Geen bestemmingsplan gevonden op dit punt (mogelijk al nieuw omgevingsplan in het DSO).', adres: loc.weergavenaam };
  const planId = hoofd.properties.plangebied;
  const inPlan = (f) => f.properties.plangebied === planId;
  const enkelAt = (p) => { const e = at(p, 'enkelbestemming'); return (e.find(inPlan) || e.sort((a, b) => (b.properties.datum || '').localeCompare(a.properties.datum || ''))[0]); };
  const bouwvlakAt = (p) => at(p, 'bouwvlak').some(inPlan);
  const dubbelAt = (p) => at(p, 'dubbelbestemming').map(f => f.properties.naam);

  // ---------- 4. oriëntatie: waar ligt de straat? ----------
  let voor = null, best = 1e9;
  for (const f of all) {
    if (layerOf(f) !== 'enkelbestemming' || !/^verkeer/i.test(f.properties.naam)) continue;
    for (const p of pts) if (pip(p, f.geometry)) { const d = Math.hypot(p[0] - X, p[1] - Y); if (d < best) { best = d; voor = norm(sub(p, C)); } }
  }
  const ring = pand ? outerRing(pand.geometry) : null;
  if (!voor) { voor = [0, -1]; log.push('Straatrichting niet gevonden; aangenomen'); }
  // verfijnen: hoofdrichting van de gevels (gewogen hoek mod 90°), dan de as die het best bij de straatkant past
  if (ring) {
    let sx = 0, sy = 0;
    for (let i = 1; i < ring.length; i++) { const e = sub(ring[i], ring[i - 1]); const L = Math.hypot(e[0], e[1]); const th = Math.atan2(e[1], e[0]) * 4; sx += L * Math.cos(th); sy += L * Math.sin(th); }
    const th = Math.atan2(sy, sx) / 4; const axes = [[Math.cos(th), Math.sin(th)], [-Math.sin(th), Math.cos(th)]].flatMap(a => [a, [-a[0], -a[1]]]);
    voor = axes.reduce((b, a) => dot(a, voor) > dot(b, voor) ? a : b);
  }
  const A = [-voor[0], -voor[1]]; // achter-richting
  const Lr = [-A[1], A[0]];      // langs de gevel
  // hartlijn door het midden van het perceel (anders door het adrespunt)
  let H = C;
  if (perceel) { const pr = outerRing(perceel.geometry).slice(0, -1); const pc = [pr.reduce((s, v) => s + v[0], 0) / pr.length, pr.reduce((s, v) => s + v[1], 0) / pr.length]; H = add(C, Lr, dot(sub(pc, C), Lr)); }

  // ---------- 5. pand en bouwvlak langs de hartlijn ----------
  const proj = ring ? ring.map(v => dot(sub(v, C), A)) : [0];
  const front = Math.min(...proj), rear = Math.max(...proj);
  const projL = ring ? ring.map(v => dot(sub(v, C), Lr)) : [0];
  const breedte = Math.max(...projL) - Math.min(...projL);
  // pand-oppervlak in bouwvlak (raster 0,5 m)
  let nIn = 0, nTot = 0, tMinBuiten = null;
  if (ring) {
    for (let t = front; t <= rear; t += 0.5) for (let s = Math.min(...projL); s <= Math.max(...projL); s += 0.5) {
      const p = add(add(C, A, t), Lr, s); if (!pip(p, pand.geometry)) continue; nTot++;
      if (bouwvlakAt(p)) nIn++; else if (t > front + 1 && (tMinBuiten == null || t < tMinBuiten)) tMinBuiten = t;
    }
  }
  const diepBuiten = tMinBuiten == null ? 0 : rear - tMinBuiten;
  // profiel achter het pand: per 0,5 m bestemming/dubbel/bouwvlak
  const profiel = [];
  let bouwvlakTot = null;
  // achtergevel op de hartlijn (werkt ook bij L-vormige panden en grote gebouwen)
  // lijn door het adrespunt; valt die snel buiten het perceel, dan de hartlijn van het perceel
  const rearOn = (O) => {
    let last = null; if (ring) for (let t = front - 1; t <= rear + 1; t += 0.25) if (pip(add(O, A, t), pand.geometry)) last = t;
    let eind = null; for (let t = front + 0.5; t <= rear + 1; t += 0.25) { const e = enkelAt(add(O, A, t)); if (!e || e.properties.naam !== hoofd.properties.naam) { eind = t; break; } }
    return Math.min(last ?? rear, eind ?? 1e9);
  };
  const meet = (O) => {
    const r0 = rearOn(O), pr = []; let bt = null;
    for (let t = r0 + 0.25; t <= r0 + 30; t += 0.5) {
      const p = add(O, A, t);
      if (perceel && !pip(p, perceel.geometry)) break;
      const e = enkelAt(p); const bv = bouwvlakAt(p);
      if (bv) bt = t - r0;
      pr.push({ t: r1(t - r0), b: e ? e.properties.naam : '?', d: dubbelAt(p).join(' + '), bv });
    }
    return { pr, bt };
  };
  let m1 = meet(C); if (m1.pr.length < 6 && perceel) { const m2 = meet(H); if (m2.pr.length > m1.pr.length) m1 = m2; }
  profiel.push(...m1.pr); bouwvlakTot = m1.bt;
  const zones = []; for (const s of profiel) { const z = zones[zones.length - 1]; const key = s.b + '|' + s.d; if (z && z.key === key) z.tot = s.t + 0.25; else zones.push({ key, bestemming: s.b, dubbel: s.d, van: r1(s.t - 0.25), tot: r1(s.t + 0.25) }); }

  // ---------- 6. bebouwingsgebied, bestaande bijgebouwen, resterende m² (bruidsschat 22.36) ----------
  // halfvlak-clip (Sutherland-Hodgman): houd punten met dot(p, n) >= c
  const clip = (ring, n, c) => { const out = []; const pts0 = ring.slice(0, -1); for (let i = 0; i < pts0.length; i++) { const P = pts0[i], Q = pts0[(i + 1) % pts0.length]; const dp = dot(P, n) - c, dq = dot(Q, n) - c; if (dp >= 0) out.push(P); if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); } } if (out.length) out.push(out[0]); return out; };
  const opp = (r) => { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(s / 2); };
  let achtererf = null, perceelOpp = null, bestaand = 0, kaart = null, hoofdOpp = null;
  const c0 = dot(C, A) + front + 1; // grens achtererfgebied: 1 m achter de voorkant van het hoofdgebouw
  if (ring) hoofdOpp = Math.round(opp(ring) * 10) / 10;
  if (perceel) {
    perceelOpp = perceel.properties.kadastrale_grootte_waarde;
    const pr = outerRing(perceel.geometry);
    const gebiedRing = clip(pr, A, c0);
    const pandAchter = ring ? clip(ring, A, c0) : [];
    achtererf = Math.round(Math.max(0, opp(gebiedRing) - (pandAchter.length ? opp(pandAchter) : 0)));
    bestaand = Math.round(bijgebouwen.reduce((s, f) => { const r = clip(outerRing(f.geometry), A, c0); return s + (r.length ? opp(r) : 0); }, 0) * 10) / 10;
    const zone4 = clip(clip(pr, A, dot(C, A) + rear), [-A[0], -A[1]], -(dot(C, A) + rear + 4));
    const allPts = pr.concat(ring || []); const xs = allPts.map(v => v[0]), ys = allPts.map(v => v[1]);
    const rr = (r) => r.map(v => [r1(v[0]), r1(v[1])]);
    kaart = { bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(r1), perceel: rr(pr), pand: ring ? rr(ring) : null, bijgebouwen: bijgebouwen.map(f => rr(outerRing(f.geometry))), gebied: rr(gebiedRing), zone4: zone4.length ? rr(zone4) : null, straat: voor.map(r1) };
  }
  const maxBijb = (bg) => bg == null ? null : bg <= 100 ? 0.5 * bg : bg <= 300 ? 50 + 0.2 * (bg - 100) : Math.min(150, 90 + 0.1 * (bg - 300));

  // ---------- 7. aanduidingen, maatvoering, monument ----------
  const uniq = (a) => [...new Set(a)];
  const hier = all.filter(f => pip(C, f.geometry));
  const maat = hier.filter(f => layerOf(f) === 'maatvoering').map(f => f.properties.maatvoering);
  const gebied = uniq(hier.filter(f => layerOf(f).startsWith('gebiedsaanduiding')).map(f => f.properties.naam));
  const dubbelPand = uniq(hier.filter(f => layerOf(f) === 'dubbelbestemming').map(f => f.properties.naam));
  const dubbelAchter = uniq(profiel.slice(0, 16).flatMap(s => s.d ? s.d.split(' + ') : []));
  const aanduiding = uniq(hier.filter(f => /aanduiding/.test(layerOf(f)) && !layerOf(f).startsWith('gebied')).map(f => f.properties.naam));
  let monument = null;
  try {
    const p = new URLSearchParams({ service: 'WMS', version: '1.3.0', request: 'GetFeatureInfo', layers: 'PS.ProtectedSite', query_layers: 'PS.ProtectedSite', styles: '', crs: 'EPSG:28992', bbox: `${X - 0.5},${Y - 0.5},${X + 0.5},${Y + 0.5}`, width: '3', height: '3', i: '1', j: '1', info_format: 'application/json', feature_count: '10' });
    const r = await j(RCE + p); monument = (r.features || []).map(f => f.properties);
  } catch (e) { log.push('RCE: ' + e.message.slice(0, 60)); }
  const bescherming = { rijksmonument: (monument || []).some(m => /rijksmonument/.test(m.namespace || '')), gezicht: ((monument || []).find(m => /gezicht/.test(m.namespace || '')) || {}).text || null, werelderfgoed: (monument || []).some(m => /werelderfgoed/.test(m.namespace || '')) };

  const plan = planFeats.find(f => f.properties.identificatie === planId) || {};
  const tekstUrl = (n) => (all.find(f => f.properties.naam === n && f.properties.verwijzingnaartekst) || {}).properties?.verwijzingnaartekst?.split(',')[0] || '';
  const feiten = {
    adres: loc.weergavenaam, gemeente: loc.gemeentenaam, rd: [r1(X), r1(Y)],
    bag: { pand: pand?.properties.identificatie, bouwjaar: pand?.properties.bouwjaar, vbo: vbo?.properties.identificatie, gebruiksdoel: vbo?.properties.gebruiksdoel, oppervlakte: vbo?.properties.oppervlakte, vboInPand: pand?.properties.aantal_verblijfsobjecten, toevoeging: vbo?.properties.toevoeging || vbo?.properties.huisletter || null },
    perceel: perceel ? { nr: `${perceel.properties.kadastrale_gemeente_waarde} ${perceel.properties.sectie} ${perceel.properties.perceelnummer}`, opp: perceelOpp } : null,
    pand: { diepte: r1(rear - front), breedte: r1(breedte), inBouwvlak: nTot ? Math.round(100 * nIn / nTot) : null, diepteBuitenBouwvlak: r1(diepBuiten) },
    plan: { id: planId, naam: plan.properties?.naam || hoofd.properties.dossierid, datum: hoofd.properties.datum, status: hoofd.properties.dossierstatus, regels: (plan.properties?.verwijzingnaartekst || '').split(',').find(u => /Index|r_.*\.html/.test(u)) || '' },
    bestemming: hoofd.properties.naam, bestemmingTekst: hoofd.properties.verwijzingnaartekst,
    maatvoering: maat, gebiedsaanduidingen: gebied, aanduidingen: aanduiding, dubbelPand, dubbelAchter,
    zonesAchter: zones.map(z => ({ bestemming: z.bestemming, dubbel: z.dubbel, van: z.van, tot: z.tot })),
    bouwvlakLooptDoorAchterPand: bouwvlakTot == null ? 0 : r1(bouwvlakTot),
    achtererf, maxBijbehorend: achtererf == null ? null : Math.round(maxBijb(achtererf) * 10) / 10,
    hoofdgebouw: hoofdOpp, bijgebouwen: { aantal: bijgebouwen.length, opp: bestaand },
    resterend: achtererf == null ? null : Math.max(0, Math.round((maxBijb(achtererf) - bestaand) * 10) / 10),
    kaart, monument, bescherming, straatRichting: voor.map(r1), log
  };
  return { feiten, beoordeling: beoordeel(feiten, input) };
}

// ---------- beslisregels (los te testen) ----------
function beoordeel(F, w) {
  const nl = (v) => String(v).replace('.', ',');
  const regels = [], controle = [];
  const B0 = F.bescherming || {};
  const beschermd = F.gebiedsaanduidingen.some(n => /beschermd|stads- of dorpsgezicht|dorpsgezicht|stadsgezicht/i.test(n)) || B0.rijksmonument || !!B0.gezicht;
  const waardeAchter = F.dubbelAchter.filter(n => /waarde|landschap|cultuurhistorie|groen/i.test(n));
  const waardePand = F.dubbelPand.filter(n => /cultuurhistorie|monument/i.test(n));
  const appartement = F.bag.toevoeging || (F.bag.vboInPand && F.bag.vboInPand > 1);
  const eersteZone = F.zonesAchter[0];
  const achterOk = eersteZone && /wonen|tuin|erf/i.test(eersteZone.bestemming);
  const plan = `${F.plan.naam} (${F.plan.datum})`;
  regels.push({ titel: 'Geldend plan', tekst: `${plan}, bestemming ${F.bestemming}. Sinds 1-1-2024 tijdelijk deel van het omgevingsplan.`, bron: F.bestemmingTekst });
  if (F.maatvoering.length) regels.push({ titel: 'Maatvoering', tekst: F.maatvoering.join('; ').replace(/"/g, ''), bron: '' });
  if (B0.rijksmonument) regels.push({ titel: 'Rijksmonument', tekst: 'De woning is een rijksmonument. Voor vrijwel elke verbouwing is een omgevingsvergunning voor het monument nodig.', bron: 'https://monumentenregister.cultureelerfgoed.nl/' });
  if (B0.gezicht) regels.push({ titel: 'Beschermd gezicht', tekst: `De woning ligt in het beschermd stads- of dorpsgezicht ${B0.gezicht}. Vergunningvrij bouwen is daar beperkt.`, bron: '' });
  if (beschermd && !B0.rijksmonument && !B0.gezicht) controle.push('Mogelijk beschermd stads- of dorpsgezicht volgens het plan: vergunningvrij bouwen is dan beperkt.');
  controle.push('Gemeentelijk monument: niet automatisch te controleren, navragen bij de gemeente.');
  if (waardeAchter.length) controle.push(`Achter de woning ligt een dubbelbestemming (${waardeAchter.join(', ')}): het plan kan bouwen in de tuin beperken of uitsluiten.`);
  if (waardePand.length) controle.push(`Op het pand ligt ${waardePand.join(', ')}: let op cultuurhistorische waarden.`);
  if (appartement) controle.push('Appartementsrecht of meerdere woningen in het pand: toestemming VvE / splitsingsakte nodig.');
  controle.push('Oorspronkelijke achtergevel en eerdere aan-/uitbouwen: aanbouwen die aan de woning vastzitten, telt het Kadaster mee met de woning. Die zijn hier niet afgetrokken; dat volgt uit de archieftekeningen.');
  if (/amsterdam/i.test(F.gemeente)) controle.push('Amsterdam: groen dak met waterberging (Hemelwaterverordening) en eventuele beleidsregels van het stadsdeel.');
  if (F.gebiedsaanduidingen.some(n => /overige zone/i.test(n))) controle.push(`Gebiedsaanduiding ${F.gebiedsaanduidingen.filter(n => /overige zone/i.test(n)).join(', ')}: betekenis nalezen in de planregels (bijv. kelders, grondwater).`);

  let stoplicht = 'oranje', kop = '', tekst = '', stap = '';
  const wens = (w.wens || '').toLowerCase();
  if (wens === 'uitbouw') {
    const d = Number(w.diepte || 4);
    const opp = Math.round(d * F.pand.breedte);
    regels.push({ titel: 'Vergunningvrij (landelijk)', tekst: 'Aan- of uitbouw in het achtererfgebied, binnen 4 m van de oorspronkelijke achtergevel: 1 bouwlaag, max. 0,3 m boven de 1e verdiepingsvloer, max. 5 m hoog (bruidsschat art. 22.27/22.36, Bbl art. 2.29).', bron: 'https://iplo.nl/thema/bouw/bouwen-vergunning-melding/bijbehorende-bouwwerken/stappenplan-bepaling-vergunningvrij-bouwen' });
    if (F.resterend != null) regels.push({ titel: 'Nog vergunningvrij', tekst: `Bebouwingsgebied ca. ${nl(F.achtererf)} m² → maximaal ${nl(F.maxBijbehorend)} m² aan bijbehorende bouwwerken. Er staat al ${nl(F.bijgebouwen.opp)} m² aan bijgebouwen, dus nog ca. ${nl(F.resterend)} m² vrij. Uw uitbouw: ca. ${opp} m².`, bron: '' });
    const wz = F.zonesAchter.filter(z => /waarde|landschap|cultuurhistorie|groen/i.test(z.dubbel + ' ' + z.bestemming));
    const waardeVanaf = wz.length ? Math.min(...wz.map(z => z.van)) : null;
    if (waardeVanaf != null && waardeVanaf > 0) regels.push({ titel: 'Strook achter de woning', tekst: `De eerste ca. ${nl(waardeVanaf)} m achter de woning heeft geen extra waarde-regel; daarachter ${wz[0].dubbel || wz[0].bestemming}.`, bron: '' });
    const raaktWaarde = waardeVanaf != null && waardeVanaf < d;
    if (beschermd || raaktWaarde || !achterOk) {
      stoplicht = 'oranje'; kop = 'Uitzoeken: mogelijk vergunning nodig';
      tekst = 'De uitbouw ligt in een gebied waar extra regels gelden. Vergunningvrij bouwen is daar niet vanzelfsprekend.';
      stap = 'Wij lezen de planregels voor dit perceel na en geven aan welke route past.';
    } else if (d <= 4 && (F.resterend == null || opp <= F.resterend)) {
      stoplicht = 'groen'; kop = 'Waarschijnlijk vergunningvrij';
      tekst = `Een uitbouw van ca. ${nl(d)} m diep aan de achterkant valt naar verwachting onder vergunningvrij bouwen, mits 1 bouwlaag en niet hoger dan 0,3 m boven de verdiepingsvloer.`;
      stap = 'Laat de oorspronkelijke achtergevel en de maten controleren; vergunningvrij betekent wel dat het Bbl (constructie, brand, energie) geldt.';
    } else {
      stoplicht = 'oranje'; kop = 'Vergunning waarschijnlijk nodig';
      tekst = d > 4 ? `Dieper dan 4 m gelden strengere regels (max. 3 m hoog, alleen bijgebruik). Een uitbouw van ${nl(d)} m vraagt waarschijnlijk een vergunning.` : `De uitbouw (ca. ${opp} m²) is groter dan de ca. ${nl(F.resterend)} m² die u nog vergunningvrij mag bijbouwen.`;
      stap = F.bouwvlakLooptDoorAchterPand >= d ? `Het bouwvlak loopt nog ca. ${nl(F.bouwvlakLooptDoorAchterPand)} m door: binnen het plan is een vergunning dan kansrijk.` : 'Toetsing aan de afwijkingsregels van het plan; vaak kansrijk met een goede motivering.';
    }
  } else if (wens === 'opbouw') {
    stoplicht = 'oranje'; kop = 'Vergunning nodig';
    regels.push({ titel: 'Altijd vergunningplichtig', tekst: 'Een opbouw (extra bouwlaag) is nooit vergunningvrij: technische bouwactiviteit en meestal ook omgevingsplanactiviteit.', bron: '' });
    if (F.pand.inBouwvlak != null && F.pand.inBouwvlak < 95) {
      tekst = `Ca. ${100 - F.pand.inBouwvlak}% van de woning (ca. ${nl(F.pand.diepteBuitenBouwvlak)} m diep) ligt buiten het bouwvlak. Een opbouw op dat deel vraagt een afwijking van het plan.`;
      stap = 'Wij zoeken de afwijkingsregel op (vaak tot 6 m bij plat dak) en beoordelen de kans.';
    } else {
      tekst = 'De woning ligt binnen het bouwvlak. Een opbouw past planologisch als de maximale goot- en bouwhoogte niet wordt overschreden.';
      stap = 'Bestaande hoogtes uit het archief halen en het ontwerp binnen de maatvoering houden; dan is het een reguliere aanvraag.';
    }
    controle.push('Constructie: kan de bestaande woning een extra laag dragen? Constructeur nodig.');
  } else if (wens === 'dakkapel') {
    const dv = (w.dakvlak || 'achter').toLowerCase();
    regels.push({ titel: 'Vergunningvrij (landelijk)', tekst: 'Dakkapel in het achterdakvlak of een zijdakvlak niet naar de straat: plat dak, max. 1,75 m hoog, onderkant 0,5–1 m boven de dakvoet, bovenkant > 0,5 m onder de nok, zijkanten > 0,5 m van de dakranden (Bbl art. 2.29).', bron: 'https://iplo.nl/thema/bouw/bouwen-vergunning-melding/dakkapel/' });
    if (beschermd) { stoplicht = 'oranje'; kop = 'Uitzoeken: beschermd gebied'; tekst = 'In een beschermd stads- of dorpsgezicht of bij een monument is een dakkapel meestal vergunningplichtig.'; stap = 'Wij controleren de status en de welstandseisen.'; }
    else if (dv === 'achter') { stoplicht = 'groen'; kop = 'Waarschijnlijk vergunningvrij'; tekst = 'Een dakkapel aan de achterkant is vergunningvrij als hij binnen de landelijke maten blijft.'; stap = 'Maten van het dakvlak controleren (dakvoet, nok, zijkanten).'; }
    else { stoplicht = 'oranje'; kop = 'Vergunning waarschijnlijk nodig'; tekst = 'Aan de voorkant of een zijkant naar de straat is een dakkapel alleen vergunningvrij in een welstandsvrij gebied.'; stap = 'Wij toetsen aan het omgevingsplan en de welstandsnota.'; }
  } else if (wens === 'splitsing') {
    stoplicht = /wonen/i.test(F.bestemming) ? 'oranje' : 'rood';
    kop = stoplicht === 'rood' ? 'Lastig: geen woonbestemming' : 'Maatwerk: gemeentelijke regels';
    tekst = `Woning van ca. ${F.bag.oppervlakte} m² (BAG). Splitsen vraagt meestal een vergunning (omgevingsplan / huisvestingsverordening) en een splitsingstekening; de regels verschillen sterk per gemeente.`;
    stap = `Wij zoeken het splitsingsbeleid van ${F.gemeente} op en toetsen de minimale woninggrootte.`;
    controle.push('Splitsingsbeleid en minimale oppervlakte per woning (gemeente).');
  } else { stoplicht = 'oranje'; kop = 'Maatwerk'; tekst = 'Voor deze wens is geen standaardcheck; wij kijken persoonlijk.'; stap = 'Neem contact op.'; }

  if (F.zonesAchter.length) regels.push({ titel: 'Achter de woning', tekst: F.zonesAchter.slice(0, 4).map(z => `${nl(z.van)}–${nl(z.tot)} m: ${z.bestemming}${z.dubbel ? ' + ' + z.dubbel : ''}`).join(' · '), bron: '' });
  if (F.gebiedsaanduidingen.length) regels.push({ titel: 'Gebiedsaanduidingen', tekst: F.gebiedsaanduidingen.join(', '), bron: '' });
  return { stoplicht, kop, tekst, stap, regels, controle };
}
