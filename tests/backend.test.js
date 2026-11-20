// Prueba de humo de apps-script/Code.gs con una hoja simulada.  Uso: node tests/backend.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const codigo = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');

const encadenable = new Proxy({}, {get: (t, k) => k === 'build' ? () => ({}) : () => encadenable});
function hoja(nombre) {
  const d = [];
  const sh = {
    nombre, d,
    getLastRow: () => d.length, getLastColumn: () => d.reduce((m, r) => Math.max(m, r.length), 0), getMaxRows: () => 1000,
    getRange(r, c, nr = 1, nc = 1) {
      return Object.assign(Object.create(encadenable), {
        getValues: () => Array.from({length: nr}, (_, i) => Array.from({length: nc}, (_, j) => ((d[r - 1 + i] || [])[c - 1 + j] ?? ''))),
        getValue: () => ((d[r - 1] || [])[c - 1] ?? ''),
        setValues(v) { v.forEach((f, i) => { d[r - 1 + i] = d[r - 1 + i] || []; f.forEach((x, j) => d[r - 1 + i][c - 1 + j] = x); }); return this; },
        setValue(x) { d[r - 1] = d[r - 1] || []; d[r - 1][c - 1] = x; return this; },
        setNumberFormat() { return this; }, setFontWeight() { return this; }, setFontColor() { return this; }, setBackground() { return this; }, setWrap() { return this; },
        setVerticalAlignment() { return this; }, setHorizontalAlignment() { return this; }, setDataValidation() { return this; }, setNote() { return this; }
      });
    },
    appendRow(f) { d.push(f); }, deleteRows(r, n) { d.splice(r - 1, n); },
    setFrozenRows() {}, setColumnWidth() {}
  };
  return sh;
}
const hojas = {};
const ss = {
  getSheetByName: n => hojas[n] || null, insertSheet: n => (hojas[n] = hoja(n)), getSheets: () => Object.values(hojas),
  setSpreadsheetTimeZone() {}, deleteSheet() {}, setActiveSheet() {}, moveActiveSheet() {}
};
const ctx = {
  SpreadsheetApp: {getActive: () => ss, getUi: () => { throw new Error('sin UI'); }, newDataValidation: () => encadenable},
  LockService: {getScriptLock: () => ({waitLock() {}, releaseLock() {}})},
  ContentService: {createTextOutput: t => ({t, setMimeType() { return this; }}), MimeType: {JSON: 1, JAVASCRIPT: 2}},
  Session: {getActiveUser: () => ({getEmail: () => 'admin@x'})}, Logger: {log() {}}
};
const fn = new Function(...Object.keys(ctx), codigo + '\nreturn {configuracionInicial, doGet, doPost, borrarPruebas, revisarRubrica, verAvance, H};');
const S = fn(...Object.values(ctx));
const get = p => JSON.parse(S.doGet({parameter: p}).t);
const post = data => JSON.parse(S.doPost({postData: {contents: JSON.stringify({action: 'guardar', data})}}).t);

S.configuracionInicial();
assert.ok(hojas.RUBRICA && hojas.CONFIG && hojas.REGISTROS && hojas.DETALLE, 'pestañas');
let r = get({action: 'rubrica'});
assert.ok(r.ok && r.abierta, 'rubrica ok');
assert.deepStrictEqual(r.hitos.map(h => h.id), ['Hito 2 · Semana 6', 'Hito 3 · Semana 12', 'Hito 4', 'Hito 5 · Semana 20']);
const h5 = r.hitos[3];
assert.strictEqual(h5.total, 100);
assert.deepStrictEqual(h5.dims.map(d => [d.nombre, d.peso, d.modo, d.crit.length]), [['Conceptual', 30, 'grupo', 3], ['Procedimental', 30, 'grupo', 2], ['Actitudinal', 40, 'estudiante', 1]]);
assert.deepStrictEqual(h5.dims[0].crit[0].nv, [{n: 'Cumple', a: 10, b: 10}, {n: 'Cumple parcialmente', a: 5, b: 5}, {n: 'No cumple', a: 0, b: 3}]);
assert.strictEqual(h5.dims[2].crit[0].nv.length, 0, 'actitudinal: puntaje directo');

// Rafael cambia la rúbrica en la hoja → la app la ve
const rub = hojas.RUBRICA.d;
rub[0][10] = 'Destacado';                                          // nuevo nivel (columna K)
rub.push(['Hito 6', 'Saber', '50%', 'Por grupo', 'Criterio A', '', 10, 10, 'menor a 10', '', 'x'], ['Hito 6', 'Hacer', '', 'Por estudiante', 'Criterio B', 'desc', 20, '', '', '', '']);
hojas.CONFIG.d[3][1] = 'Hito 5 · Semana 20; hito 6';
r = get({action: 'rubrica'});
assert.deepStrictEqual(r.hitos.map(h => h.id), ['Hito 5 · Semana 20', 'Hito 6'], 'hitos habilitados');
assert.deepStrictEqual(r.niveles, ['Cumple', 'Cumple parcialmente', 'No cumple', 'Destacado']);
assert.deepStrictEqual(r.hitos[1].dims[0].crit[0].nv, [{n: 'Cumple', a: 10, b: 10}, {n: 'Cumple parcialmente', a: 0, b: 9}]);
assert.strictEqual(r.hitos[1].dims[1].peso, 20, 'peso vacío = suma de máximos');
rub.splice(rub.length - 2, 2); rub[0][10] = ''; hojas.CONFIG.d[3][1] = '';

