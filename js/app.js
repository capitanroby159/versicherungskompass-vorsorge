'use strict';

// ============================================
// VERSICHERUNGSKOMPASS — Vorsorge-Tool v1.2
// ============================================

// ── DATUMS-HELPER (Schweizer Format TT.MM.JJJJ) ──
const DateHelper = {
  bindAll() {
    document.querySelectorAll('.date-ch').forEach(el => this.bind(el));
  },
  bind(el) {
    el.placeholder = 'TT.MM.JJJJ';
    el.maxLength = 10;
    el.addEventListener('input', () => this.autoFormat(el));
    el.addEventListener('blur',  () => this.validate(el));
  },
  autoFormat(el) {
    let v = el.value.replace(/[^0-9]/g, '');
    if (v.length > 2) v = v.slice(0,2) + '.' + v.slice(2);
    if (v.length > 5) v = v.slice(0,5) + '.' + v.slice(5);
    el.value = v.slice(0,10);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  },
  validate(el) {
    if (!el.value) { el.style.borderColor = ''; return; }
    el.style.borderColor = this.toISO(el.value) ? '' : 'var(--danger)';
  },
  toISO(v) {
    if (!v) return '';
    const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return '';
    const dt = new Date(`${m[3]}-${m[2]}-${m[1]}`);
    return isNaN(dt) ? '' : `${m[3]}-${m[2]}-${m[1]}`;
  },
  fromISO(iso) {
    if (!iso) return '';
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
  },
  today() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  },
  calcAlter(chDate) {
    const iso = this.toISO(chDate);
    if (!iso) return null;
    const geb = new Date(iso), heute = new Date();
    let a = heute.getFullYear() - geb.getFullYear();
    const m = heute.getMonth() - geb.getMonth();
    if (m < 0 || (m === 0 && heute.getDate() < geb.getDate())) a--;
    return a;
  },
  calcDienstjahre(chDate) {
    const iso = this.toISO(chDate);
    if (!iso) return 0;
    return Math.max(0, Math.floor((new Date() - new Date(iso)) / (365.25*24*3600*1000)));
  },
};

