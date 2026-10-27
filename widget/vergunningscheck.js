/* Mijn Vergunning – vergunningscheck voor in de website (Webflow).
 *
 * Gebruik op een pagina:
 *   <div id="mv-vergunningscheck"></div>
 *   <script src=".../engine.js"></script>
 *   <script src=".../widget/vergunningscheck.js"></script>
 *
 * Optioneel op de div:
 *   data-mail-to      FormSubmit-alias (standaard het alias van Mijn Vergunning)
 *   data-test         "1" = geen mail versturen (voor testen)
 *
 * Stijl: volgt de kleuren en lettertypen van de website via de Webflow-variabelen
 * (--_color---primary, --_color---secondary, enz.), met eigen terugvalwaarden.
 * Meting: stuurt events naar window.dataLayer (vergunningscheck_klaar, vergunningscheck_contact).
 */
(function () {
  'use strict';
  const MAIL_TO_STANDAARD = 'bebd1bf77418ee08d6537b2013ba8a6e';
  const TEL = '06 15 19 19 23';

  const CSS = `
.mvc{--mvc-primair:var(--_color---primary,#2f94ff);--mvc-accent:var(--_color---secondary,#fbf44e);--mvc-donker:var(--_color---dark-bg,#1f212e);--mvc-tekst:var(--_color---dark-text,#303557);--mvc-mut:var(--_color---black-lite,#979aab);--mvc-licht:var(--_color---gray-bg,#fcfcfd);--mvc-lijn:#e5e6ea;--mvc-groen:#1e8e3e;--mvc-groen-zacht:#e7f5ec;--mvc-oranje:#b26a00;--mvc-oranje-zacht:#fff4e0;--mvc-rood:#c5221f;--mvc-rood-zacht:#fdecea;--mvc-primair-zacht:#eaf4ff;
  font-family:Geist,system-ui,sans-serif;color:var(--mvc-tekst);font-size:16px;line-height:1.5;text-align:left;display:grid;gap:24px}
.mvc *{box-sizing:border-box}
.mvc [hidden]{display:none!important}
.mvc select{appearance:auto;min-height:0;line-height:1.5}
.mvc h3,.mvc h4,.mvc .mvc-kop{font-family:Manrope,system-ui,sans-serif;color:var(--mvc-tekst);letter-spacing:-.2px}
.mvc-kaartje{background:#fff;border:1px solid var(--mvc-lijn);border-radius:16px;padding:28px}
@media (max-width:600px){.mvc-kaartje{padding:20px;border-radius:12px}}
.mvc--met-uitslag{grid-template-columns:minmax(0,1fr)}
@media (min-width:992px){.mvc--met-uitslag{grid-template-columns:minmax(0,400px) minmax(0,1fr);align-items:start}.mvc--met-uitslag .mvc-form{position:sticky;top:100px}}
.mvc-veld{display:grid;gap:6px;margin-bottom:18px;position:relative}
.mvc label,.mvc .mvc-label{font-size:14px;font-weight:500;color:var(--mvc-tekst)}
.mvc input[type=text],.mvc input[type=email],.mvc input[type=tel],.mvc input[type=number],.mvc select,.mvc textarea{width:100%;font:16px Geist,system-ui,sans-serif;color:#2e2e2e;background:#fff;border:1px solid var(--mvc-lijn);border-radius:6px;padding:14px 18px;margin:0;height:auto;box-shadow:none}
.mvc textarea{min-height:90px;resize:vertical}
.mvc input:focus,.mvc select:focus,.mvc textarea:focus{outline:2px solid var(--mvc-primair);outline-offset:0;border-color:var(--mvc-primair)}
.mvc-hint{font-size:13px;color:var(--mvc-mut)}
.mvc-rij{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:520px){.mvc-rij{grid-template-columns:1fr}}
.mvc-wensen{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;border:0;padding:0;margin:0 0 18px}
@media (max-width:520px){.mvc-wensen{grid-template-columns:repeat(2,minmax(0,1fr))}}
.mvc-wensen legend{font-size:14px;font-weight:500;margin-bottom:6px;padding:0}
.mvc-wensen input{position:absolute;opacity:0;pointer-events:none}
.mvc-wensen label{display:flex;flex-direction:column;align-items:center;gap:6px;border:1px solid var(--mvc-lijn);border-radius:8px;padding:12px 6px;cursor:pointer;font-size:14px;text-align:center;background:#fff}
.mvc-wensen svg{width:30px;height:24px;fill:none;stroke:currentColor;stroke-width:1.6}
.mvc-wensen input:checked+label{border-color:var(--mvc-primair);background:var(--mvc-primair-zacht);color:var(--mvc-primair);font-weight:600}
.mvc-wensen input:focus-visible+label{outline:2px solid var(--mvc-primair)}
.mvc-sug{position:absolute;top:100%;left:0;right:0;z-index:20;background:#fff;border:1px solid var(--mvc-lijn);border-radius:6px;margin-top:2px;box-shadow:0 8px 24px rgba(0,0,0,.12);overflow:hidden}
.mvc-sug button{display:block;width:100%;text-align:left;border:0;background:none;padding:10px 14px;font:15px Geist,system-ui,sans-serif;color:#2e2e2e;cursor:pointer}
.mvc-sug button:hover,.mvc-sug button.on{background:var(--mvc-primair-zacht)}
.mvc-check{display:flex;gap:10px;align-items:flex-start;font-size:13px;font-weight:400!important;color:var(--mvc-tekst);margin:4px 0 18px;cursor:pointer}
.mvc-check input{margin-top:3px;width:16px;height:16px;flex:none;accent-color:var(--mvc-primair)}
.mvc-check a{color:var(--mvc-primair)}
.mvc-knop{display:block;width:100%;border:0;cursor:pointer;background:var(--mvc-accent);color:var(--mvc-donker);font:700 16px Manrope,system-ui,sans-serif;padding:14px 18px;text-align:center;text-decoration:none;border-radius:0}
.mvc-knop:hover{filter:brightness(.96)}
.mvc-knop:disabled{opacity:.6;cursor:wait}
.mvc-knop--rand{background:#fff;border:1.5px solid var(--mvc-donker)}
.mvc-fout{color:var(--mvc-rood);font-size:14px;margin-top:10px;min-height:0}
.mvc-fout:empty{display:none}
.mvc-stappen{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:8px;font-size:14px;color:var(--mvc-mut)}
.mvc-stappen li{display:flex;gap:10px;align-items:center}
.mvc-stappen .dot{width:18px;height:18px;border-radius:50%;border:2px solid var(--mvc-lijn);flex:none}
.mvc-stappen li.bezig .dot{border-color:var(--mvc-primair);border-top-color:transparent;animation:mvc-draai .8s linear infinite}
.mvc-stappen li.klaar{color:var(--mvc-tekst)}.mvc-stappen li.klaar .dot{background:var(--mvc-groen);border-color:var(--mvc-groen)}
.mvc-stappen .wat{margin-left:auto;font-size:12px;color:var(--mvc-mut);max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@keyframes mvc-draai{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.mvc-stappen li.bezig .dot{animation:none}}
.mvc-voet{font-size:12px;color:var(--mvc-mut);margin:16px 0 0}
.mvc-fasen{display:flex;gap:8px;list-style:none;margin:0 0 20px;padding:0}
.mvc-fasen li{flex:1 1 0;min-width:0;font-size:12px;color:var(--mvc-mut);padding:8px 10px;border:1px solid var(--mvc-lijn);border-radius:8px;display:flex;gap:8px;align-items:center;line-height:1.3}
.mvc-fasen b{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--mvc-lijn);color:var(--mvc-tekst);font-size:11px;flex:none}
.mvc-fasen li.nu{border-color:var(--mvc-primair);background:var(--mvc-primair-zacht);color:var(--mvc-tekst)}.mvc-fasen li.nu b{background:var(--mvc-primair);color:#fff}
.mvc-fasen li.klaar b{background:var(--mvc-groen);color:#fff}
@media (max-width:520px){.mvc-fasen{flex-direction:column}}
.mvc-adres{margin:0 0 2px;font-size:20px;font-weight:700}
.mvc-sub{font-size:13px;color:var(--mvc-mut);margin:0 0 16px}
.mvc-oordeel{display:flex;gap:16px;border-radius:12px;padding:18px 20px}
.mvc-licht{display:flex;flex-direction:column;gap:5px;background:var(--mvc-donker);padding:6px;border-radius:8px;height:fit-content;flex:none}
.mvc-licht i{width:16px;height:16px;border-radius:50%;background:#3a4652;display:block}
.mvc-oordeel h3{margin:0 0 4px;font-size:22px}
.mvc-oordeel p{margin:0}
.mvc-oordeel .stap{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(0,0,0,.15);font-size:15px}
.mvc-s-groen{background:var(--mvc-groen-zacht)}.mvc-s-groen h3{color:var(--mvc-groen)}
.mvc-s-oranje{background:var(--mvc-oranje-zacht)}.mvc-s-oranje h3{color:var(--mvc-oranje)}
.mvc-s-rood{background:var(--mvc-rood-zacht)}.mvc-s-rood h3{color:var(--mvc-rood)}
.mvc-m2{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin:16px 0;padding:16px 20px;border-radius:12px;background:var(--mvc-primair-zacht)}
.mvc-m2 .getal{font:800 44px/1 Manrope,system-ui,sans-serif;color:var(--mvc-primair);font-variant-numeric:tabular-nums}
.mvc-m2 .getal small{font-size:18px}
.mvc-m2 p{margin:0;flex:1 1 220px}
.mvc h4{margin:24px 0 8px;font-size:16px;font-weight:700}
.mvc-feiten{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--mvc-lijn);border:1px solid var(--mvc-lijn);border-radius:8px;overflow:hidden;margin:16px 0}
@media (max-width:620px){.mvc-feiten{grid-template-columns:repeat(2,minmax(0,1fr))}}
.mvc-feiten div{background:#fff;padding:10px 12px}
.mvc-feiten dt{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--mvc-mut)}
.mvc-feiten dd{margin:2px 0 0;font-weight:600;font-variant-numeric:tabular-nums}
.mvc-kaart{position:relative;border-radius:10px;overflow:hidden;background:#2b3138;aspect-ratio:4/3}
.mvc-kaart img,.mvc-kaart svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.mvc-kaart img{object-fit:cover}
.mvc-legenda{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--mvc-mut);margin:8px 0 2px}
.mvc-legenda span{display:inline-flex;align-items:center;gap:6px}
.mvc-legenda i{width:16px;height:11px;display:inline-block;border-radius:2px}
.mvc-bron{font-size:11px;color:var(--mvc-mut)}
.mvc-reken{display:grid;grid-template-columns:minmax(0,1fr) auto;border:1px solid var(--mvc-lijn);border-radius:8px;overflow:hidden;font-size:15px}
.mvc-reken div{padding:10px 14px;border-bottom:1px solid var(--mvc-lijn);background:#fff}
.mvc-reken .w{text-align:right;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.mvc-reken .tot{background:var(--mvc-primair-zacht);font-weight:700;border-bottom:0}
.mvc-reken small{display:block;color:var(--mvc-mut);font-size:12px}
.mvc details{margin-top:8px;font-size:14px}.mvc summary{cursor:pointer;color:var(--mvc-primair)}
.mvc-regels4{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media (max-width:620px){.mvc-regels4{grid-template-columns:1fr}}
.mvc-regels4>div{border:1px solid var(--mvc-lijn);border-radius:8px;padding:12px 14px;background:#fff;font-size:14px}
.mvc-regels4 h5{margin:0 0 6px;font:700 14px Manrope,system-ui,sans-serif}
.mvc-regels4 ul{margin:0;padding-left:18px}
.mvc-zones{display:flex;height:28px;border-radius:5px;overflow:hidden;margin:8px 0 2px;border:1px solid var(--mvc-lijn)}
.mvc-zones div{min-width:0;display:flex;align-items:center;justify-content:center;font-size:11px;white-space:nowrap;overflow:hidden;padding:0 4px}
.mvc-zone-pand{background:var(--mvc-donker);color:#fff}
.mvc-zone-tuin{background:var(--mvc-groen-zacht)}.mvc-zone-waarde{background:repeating-linear-gradient(45deg,var(--mvc-oranje-zacht) 0 6px,#fff 6px 10px)}.mvc-zone-overig{background:var(--mvc-primair-zacht)}
.mvc-lijst{margin:0;padding:0;list-style:none}
.mvc-lijst li{display:grid;grid-template-columns:160px minmax(0,1fr);gap:12px;padding:10px 0;border-bottom:1px solid var(--mvc-lijn);font-size:15px}
@media (max-width:520px){.mvc-lijst li{grid-template-columns:1fr;gap:2px}}
.mvc-lijst .t{color:var(--mvc-mut);font-weight:500}
.mvc-lijst a{color:var(--mvc-primair)}
.mvc-controle{margin:8px 0 0;padding-left:18px;font-size:15px}.mvc-controle li{margin-bottom:4px}
.mvc-vervolg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:8px}
@media (max-width:620px){.mvc-vervolg{grid-template-columns:1fr}}
.mvc-vervolg>div{border:1px solid var(--mvc-lijn);border-radius:12px;padding:18px;background:var(--mvc-licht);display:flex;flex-direction:column;gap:10px}
.mvc-vervolg h5{margin:0;font:700 17px Manrope,system-ui,sans-serif}
.mvc-vervolg ul{margin:0;padding-left:18px;font-size:14px;flex:1}
.mvc-prijs{font:800 24px/1 Manrope,system-ui,sans-serif;color:var(--mvc-primair)}.mvc-prijs small{font:400 12px Geist,system-ui,sans-serif;color:var(--mvc-mut)}
.mvc-contact{margin-top:16px;border:1px solid var(--mvc-primair);border-radius:12px;padding:18px;background:var(--mvc-primair-zacht)}
.mvc-contact h4{margin-top:0}
.mvc-ok{background:#fff;border-radius:8px;padding:14px 16px;font-size:15px}.mvc-ok b{color:var(--mvc-groen)}
.mvc-disclaimer{font-size:12px;color:var(--mvc-mut);margin-top:20px}
`;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nl = v => String(v).replace('.', ',');
  const WENS = { uitbouw: 'Uitbouw achterzijde', opbouw: 'Opbouw (extra bouwlaag)', dakkapel: 'Dakkapel', splitsing: 'Woning splitsen' };
  const KLEUR = { groen: '#1e8e3e', oranje: '#e8a33d', rood: '#c5221f' };
  const ICOON = {
    uitbouw: '<path d="M3 21V9l8-6 8 6v12M19 13h8v8H19M1 21h28"/>',
    opbouw: '<path d="M6 21V10h14v11M6 10V4h14v6M2 21h26"/>',
    dakkapel: '<path d="M3 21V12L15 3l12 9v9M15 9h7v5h-7M1 21h28"/>',
    splitsing: '<path d="M4 21V5h22v16M15 5v16M4 13h22M1 21h28"/>'
  };

  function meet(event, data) {
    try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event }, data || {})); } catch (e) { }
  }

  function init(root) {
    if (root.dataset.mvcKlaar) return; root.dataset.mvcKlaar = '1';
    if (!document.getElementById('mvc-css')) { const st = document.createElement('style'); st.id = 'mvc-css'; st.textContent = CSS; document.head.appendChild(st); }
    const MAIL_TO = root.dataset.mailTo || MAIL_TO_STANDAARD;
    const TEST = root.dataset.test === '1';
    const uid = 'mvc' + Math.random().toString(36).slice(2, 7);
    root.classList.add('mvc');
    root.innerHTML = `
<form class="mvc-form mvc-kaartje" novalidate>
  <div class="mvc-veld"><label for="${uid}-adres">Adres</label>
    <input id="${uid}-adres" name="adres" type="text" autocomplete="off" placeholder="Straat, huisnummer en plaats" required>
    <div class="mvc-sug" hidden></div></div>
  <fieldset class="mvc-wensen"><legend>Wat wil je bouwen?</legend>
    ${Object.keys(ICOON).map((k, i) => `<input type="radio" name="wens" id="${uid}-w-${k}" value="${k}"${i === 0 ? ' checked' : ''}><label for="${uid}-w-${k}"><svg viewBox="0 0 30 24" aria-hidden="true">${ICOON[k]}</svg>${{ uitbouw: 'Uitbouw', opbouw: 'Opbouw', dakkapel: 'Dakkapel', splitsing: 'Splitsen' }[k]}</label>`).join('')}
  </fieldset>
  <div class="mvc-rij">
    <div class="mvc-veld" data-voor="uitbouw"><label for="${uid}-diepte">Diepte uitbouw (m)</label><input id="${uid}-diepte" type="number" min="1" max="12" step="0.5" value="3"><span class="mvc-hint">vanaf de achtergevel</span></div>
    <div class="mvc-veld" data-voor="dakkapel" hidden><label for="${uid}-dakvlak">Welk dakvlak?</label><select id="${uid}-dakvlak"><option value="achter">Achterkant</option><option value="voor">Voorkant (straat)</option><option value="zij">Zijkant</option></select></div>
    <div class="mvc-veld"><label for="${uid}-naam">Voornaam</label><input id="${uid}-naam" type="text" autocomplete="given-name" placeholder="Bijv. Sanne"></div>
  </div>
  <div class="mvc-veld"><label for="${uid}-email">E-mailadres</label><input id="${uid}-email" type="email" autocomplete="email" placeholder="naam@voorbeeld.nl" required><span class="mvc-hint">Hier sturen we de uitslag naartoe.</span></div>
  <label class="mvc-check"><input id="${uid}-akkoord" type="checkbox"><span>Mijn Vergunning mag mijn adres en e-mail gebruiken om de check te maken, de uitslag te mailen en contact op te nemen. Zie het <a href="/privacybeleid" target="_blank">privacybeleid</a>.</span></label>
  <button class="mvc-knop" type="submit">Check mijn adres</button>
  <div class="mvc-fout" role="alert"></div>
  <ol class="mvc-stappen" hidden>
    <li data-s="adres"><span class="dot"></span>Adres zoeken<span class="wat"></span></li>
    <li data-s="woning"><span class="dot"></span>Woning en perceel ophalen (Kadaster)<span class="wat"></span></li>
    <li data-s="plan"><span class="dot"></span>Geldend plan lezen<span class="wat"></span></li>
    <li data-s="regels"><span class="dot"></span>Regels toepassen<span class="wat"></span></li>
    <li data-s="mail"><span class="dot"></span>Uitslag mailen<span class="wat"></span></li>
  </ol>
  <p class="mvc-voet">Gebaseerd op openbare gegevens van het Kadaster en de Rijksoverheid en de landelijke regels voor vergunningvrij bouwen. Het is een eerste indicatie, geen besluit. Regels die gemeenten sinds 2024 nieuw in het omgevingsplan hebben opgenomen, zitten er nog niet in.</p>
</form>
<div class="mvc-uitslag mvc-kaartje" hidden aria-live="polite"></div>`;

    const $ = s => root.querySelector(s);
    const form = $('.mvc-form'), uitslag = $('.mvc-uitslag');
    let laatste = null;

    /* wens */
    const wensUI = () => { const w = form.querySelector('input[name=wens]:checked').value; root.querySelectorAll('[data-voor]').forEach(el => el.hidden = el.dataset.voor !== w); };
    form.querySelectorAll('input[name=wens]').forEach(r => r.addEventListener('change', wensUI)); wensUI();

    /* adres-suggesties (PDOK Locatieserver) */
    const adresIn = $(`#${uid}-adres`), sug = $('.mvc-sug'); let sugT, sugI = -1;
    adresIn.addEventListener('input', () => {
      clearTimeout(sugT); const q = adresIn.value.trim(); if (q.length < 4) { sug.hidden = true; return; }
      sugT = setTimeout(async () => {
        try {
          const r = await fetch('https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?rows=5&fq=type:adres&q=' + encodeURIComponent(q));
          const d = (await r.json()).response.docs; sugI = -1;
          sug.innerHTML = d.map(x => `<button type="button">${esc(x.weergavenaam)}</button>`).join(''); sug.hidden = !d.length;
          sug.querySelectorAll('button').forEach(b => b.addEventListener('mousedown', ev => { ev.preventDefault(); adresIn.value = b.textContent; sug.hidden = true; }));
        } catch (e) { sug.hidden = true; }
      }, 220);
    });
    adresIn.addEventListener('keydown', e => {
      const items = [...sug.querySelectorAll('button')]; if (sug.hidden || !items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugI = (sugI + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((b, i) => b.classList.toggle('on', i === sugI)); }
      if (e.key === 'Enter' && sugI >= 0) { e.preventDefault(); adresIn.value = items[sugI].textContent; sug.hidden = true; }
      if (e.key === 'Escape') sug.hidden = true;
    });
    adresIn.addEventListener('blur', () => setTimeout(() => sug.hidden = true, 150));

    /* voortgang */
    const VOLGORDE = ['adres', 'woning', 'plan', 'regels', 'mail'];
    function stap(s, status, wat) { const li = form.querySelector(`.mvc-stappen li[data-s="${s}"]`); if (!li) return; li.className = status; if (wat != null) li.querySelector('.wat').textContent = wat; }
    function volgende(s) { const i = VOLGORDE.indexOf(s); if (i < VOLGORDE.length - 1) stap(VOLGORDE[i + 1], 'bezig'); }

    /* versturen check */
    form.addEventListener('submit', async e => {
      e.preventDefault(); e.stopPropagation();
      const fout = $('.mvc-fout'); fout.textContent = '';
      const adres = adresIn.value.trim(), email = $(`#${uid}-email`).value.trim(), naam = $(`#${uid}-naam`).value.trim();
      const wens = form.querySelector('input[name=wens]:checked').value;
      const w = { adres, wens, diepte: Number($(`#${uid}-diepte`).value) || 3, dakvlak: $(`#${uid}-dakvlak`).value };
      if (adres.length < 5) return fout.textContent = 'Vul een adres in met straat, huisnummer en plaats.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fout.textContent = 'Vul een geldig e-mailadres in, daar sturen we de uitslag naartoe.';
      if (!$(`#${uid}-akkoord`).checked) return fout.textContent = 'Vink aan dat we je gegevens voor de check mogen gebruiken.';
      if (typeof window.snelcheck !== 'function') return fout.textContent = 'De check kon niet worden geladen. Ververs de pagina en probeer het opnieuw.';
      const knop = form.querySelector('.mvc-knop'); knop.disabled = true; knop.textContent = 'Bezig met checken…';
      const lijst = $('.mvc-stappen'); lijst.hidden = false; lijst.querySelectorAll('li').forEach(li => { li.className = ''; li.querySelector('.wat').textContent = ''; });
      stap('adres', 'bezig');
      try {
        const r = await window.snelcheck({ ...w, onStap: (s, wat) => { stap(s, 'klaar', wat); volgende(s); } });
        if (r.fout) throw new Error(r.fout);
        stap('regels', 'klaar', r.beoordeling.stoplicht); stap('mail', 'bezig');
        laatste = { F: r.feiten, B: r.beoordeling, w, email, naam };
        toonUitslag(r.feiten, r.beoordeling, w);
        meet('vergunningscheck_klaar', { wens, stoplicht: r.beoordeling.stoplicht });
        try { if (!TEST) await mail(uitslagBody(r.feiten, r.beoordeling, w, email, naam)); stap('mail', 'klaar', TEST ? 'testmodus' : 'verstuurd'); }
        catch (m) { stap('mail', '', 'niet verstuurd'); fout.textContent = 'De check is klaar, maar de mail kon niet worden verstuurd. De uitslag staat hiernaast.'; }
        if (window.innerWidth < 992) uitslag.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        const net = /fetch|network/i.test(String(err));
        fout.textContent = net ? 'De kaartgegevens zijn nu niet bereikbaar. Probeer het over een paar minuten opnieuw.' : (err.message || 'Er ging iets mis bij de check.');
        lijst.querySelectorAll('li.bezig').forEach(li => li.className = '');
      } finally { knop.disabled = false; knop.textContent = 'Check mijn adres'; }
    });

    /* uitslag tonen */
    function toonUitslag(F, B, w) {
      const lampen = ['rood', 'oranje', 'groen'].map(k => `<i style="background:${k === B.stoplicht ? KLEUR[k] : ''}"></i>`).join('');
      const wensTxt = WENS[w.wens] + (w.wens === 'uitbouw' ? `, ${nl(w.diepte)} m diep` : '') + (w.wens === 'dakkapel' ? `, ${w.dakvlak}kant` : '');
      uitslag.innerHTML = fasen(1) + `
        <h3 class="mvc-adres">${esc(F.adres)}</h3><p class="mvc-sub">${esc(wensTxt)} · gemeente ${esc(F.gemeente || '')}</p>
        <div class="mvc-oordeel mvc-s-${B.stoplicht}"><div class="mvc-licht" aria-hidden="true">${lampen}</div><div><h3>${esc(B.kop)}</h3><p>${esc(B.tekst)}</p><p class="stap"><b>Volgende stap:</b> ${esc(B.stap)}</p></div></div>
        ${F.resterend != null ? `<div class="mvc-m2"><div class="getal">${nl(Math.round(F.resterend))}<small> m²</small></div><p>Zoveel mag je volgens de landelijke regels nog <b>zonder vergunning</b> bijbouwen in je achtertuin, bijvoorbeeld een aanbouw, schuur of overkapping.</p></div>` : ''}
        ${kaart(F.kaart)}
        <dl class="mvc-feiten">
          <div><dt>Bouwjaar</dt><dd>${esc(F.bag && F.bag.bouwjaar || '–')}</dd></div>
          <div><dt>Woonoppervlak</dt><dd>${F.bag && F.bag.oppervlakte ? F.bag.oppervlakte + ' m²' : '–'}</dd></div>
          <div><dt>Perceel</dt><dd>${F.perceel ? F.perceel.opp + ' m²' : '–'}</dd></div>
          <div><dt>Woning (grond)</dt><dd>${F.hoofdgebouw != null ? nl(Math.round(F.hoofdgebouw)) + ' m²' : '–'}</dd></div>
        </dl>
        ${F.achtererf != null ? '<h4>Hoe is dit berekend</h4>' + berekening(F) : ''}
        ${w.wens === 'uitbouw' ? '<h4>Wat mag je zonder vergunning in de achtertuin</h4>' + UITLEG4 : ''}
        ${F.zonesAchter && F.zonesAchter.length ? '<h4>Wat ligt er achter je woning</h4>' + zones(F) : ''}
        <h4>Wat geldt er op jouw adres</h4>
        <ul class="mvc-lijst">${B.regels.filter(r => !(F.zonesAchter && F.zonesAchter.length && r.titel === 'Achter de woning')).map(r => `<li><span class="t">${esc(r.titel)}</span><span>${esc(r.tekst)}${r.bron ? ` <a href="${esc(r.bron)}" target="_blank" rel="noopener">bron</a>` : ''}</span></li>`).join('')}</ul>
        <h4>Laat dit nog controleren</h4>
        <ul class="mvc-controle">${B.controle.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        <h4>Wat kun je nu doen</h4>
        <div class="mvc-vervolg">
          <div><h5>Persoonlijk advies over je uitslag</h5><div class="mvc-prijs">Gratis<small> eerste gesprek</small></div>
            <ul><li>We lezen de regels voor jouw adres na</li><li>We vertellen welke route past: vergunningvrij, vergunning of afwijking</li><li>Je weet waar je aan toe bent voordat je kosten maakt</li></ul>
            <button class="mvc-knop" type="button" data-contact="advies">Vraag advies aan</button></div>
          <div><h5>Tekening en het gesprek met de gemeente</h5><div class="mvc-prijs">Offerte<small> per stap</small></div>
            <ul><li>We maken de bouwkundige tekeningen van je plan</li><li>We voeren het vooroverleg met de gemeente en dienen de aanvraag in</li><li>Je krijgt vooraf een duidelijke prijs per stap</li></ul>
            <button class="mvc-knop mvc-knop--rand" type="button" data-contact="offerte">Offerte aanvragen</button></div>
        </div>
        <div class="mvc-contactvak"></div>
        <p class="mvc-disclaimer">Dit is een automatische eerste indicatie op basis van openbare gegevens. Er kunnen geen rechten aan worden ontleend.</p>`;
      uitslag.hidden = false; root.classList.add('mvc--met-uitslag');
      uitslag.querySelectorAll('[data-contact]').forEach(b => b.addEventListener('click', () => contactForm(b.dataset.contact)));
    }

    function fasen(nu) {
      return `<ol class="mvc-fasen">
        <li class="${nu > 1 ? 'klaar' : 'nu'}"><b>1</b><span>Gratis vergunningscheck</span></li>
        <li class="${nu === 2 ? 'nu' : nu > 2 ? 'klaar' : ''}"><b>2</b><span>Persoonlijk advies</span></li>
        <li class="${nu === 3 ? 'nu' : ''}"><b>3</b><span>Tekening en gemeente</span></li></ol>`;
    }

    function contactForm(soort) {
      if (!laatste) return;
      const advies = soort === 'advies'; const vak = uitslag.querySelector('.mvc-contactvak');
      vak.innerHTML = `<form class="mvc-contact" novalidate>
        <h4>${advies ? 'Vraag gratis advies aan' : 'Vraag een offerte aan voor tekening en gemeente'}</h4>
        <div class="mvc-rij"><div class="mvc-veld"><label for="${uid}-c-naam">Naam</label><input id="${uid}-c-naam" type="text" value="${esc(laatste.naam)}" autocomplete="name"></div>
        <div class="mvc-veld"><label for="${uid}-c-tel">Telefoon (optioneel)</label><input id="${uid}-c-tel" type="tel" autocomplete="tel"></div></div>
        <div class="mvc-veld"><label for="${uid}-c-email">E-mailadres</label><input id="${uid}-c-email" type="email" value="${esc(laatste.email)}" autocomplete="email"></div>
        <div class="mvc-veld"><label for="${uid}-c-opm">Vertel kort wat je wilt</label><textarea id="${uid}-c-opm" placeholder="Bijv. uitbouw van 3 m met een plat dak"></textarea></div>
        <button class="mvc-knop" type="submit">${advies ? 'Advies aanvragen' : 'Offerte aanvragen'}</button>
        <div class="mvc-fout" role="alert"></div></form>`;
      vak.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const cf = vak.querySelector('form');
      cf.addEventListener('submit', async e => {
        e.preventDefault(); e.stopPropagation();
        const f = cf.querySelector('.mvc-fout'); f.textContent = '';
        const b = { naam: cf.querySelector(`#${uid}-c-naam`).value.trim(), email: cf.querySelector(`#${uid}-c-email`).value.trim(), tel: cf.querySelector(`#${uid}-c-tel`).value.trim(), opm: cf.querySelector(`#${uid}-c-opm`).value.trim() };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return f.textContent = 'Vul een geldig e-mailadres in.';
        const k = cf.querySelector('.mvc-knop'); k.disabled = true; k.textContent = 'Bezig…';
        try {
          if (!TEST) await mail(contactBody(soort, b));
          meet('vergunningscheck_contact', { soort, wens: laatste.w.wens, stoplicht: laatste.B.stoplicht });
          vak.innerHTML = `<div class="mvc-contact"><div class="mvc-ok"><b>Aanvraag ontvangen.</b> Dank je wel${b.naam ? ', ' + esc(b.naam) : ''}. We nemen zo snel mogelijk contact met je op via ${esc(b.email)}${b.tel ? ' of ' + esc(b.tel) : ''}.</div></div>`;
          const fz = uitslag.querySelector('.mvc-fasen'); if (fz) fz.outerHTML = fasen(advies ? 2 : 3);
        } catch (err) { f.textContent = `Versturen lukte niet. Probeer het nog eens, bel ${TEL} of mail naar info@mijn-vergunning.nl.`; k.disabled = false; k.textContent = advies ? 'Advies aanvragen' : 'Offerte aanvragen'; }
      });
    }

    /* mail via FormSubmit */
    async function mail(body) {
      const r = await fetch('https://formsubmit.co/ajax/' + MAIL_TO, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || String(j.success) !== 'true') throw new Error(j.message || ('HTTP ' + r.status));
      return j;
    }
    function uitslagBody(F, B, w, email, naam) {
      const top = B.regels.filter(r => !/Achter de woning|Gebiedsaanduidingen/.test(r.titel)).slice(0, 4);
      const tekst = [naam ? `Beste ${naam},` : 'Hallo,', '',
        `Bedankt voor je check. Voor ${WENS[w.wens].toLowerCase()} op ${F.adres} is dit onze eerste inschatting:`, '',
        `UITSLAG: ${B.kop.toUpperCase()}`, B.tekst, '',
        ...(F.resterend != null ? [`NOG VERGUNNINGVRIJ BIJ TE BOUWEN: ca. ${nl(Math.round(F.resterend))} m²`, `  1. Bebouwingsgebied (tuin vanaf 1 m achter de voorgevel): ${nl(F.achtererf)} m²`, `  2. Maximaal vergunningvrij volgens de landelijke staffel: ${nl(F.maxBijbehorend)} m²`, `  3. Al bebouwd met bijgebouwen: ${nl(F.bijgebouwen.opp)} m²`, ''] : []),
        'Wat geldt er:', ...top.map(r => `- ${r.titel}: ${r.tekst}`), '',
        `Volgende stap: ${B.stap}`, '',
        'Laat dit nog controleren:', ...B.controle.map(c => `- ${c}`), '',
        `Wil je zekerheid of de vergunning laten regelen? Beantwoord deze mail of bel ${TEL}, dan bespreken we je plannen. Het eerste gesprek is gratis.`, '',
        'Dit is een automatische eerste indicatie op basis van openbare gegevens (Kadaster en Rijksoverheid via PDOK). Er kunnen geen rechten aan worden ontleend.', '',
        'Met vriendelijke groet,', 'Casper Laan', 'Mijn Vergunning', 'www.mijn-vergunning.nl'].join('\n');
      return {
        _subject: `Nieuwe vergunningscheck (website): ${F.adres} – ${WENS[w.wens]} – ${B.stoplicht}`,
        _template: 'table', _captcha: 'false', _autoresponse: tekst,
        name: naam || '(geen naam)', email, Bron: 'mijn-vergunning.nl/vergunningscheck',
        Adres: F.adres, Gemeente: F.gemeente, Wens: WENS[w.wens] + (w.wens === 'uitbouw' ? `, ${w.diepte} m` : w.wens === 'dakkapel' ? `, ${w.dakvlak}` : ''),
        Uitslag: `${B.stoplicht.toUpperCase()} – ${B.kop}`,
        'Nog vergunningvrij': F.resterend != null ? `${F.resterend} m² (bebouwingsgebied ${F.achtererf}, max ${F.maxBijbehorend}, bijgebouwen ${F.bijgebouwen.opp})` : 'onbekend',
        Monument: F.bescherming ? [F.bescherming.rijksmonument ? 'rijksmonument' : '', F.bescherming.gezicht ? 'beschermd gezicht ' + F.bescherming.gezicht : ''].filter(Boolean).join(', ') || 'nee' : '?',
        Toelichting: B.tekst, 'Volgende stap': B.stap,
        Plan: F.plan ? `${F.plan.naam} (${F.plan.datum}), bestemming ${F.bestemming}` : '-',
        Woning: F.bag ? `bouwjaar ${F.bag.bouwjaar}, ${F.bag.oppervlakte} m², perceel ${F.perceel ? F.perceel.nr + ' (' + F.perceel.opp + ' m²)' : '?'}` : '-',
        Controlepunten: B.controle.join(' | ')
      };
    }
    function contactBody(soort, b) {
      const { F, B, w } = laatste; const advies = soort === 'advies';
      return {
        _subject: `${advies ? 'Adviesaanvraag' : 'Offerteaanvraag'} via vergunningscheck: ${F.adres}`,
        _template: 'table', _captcha: 'false',
        _autoresponse: [b.naam ? `Beste ${b.naam},` : 'Hallo,', '', `Dank voor je aanvraag voor ${F.adres}. We bekijken je situatie en nemen zo snel mogelijk contact met je op om je plannen te bespreken.`, '', 'Met vriendelijke groet,', 'Casper Laan', 'Mijn Vergunning', 'www.mijn-vergunning.nl'].join('\n'),
        name: b.naam || '(geen naam)', email: b.email, Telefoon: b.tel || '-', Soort: advies ? 'Gratis advies' : 'Offerte tekening + gemeente',
        Adres: F.adres, Gemeente: F.gemeente, Wens: WENS[w.wens] + (w.wens === 'uitbouw' ? `, ${w.diepte} m` : w.wens === 'dakkapel' ? `, ${w.dakvlak}` : ''),
        Toelichting_klant: b.opm || '-', Uitslag: `${B.stoplicht.toUpperCase()} – ${B.kop}`,
        'Nog vergunningvrij': F.resterend != null ? `${F.resterend} m²` : 'onbekend'
      };
    }
  }

  /* ---------- weergave-onderdelen ---------- */
  function zones(F) {
    const z = F.zonesAchter.slice(0, 5);
    const cls = x => /waarde|landschap|cultuur/i.test(x.dubbel) ? 'mvc-zone-waarde' : /tuin|wonen|erf/i.test(x.bestemming) ? 'mvc-zone-tuin' : 'mvc-zone-overig';
    return `<div class="mvc-zones" aria-label="Strook achter de woning"><div class="mvc-zone-pand" style="flex:0 0 18%">woning</div>${z.map(x => `<div class="${cls(x)}" style="flex:${Math.max(.6, x.tot - x.van)}" title="${esc(x.bestemming + (x.dubbel ? ' + ' + x.dubbel : ''))}">${nl(x.van)}–${nl(x.tot)} m ${esc(x.dubbel ? x.dubbel.replace('Waarde - ', '') : x.bestemming)}</div>`).join('')}</div><div class="mvc-bron">Gemeten vanaf de achtergevel, langs de lijn door jouw adres.</div>`;
  }
  function kaart(K) {
    if (!K || !K.bbox) return '';
    const pad = 6; let [x0, y0, x1, y1] = K.bbox; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    let w = x1 - x0, h = y1 - y0; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (w / h > 4 / 3) h = w * 3 / 4; else w = h * 4 / 3;
    x0 = cx - w / 2; x1 = cx + w / 2; y0 = cy - h / 2; y1 = cy + h / 2;
    const P = r => r.map((v, i) => (i ? 'L' : 'M') + (v[0] - x0).toFixed(2) + ' ' + (y1 - v[1]).toFixed(2)).join(' ') + ' Z';
    const lw = (w / 400).toFixed(3);
    const src = 'https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0?service=WMS&version=1.3.0&request=GetMap&layers=Actueel_orthoHR&styles=&crs=EPSG:28992&format=image/jpeg&width=1000&height=750&bbox=' + [x0, y0, x1, y1].map(v => v.toFixed(2)).join(',');
    const pid = 'mvc-arc-' + Math.random().toString(36).slice(2, 6);
    return `<h4>Jouw perceel op de kaart</h4><div class="mvc-kaart"><img src="${src}" alt="Luchtfoto van het perceel" loading="lazy" onerror="this.remove()">
      <svg viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><pattern id="${pid}" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.2" height="1.2" fill="rgba(255,255,255,.18)"/><line x1="0" y1="0" x2="0" y2="1.2" stroke="#fff" stroke-width="${(lw * 1.2).toFixed(3)}"/></pattern></defs>
        ${K.gebied && K.gebied.length ? `<path d="${P(K.gebied)}" fill="rgba(47,148,255,.42)" stroke="#9DB8FF" stroke-width="${lw}"/>` : ''}
        ${K.zone4 ? `<path d="${P(K.zone4)}" fill="none" stroke="#FFFFFF" stroke-width="${lw}" stroke-dasharray="${lw * 4} ${lw * 3}"/>` : ''}
        ${(K.bijgebouwen || []).map(r => `<path d="${P(r)}" fill="url(#${pid})" stroke="#FFFFFF" stroke-width="${lw}"/>`).join('')}
        ${K.pand ? `<path d="${P(K.pand)}" fill="rgba(20,32,43,.55)" stroke="#FFFFFF" stroke-width="${lw * 1.4}"/>` : ''}
        ${K.perceel ? `<path d="${P(K.perceel)}" fill="none" stroke="#FBF44E" stroke-width="${lw * 1.6}"/>` : ''}
      </svg></div>
      <div class="mvc-legenda"><span><i style="border:2px solid #FBF44E"></i>Perceelgrens</span><span><i style="background:rgba(47,148,255,.7)"></i>Hier mag je vergunningvrij bijbouwen</span><span><i style="border:1.5px dashed #979aab"></i>Zone tot 4 m achter de woning</span><span><i style="background:#14202B"></i>Woning</span><span><i style="background:repeating-linear-gradient(45deg,#979aab 0 2px,transparent 2px 5px)"></i>Bestaande bijgebouwen</span></div>
      <div class="mvc-bron">Luchtfoto PDOK · perceel Kadaster (BRK) · gebouwen BAG</div>`;
  }
  function berekening(F) {
    const staf = F.achtererf <= 100 ? `50% van ${nl(F.achtererf)} m²` : F.achtererf <= 300 ? `50 m² + 20% van ${nl(Math.round((F.achtererf - 100) * 10) / 10)} m²` : `90 m² + 10% van ${nl(Math.round((F.achtererf - 300) * 10) / 10)} m² (max. 150 m²)`;
    return `<div class="mvc-reken">
      <div>1. Bebouwingsgebied<small>je tuin vanaf 1 m achter de voorgevel, zonder de woning</small></div><div class="w">${nl(F.achtererf)} m²</div>
      <div>2. Maximaal vergunningvrij<small>${staf}</small></div><div class="w">${nl(F.maxBijbehorend)} m²</div>
      <div>3. Al bebouwd met bijgebouwen<small>${F.bijgebouwen.aantal ? F.bijgebouwen.aantal + ' bijgebouw' + (F.bijgebouwen.aantal > 1 ? 'en' : '') + ' volgens het Kadaster' : 'geen losse bijgebouwen gevonden'}</small></div><div class="w">− ${nl(F.bijgebouwen.opp)} m²</div>
      <div class="tot">Nog vergunningvrij bij te bouwen</div><div class="w tot">${nl(F.resterend)} m²</div>
    </div>
    <details><summary>Waar komt deze berekening vandaan?</summary><p>Landelijke regel (bruidsschat omgevingsplan art. 22.36): tot 100 m² bebouwingsgebied mag 50% worden bebouwd; van 100 tot 300 m² is dat 50 m² plus 20% van wat boven de 100 m² ligt; boven 300 m² is het 90 m² plus 10% van het deel boven 300 m², met een maximum van 150 m². Een aanbouw die al vastzit aan de woning telt ook mee, maar die rekent het Kadaster tot de woning; daarom staat hij hier niet bij stap 3.</p></details>`;
  }
  const UITLEG4 = `<div class="mvc-regels4">
    <div><h5>Dicht bij huis (tot 4 m van de achtergevel)</h5><ul><li>Maximaal 1 bouwlaag, dus geen verdieping erop.</li><li>Niet hoger dan 5 m en niet hoger dan 30 cm boven de vloer van de eerste verdieping.</li><li>Hier mag je ook wonen: keuken, woonkamer of slaapkamer.</li></ul></div>
    <div><h5>Verder in de tuin (meer dan 4 m)</h5><ul><li>Alleen voor bijgebruik: schuur, garage, berging, hobbyruimte.</li><li>Plat dak tot 3 m hoog; hoger alleen met een schuin dak (nok max. 5 m).</li><li>Geen slaapkamer of woonruimte, behalve voor mantelzorg.</li></ul></div>
    <div><h5>Altijd</h5><ul><li>Meer dan 1 m van de stoep of de openbare weg.</li><li>Geen dakterras of balkon op het bijgebouw.</li><li>Ook vergunningvrij moet het Bbl kloppen: constructie, brand, isolatie.</li></ul></div>
    <div><h5>Toestemming nodig</h5><ul><li>Huurwoning: toestemming van de verhuurder.</li><li>Appartement: toestemming van de VvE.</li><li>Monument of beschermd gezicht: bijna altijd een vergunning.</li></ul></div>
  </div>`;

  function start() { document.querySelectorAll('#mv-vergunningscheck, [data-mv-vergunningscheck]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.MVVergunningscheck = { init };
})();