// Guardar
const items = (act) => [
  {dim: 'Conceptual', peso: 30, modo: 'grupo', crit: 'Conocimiento del tema', nivel: 'Cumple', pts: 10, max: 10},
  {dim: 'Conceptual', peso: 30, modo: 'grupo', crit: 'Contenido', nivel: 'Cumple parcialmente', pts: 5, max: 10},
  {dim: 'Conceptual', peso: 30, modo: 'grupo', crit: 'Redacción', nivel: 'No cumple', pts: 3, max: 10},
  {dim: 'Procedimental', peso: 30, modo: 'grupo', crit: 'Expresión', nivel: 'Cumple', pts: 10, max: 10},
  {dim: 'Procedimental', peso: 30, modo: 'grupo', crit: 'Análisis', nivel: 'Cumple parcialmente', pts: 99, max: 20},   // se recorta a 20
  {dim: 'Actitudinal', peso: 40, modo: 'estudiante', crit: 'Expone', nivel: '', pts: act, max: 40}];
const base = {id: 'RP-ABCDEFGH', rev: '1763650000000', version: '1.0', docente: 'Ana Pérez', materia: 'Adm. Gerencial', paralelo: 'ADM-S2-P107', hito: 'Hito 5 · Semana 20', grupo: '=Grupo 1', obs: 'Bien',
  est: [{nombre: 'Juan Quispe', items: items(35)}, {nombre: 'Lucía Rojas', items: items(28)}]};
r = post(base); assert.ok(r.ok, JSON.stringify(r));
let reg = hojas.REGISTROS.d;
assert.strictEqual(reg.length, 3);
assert.strictEqual(reg[1][9], 18 + 30 + 35, 'nota final Juan');
assert.strictEqual(reg[2][9], 18 + 30 + 28);
assert.strictEqual(reg[1][6], "'=Grupo 1", 'texto con = protegido');
assert.strictEqual(reg[1][10], 'Conceptual 18/30 · Procedimental 30/30 · Actitudinal 35/40');
assert.strictEqual(hojas.DETALLE.d.length, 1 + 12);
assert.ok(get({action: 'verificar', id: base.id, rev: base.rev}).existe);
assert.ok(post(base).repetido, 'mismo envío dos veces no duplica');
assert.strictEqual(hojas.REGISTROS.d.length, 3);

// Otro grupo y luego corrección del primero (reemplaza, no duplica)
post(Object.assign({}, base, {id: 'RP-ZZZZZZZZ', docente: 'PRUEBA Rafael', est: [{nombre: 'X', items: items(10)}]}));
assert.strictEqual(hojas.REGISTROS.d.length, 4);
r = post(Object.assign({}, base, {rev: '1763650099999', est: [{nombre: 'Juan Quispe', items: items(40)}]}));
assert.ok(r.ok);
reg = hojas.REGISTROS.d;
assert.strictEqual(reg.length, 3, 'corrección reemplaza');
assert.deepStrictEqual(reg.slice(1).map(f => f[8]), ['X', 'Juan Quispe']);
assert.strictEqual(hojas.DETALLE.d.length, 1 + 6 + 6);
assert.ok(!get({action: 'verificar', id: base.id, rev: base.rev}).existe);

// Errores definitivos
assert.strictEqual(post(Object.assign({}, base, {id: 'malo'})).codigo, 'datos');
assert.strictEqual(post(Object.assign({}, base, {id: 'RP-NUEVO123', est: Array.from({length: 8}, (_, i) => ({nombre: 'E' + i, items: items(1)}))})).codigo, 'datos', 'máximo 7');
hojas.CONFIG.d[5][1] = 'secreta';
assert.strictEqual(post(Object.assign({}, base, {id: 'RP-NUEVO123'})).codigo, 'clave');
assert.strictEqual(get({action: 'clave', clave: 'secreta'}).valida, true);
assert.strictEqual(get({action: 'rubrica'}).clave, true);
assert.ok(post(Object.assign({}, base, {id: 'RP-NUEVO123', clave: 'secreta'})).ok);
hojas.CONFIG.d[1][1] = 'NO';
assert.strictEqual(post(Object.assign({}, base, {id: 'RP-NUEVO124', clave: 'secreta'})).codigo, 'cerrada');
// JSONP
assert.ok(/^cb1\(\{"ok":true/.test(S.doGet({parameter: {action: 'ping', callback: 'cb1'}}).t));

S.borrarPruebas();
assert.ok(!hojas.REGISTROS.d.some(f => /^PRUEBA/.test(f[2])), 'borrar pruebas');
assert.ok(!hojas.DETALLE.d.some(f => f[0] === 'RP-ZZZZZZZZ'));
S.revisarRubrica(); S.verAvance();
console.log('backend OK');