// ── BERATER-VERWALTUNG (localStorage) ──
const Berater = {
  KEY: 'vk_berater_liste',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },

  save(liste) {
    localStorage.setItem(this.KEY, JSON.stringify(liste));
  },

  add(b) {
    const liste = this.getAll();
    b.id = Date.now();
    liste.push(b);
    this.save(liste);
    return b;
  },

  remove(id) {
    this.save(this.getAll().filter(b => b.id !== id));
  },

  update(id, data) {
    const liste = this.getAll().map(b => b.id === id ? { ...b, ...data } : b);
    this.save(liste);
  },

  // Formularfelder befüllen
  fill(b) {
    if (!b) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v||''; };
    set('berater-vorname', b.vorname);
    set('berater-name', b.name);
    set('berater-titel', b.titel);
    set('berater-firma', b.firma);
    set('berater-telefon', b.telefon);
    set('berater-email', b.email);
    set('berater-strasse', b.strasse);
    set('berater-plz', b.plz);
    set('berater-ort', b.ort);
  },

  // Aktuelle Formularwerte lesen
  fromForm() {
    const get = id => document.getElementById(id)?.value || '';
    return {
      vorname: get('berater-vorname'),
      name:    get('berater-name'),
      titel:   get('berater-titel'),
      firma:   get('berater-firma'),
      telefon: get('berater-telefon'),
      email:   get('berater-email'),
      strasse: get('berater-strasse'),
      plz:     get('berater-plz'),
      ort:     get('berater-ort'),
    };
  },

  // Auswahlbox neu rendern
  renderSelect() {
    const sel = document.getElementById('berater-select');
    if (!sel) return;
    const liste = this.getAll();
    sel.innerHTML = `<option value="">— Berater wählen —</option>` +
      liste.map(b =>
        `<option value="${b.id}">${b.vorname} ${b.name}${b.firma ? ' · ' + b.firma : ''}</option>`
      ).join('');
  },

  // Modal öffnen
  openModal() {
    this.renderModalListe();
    document.getElementById('berater-modal')?.classList.add('open');
  },

  closeModal() {
    document.getElementById('berater-modal')?.classList.remove('open');
  },

  renderModalListe() {
    const liste = this.getAll();
    const container = document.getElementById('berater-modal-liste');
    if (!container) return;
    if (liste.length === 0) {
      container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--gray-mid); font-size:13px;">Noch keine Berater gespeichert</div>`;
      return;
    }
    container.innerHTML = liste.map(b => `
      <div class="berater-modal-item" id="bmi-${b.id}">
        <div class="berater-modal-info">
          <strong>${b.vorname} ${b.name}</strong>${b.titel ? ` <em style="font-size:11px;color:var(--gray-mid)">${b.titel}</em>` : ''}
          <span>${b.firma || ''}</span>
          <span>${b.email || ''} ${b.telefon ? '· '+b.telefon : ''}</span>
        </div>
        <div class="berater-modal-actions">
          <button class="btn btn-accent btn-sm" onclick="Berater.selectFromModal(${b.id})">Wählen</button>
          <button class="btn btn-outline btn-sm" onclick="Berater.editInModal(${b.id})">Bearbeiten</button>
          <button class="btn btn-danger btn-sm" onclick="Berater.deleteFromModal(${b.id})">✕</button>
        </div>
      </div>`).join('');
  },

  selectFromModal(id) {
    const b = this.getAll().find(x => x.id === id);
    if (!b) return;
    this.fill(b);
    // Select-Box aktualisieren
    const sel = document.getElementById('berater-select');
    if (sel) sel.value = id;
    document.getElementById('berater-anzeige').textContent =
      `${b.vorname} ${b.name}${b.firma ? ' · ' + b.firma : ''}`;
    this.closeModal();
    Toast.show(`✓ ${b.vorname} ${b.name} gewählt`, 'success');
  },

  deleteFromModal(id) {
    const b = this.getAll().find(x => x.id === id);
    if (!b) return;
    if (!confirm(`${b.vorname} ${b.name} wirklich löschen?`)) return;
    this.remove(id);
    this.renderModalListe();
    this.renderSelect();
    Toast.show('Berater gelöscht', 'info');
  },

  editInModal(id) {
    const b = this.getAll().find(x => x.id === id);
    if (!b) return;
    this.fill(b);
    this.closeModal();
    Toast.show('Berater-Daten zum Bearbeiten geladen — nach Änderung "Speichern" klicken', 'info');
  },

  saveCurrentToListe() {
    const b = this.fromForm();
    if (!b.vorname || !b.name) {
      Toast.show('Bitte Vor- und Nachname eingeben', 'error');
      return;
    }
    // Prüfen ob dieser Berater schon existiert (gleicher Name)
    const liste = this.getAll();
    const existing = liste.find(x => x.vorname === b.vorname && x.name === b.name);
    if (existing) {
      if (!confirm(`${b.vorname} ${b.name} bereits vorhanden — überschreiben?`)) return;
      this.update(existing.id, b);
      Toast.show(`✓ ${b.vorname} ${b.name} aktualisiert`, 'success');
    } else {
      this.add(b);
      Toast.show(`✓ ${b.vorname} ${b.name} gespeichert`, 'success');
    }
    this.renderSelect();
    this.renderModalListe();
  },

  init() {
    this.renderSelect();

    // Select-Box Wechsel → Felder befüllen
    document.getElementById('berater-select')?.addEventListener('change', (e) => {
      const id = parseInt(e.target.value);
      if (!id) return;
      const b = this.getAll().find(x => x.id === id);
      if (b) {
        this.fill(b);
        document.getElementById('berater-anzeige').textContent =
          `${b.vorname} ${b.name}${b.firma ? ' · ' + b.firma : ''}`;
        Toast.show(`✓ ${b.vorname} ${b.name} gewählt`, 'success');
      }
    });

    // Modal-Buttons
    document.getElementById('btn-berater-verwalten')?.addEventListener('click', () => this.openModal());
    document.getElementById('btn-berater-modal-close')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-berater-speichern')?.addEventListener('click', () => this.saveCurrentToListe());
    document.getElementById('berater-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'berater-modal') this.closeModal();
    });
  },
};

// ── DATA MANAGER (Speichern / Laden) ──
const DataManager = {

  collect() {
    const get  = id => document.getElementById(id)?.value || '';
    const getN = id => parseCHF(document.getElementById(id)?.value);

    // Kinder sammeln
    const kinder = [];
    document.querySelectorAll('.kind-item').forEach(el => {
      const id = el.dataset.kindId;
      kinder.push({
        id,
        vorname:     get(`kind-${id}-vorname`),
        geburt:      get(`kind-${id}-geburt`),
        status:      get(`kind-${id}-status`),
        institution: get(`kind-${id}-institution`),
      });
    });

    return {
      version:   '1.2',
      savedAt:   new Date().toISOString(),
      erstelltAm: get('erstellt-am'),
      personenAnzahl: typeof personenAnzahl !== 'undefined' ? personenAnzahl : 1,

      berater: {
        vorname: get('berater-vorname'),
        name:    get('berater-name'),
        titel:   get('berater-titel'),
        firma:   get('berater-firma'),
        telefon: get('berater-telefon'),
        email:   get('berater-email'),
        strasse: get('berater-strasse'),
        plz:     get('berater-plz'),
        ort:     get('berater-ort'),
      },

      person1: {
        vorname:           get('p1-vorname'),
        nachname:          get('p1-nachname'),
        geburt:            get('p1-geburt'),
        geschlecht:        get('p1-geschlecht'),
        zivilstand:        get('p1-zivilstand'),
        partnerschaftDatum:get('p1-partnerschaft-datum'),
        ausbildung:        get('p1-ausbildung'),
        erwerbsstatus:     get('p1-erwerbsstatus'),
        beruf:             get('p1-beruf'),
        arbeitgeber:       get('p1-arbeitgeber'),
        kanton:            get('p1-kanton'),
        angestelltSeit:    get('p1-angestellt-seit'),
        pensum:            get('p1-pensum'),
        ahvLohn:           getN('p1-ahv-lohn'),
        monatsloehne:      get('p1-monatsloehne'),
        pensionsalter:     get('p1-pensionsalter'),
      },

      person2: {
        vorname:        get('p2-vorname'),
        nachname:       get('p2-nachname'),
        geburt:         get('p2-geburt'),
        geschlecht:     get('p2-geschlecht'),
        zivilstand:     get('p2-zivilstand'),
        ausbildung:     get('p2-ausbildung'),
        erwerbsstatus:  get('p2-erwerbsstatus'),
        beruf:          get('p2-beruf'),
        arbeitgeber:    get('p2-arbeitgeber'),
        kanton:         get('p2-kanton'),
        angestelltSeit: get('p2-angestellt-seit'),
        pensum:         get('p2-pensum'),
        ahvLohn:        getN('p2-ahv-lohn'),
        monatsloehne:   get('p2-monatsloehne'),
        pensionsalter:  get('p2-pensionsalter'),
      },

      kinder,

      pk1: this._collectPK('p1'),
      pk2: this._collectPK('p2'),
    };
  },

  _collectPK(person) {
    const contracts = [];
    document.querySelectorAll(`[data-person="${person}"].pk-vertrag-item`).forEach(item => {
      const id  = item.dataset.pkId;
      const get  = fid => document.getElementById(fid)?.value || '';
      const getN = fid => parseCHF(document.getElementById(fid)?.value);
      contracts.push({
        id,
        plan:            get(`pk-${id}-plan`),
        name:            get(`pk-${id}-name`),
        versLohn:        getN(`pk-${id}-verslohn`),
        koord:           getN(`pk-${id}-koord`),
        guthaben:        getN(`pk-${id}-guthaben`),
        guthabenPension: getN(`pk-${id}-guthaben-pension`),
        uws:             get(`pk-${id}-uws`),
        altersrente:     getN(`pk-${id}-altersrente`),
        ivRente:         getN(`pk-${id}-iv-rente`),
        tfKapital:       getN(`pk-${id}-tf-kapital`),
        hlRente:         getN(`pk-${id}-hl-rente`),
        waisenRente:     getN(`pk-${id}-waisen-rente`),
      });
    });
    return contracts;
  },

  populate(data) {
    if (!data) return;
    // Personen-Anzahl zuerst wiederherstellen
    if (data.personenAnzahl && typeof setPersonenAnzahl === 'function') {
      setPersonenAnzahl(data.personenAnzahl, true);
    }
    const set  = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.value = v; };
    const setN = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = fmtCHF(v); };

    set('erstellt-am', data.erstelltAm);

    if (data.berater) {
      const b = data.berater;
      set('berater-vorname', b.vorname);
      set('berater-name', b.name);
      set('berater-titel', b.titel);
      set('berater-firma', b.firma);
      set('berater-telefon', b.telefon);
      set('berater-email', b.email);
      set('berater-strasse', b.strasse);
      set('berater-plz', b.plz);
      set('berater-ort', b.ort);
      if (b.vorname || b.name)
        document.getElementById('berater-anzeige').textContent =
          `${b.vorname||''} ${b.name||''}${b.firma ? ' · '+b.firma : ''}`.trim();
    }

    if (data.person1) {
      const p = data.person1;
      set('p1-vorname', p.vorname);        set('p1-nachname', p.nachname);
      set('p1-geburt', p.geburt);          set('p1-geschlecht', p.geschlecht);
      set('p1-zivilstand', p.zivilstand);  set('p1-partnerschaft-datum', p.partnerschaftDatum);
      set('p1-ausbildung', p.ausbildung);  set('p1-erwerbsstatus', p.erwerbsstatus);
      set('p1-beruf', p.beruf);            set('p1-arbeitgeber', p.arbeitgeber);
      set('p1-kanton', p.kanton);          set('p1-angestellt-seit', p.angestelltSeit);
      set('p1-pensum', p.pensum);          setN('p1-ahv-lohn', p.ahvLohn);
      set('p1-monatsloehne', p.monatsloehne); set('p1-pensionsalter', p.pensionsalter);
      updatePersonInfo('p1'); updateLohnfortzahlung('p1'); updateEinkommen('p1');
    }

    if (data.person2) {
      const p = data.person2;
      set('p2-vorname', p.vorname);        set('p2-nachname', p.nachname);
      set('p2-geburt', p.geburt);          set('p2-geschlecht', p.geschlecht);
      set('p2-zivilstand', p.zivilstand);
      set('p2-ausbildung', p.ausbildung);  set('p2-erwerbsstatus', p.erwerbsstatus);
      set('p2-beruf', p.beruf);            set('p2-arbeitgeber', p.arbeitgeber);
      set('p2-kanton', p.kanton);          set('p2-angestellt-seit', p.angestelltSeit);
      set('p2-pensum', p.pensum);          setN('p2-ahv-lohn', p.ahvLohn);
      set('p2-monatsloehne', p.monatsloehne); set('p2-pensionsalter', p.pensionsalter);
      updatePersonInfo('p2'); updateLohnfortzahlung('p2'); updateEinkommen('p2');
    }

    if (data.kinder?.length) {
      // Bestehende Kinder löschen
      document.querySelectorAll('.kind-item').forEach(el => el.remove());
      kindCounter = 0;
      data.kinder.forEach(k => addKind(k));
    }

    const restorePK = (person, contracts) => {
      if (!contracts?.length) return;
      document.querySelectorAll(`[data-person="${person}"].pk-vertrag-item`).forEach(el => el.remove());
      pkCounters[person] = 0;
      document.getElementById(`${person}-pk-empty`).style.display = '';
      contracts.forEach(v => addPKVertrag(person, v));
    };
    if (typeof addPKVertrag === 'function') {
      restorePK('p1', data.pk1);
      restorePK('p2', data.pk2);
    }

    updateKPIs();
  },

  save() {
    const data = this.collect();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const name1 = data.person1?.nachname || 'Kunde';
    const name2 = data.person1?.vorname  || '';
    const date  = DateHelper.today().replace(/\./g, '-');
    const fname = `${name1}_${name2}_${date}.json`.replace(/\s+/g,'_').toLowerCase();
    const a = document.createElement('a');
    a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
    Toast.show(`💾 Gespeichert: ${fname}`, 'success');
  },

  load() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          this.populate(data);
          Toast.show('📂 Daten erfolgreich geladen', 'success');
        } catch(err) {
          Toast.show('Fehler beim Laden der Datei', 'error');
          console.error(err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },
};

// ── TOAST ──
const Toast = {
  timeout: null,
  show(msg, type='info') {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
    t.className = `toast ${type}`;
    t.innerHTML = msg;
    clearTimeout(this.timeout);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    this.timeout = setTimeout(() => t.classList.remove('show'), 3500);
  },
};

// ── FORMAT HELPERS ──
function fmtCHF(n) {
  if (!n && n !== 0) return '';
  return new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 }).format(n);
}

function parseCHF(s) {
  if (!s && s !== 0) return '';
  const n = parseFloat(String(s).replace(/['\s]/g,'').replace(/[^0-9.-]/g,''));
  return isNaN(n) ? '' : n;
}

function calcAlter(iso) {
  if (!iso) return null;
  const geb = new Date(iso), heute = new Date();
  let a = heute.getFullYear() - geb.getFullYear();
  const m = heute.getMonth() - geb.getMonth();
  if (m < 0 || (m === 0 && heute.getDate() < geb.getDate())) a--;
  return a;
}

// ── LOHNFORTZAHLUNG ──
const LFZ_SKALEN = {
  zuercher: [
    {j:1,w:3},{j:2,w:8},{j:3,w:9},{j:4,w:10},{j:5,w:11},{j:6,w:12},
    {j:7,w:13},{j:8,w:14},{j:9,w:15},{j:10,w:16},{j:11,w:17},{j:12,w:18},
    {j:13,w:19},{j:14,w:20},{j:15,w:21},{j:20,w:22},
  ],
  basler: [
    {j:1,w:3},{j:2,w:9},{j:3,w:9},{j:4,w:13},{j:10,w:17},{j:20,w:22},{j:25,w:26},
  ],
  berner: [
    {j:1,w:3},{j:2,w:4},{j:3,w:9},{j:5,w:13},{j:10,w:17},{j:20,w:22},{j:25,w:26},
  ],
};

const KANTON_SKALA = {
  ZH:'zuercher',SG:'zuercher',LU:'zuercher',GR:'zuercher',TG:'zuercher',SZ:'zuercher',
  ZG:'zuercher',NW:'zuercher',OW:'zuercher',UR:'zuercher',GL:'zuercher',AI:'zuercher',
  AR:'zuercher',SH:'zuercher',
  AG:'basler',BS:'basler',BL:'basler',SO:'basler',
  BE:'berner',FR:'berner',GE:'berner',VD:'berner',JU:'berner',NE:'berner',TI:'berner',VS:'berner',
};

function getLFZWochen(kanton, dienstjahre) {
  const skala = LFZ_SKALEN[KANTON_SKALA[kanton] || 'zuercher'];
  if (dienstjahre < 1) return 3;
  let w = 3;
  for (const e of skala) { if (dienstjahre >= e.j) w = e.w; else break; }
  return w;
}

// ── APP ──
const App = {
  currentStep: 1,
  steps: [
    {id:1, key:'grundlagen',      label:'Grundlagen'},
    {id:2, key:'versicherungen',  label:'Versicherungen'},
    {id:3, key:'vermoegen',       label:'Vermögen'},
    {id:4, key:'eu-analyse',      label:'Erw.-Unfähigkeit'},
    {id:5, key:'todesfall',       label:'Todesfall'},
    {id:6, key:'pension',         label:'Pension'},
    {id:7, key:'zusammenfassung', label:'Zusammenfassung'},
  ],
  init() {
    this.renderStepper();
    document.getElementById('stepper').addEventListener('click', e => {
      const item = e.target.closest('.step-item');
      if (item) this.goToStep(parseInt(item.dataset.step));
    });
    document.getElementById('btn-save')?.addEventListener('click', () => DataManager.save());
    document.getElementById('btn-load')?.addEventListener('click', () => DataManager.load());
    document.getElementById('btn-export')?.addEventListener('click', () =>
      Toast.show('Export kommt in Phase 11', 'info'));
    this.goToStep(1);
    DateHelper.bindAll();
    Berater.init();
    const el = document.getElementById('erstellt-am');
    if (el && !el.value) el.value = DateHelper.today();
  },
  renderStepper() {
    document.getElementById('stepper').innerHTML =
      this.steps.map(s => `
        <div class="step-item" data-step="${s.id}" id="step-item-${s.id}">
          <span class="step-num">${s.id}</span>
          <span class="step-label">${s.label}</span>
        </div>`).join('');
  },
  goToStep(n) {
    this.currentStep = n;
    document.querySelectorAll('.step-item').forEach(el => {
      const i = parseInt(el.dataset.step);
      el.classList.toggle('active', i === n);
      el.classList.toggle('completed', i < n);
    });
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${this.steps[n-1].key}`)?.classList.add('active');
    document.querySelectorAll('.nav-prev').forEach(b =>
      b.style.visibility = n > 1 ? 'visible' : 'hidden');
    window.scrollTo({top:0, behavior:'smooth'});
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  document.querySelectorAll('.money-input').forEach(el => {
    el.addEventListener('blur', () => { const v=parseCHF(el.value); if(v!=='') el.value=fmtCHF(v); });
    el.addEventListener('focus', () => { const v=parseCHF(el.value); if(v!=='') el.value=v; });
  });
});