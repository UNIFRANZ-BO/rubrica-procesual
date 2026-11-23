// Prueba de humo de apps-script/Code.gs con una hoja simulada.  Uso: node tests/backend.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const codigo = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');

function libro() {
  const hojas = {}, orden = [];
  const noop = t => new Proxy(t, {get: (o, k) => k in o ? o[k] : () => noop(o)});
  function hoja(nombre) {
    const d = [];
    const sh = {
      d, getName: () => sh.nombre, nombre,
      getLastRow: () => { let n = d.length; while (n && (!d[n - 1] || d[n - 1].every(x => x === '' || x === undefined || x === null))) n--; return n; },
      getLastColumn: () => d.reduce((m, r) => Math.max(m, (r || []).length), 0), getMaxRows: () => 1000, getMaxColumns: () => 26,
      getRange(r, c, nr = 1, nc = 1) {
        return noop({
          getValues: () => Array.from({length: nr}, (_, i) => Array.from({length: nc}, (_, j) => ((d[r - 1 + i] || [])[c - 1 + j] ?? ''))),
          getValue: () => ((d[r - 1] || [])[c - 1] ?? ''),
          setValues(v) { v.forEach((f, i) => { d[r - 1 + i] = d[r - 1 + i] || []; f.forEach((x, j) => d[r - 1 + i][c - 1 + j] = x); }); return this; },
          setValue(x) { d[r - 1] = d[r - 1] || []; d[r - 1][c - 1] = x; return this; }
        });
      },
      getDataRange() { return sh.getRange(1, 1, Math.max(1, d.length), Math.max(1, sh.getLastColumn())); },
      appendRow(f) { d.length = sh.getLastRow(); d.push(f); }, deleteRows(r, n) { d.splice(r - 1, n); }, deleteRow(r) { d.splice(r - 1, 1); },
      clear() { d.length = 0; }, setName(n) { delete hojas[sh.nombre]; sh.nombre = n; hojas[n] = sh; }
    };
    return noop(sh);
  }
  const ss = noop({
    getSheetByName: n => hojas[n] || null, insertSheet: n => (hojas[n] = hoja(n)), getSheets: () => Object.values(hojas),
    deleteSheet: s => { delete hojas[s.getName()]; }
  });
  const ctx = {
    SpreadsheetApp: {getActive: () => ss, getUi: () => { throw new Error('sin UI'); }, newDataValidation: () => noop({build: () => ({})}), BorderStyle: {SOLID: 1}},
    LockService: {getScriptLock: () => ({waitLock() {}, releaseLock() {}})},
    ContentService: {createTextOutput: t => ({t, setMimeType() { return this; }}), MimeType: {JSON: 1, JAVASCRIPT: 2}},
    Session: {getActiveUser: () => ({getEmail: () => 'admin@x'})}, Logger: {log() {}}
  };
  const S = new Function(...Object.keys(ctx), codigo + '\nreturn {configuracionInicial, doGet, doPost, borrarPruebas, revisarRubrica, verAvance, restablecerRubrica, CAB_REG, CAB_DET};')(...Object.values(ctx));
  S.hojas = hojas; S.hoja = hoja;
  S.get = p => JSON.parse(S.doGet({parameter: p}).t);
  S.post = data => JSON.parse(S.doPost({postData: {contents: JSON.stringify({action: 'guardar', data})}}).t);
  return S;
}

/* ───── 1) hoja actual (formato v1) → migración ───── */
let S = libro(), H = S.hojas;
const vieja = (n, filas) => { const x = S.hoja(n); x.d.push(...filas); H[n] = x; };
vieja('CONFIG', [['Parámetro', 'Valor', 'Ayuda'], ['Registro abierto', 'SÍ'], ['Título de la rúbrica', 'Rúbrica de evaluación procesual'], ['Hitos habilitados', ''],
  ['Máximo de estudiantes por grupo', 7], ['Clave para docentes', ''], ['Mensaje cuando está cerrado', 'cerrado'], ['Semestres', '1; 2; 3'], ['Paralelos', '']]);
vieja('RUBRICA', [['Hito', 'Dimensión', 'Peso (%)', 'Se califica', 'Criterio', 'Descripción (opcional)', 'Puntaje máximo', 'Cumple'], ['Hito 2', 'Conceptual', 30, 'Por grupo', 'X', '', 10, 10]]);
vieja('REGISTROS', [['Fecha y hora', 'ID registro', 'Docente', 'Semestre', 'Paralelo'], [new Date(), 'RP-AAAAAAAA', 'PRUEBA Claude', '2', 'P000']]);
vieja('DETALLE', [['ID registro', 'Revisión'], ['RP-AAAAAAAA', '1']]);
vieja('PAPELERA', [['Fecha y hora', 'ID registro']]);
S.configuracionInicial();
assert.ok(H['RUBRICA (anterior)'] && H['REGISTROS (anterior)'] && H['DETALLE (anterior)'], 'lo viejo se guarda aparte');
assert.deepStrictEqual(H.REGISTROS.d[0], S.CAB_REG); assert.deepStrictEqual(H.DETALLE.d[0], S.CAB_DET);
assert.strictEqual(H.PAPELERA.d[0][2], 'Docente', 'papelera vacía se rehace');
const cfg = Object.fromEntries(H.CONFIG.d.slice(1).map(r => [r[0], r[1]]));
assert.ok(!('Paralelos' in cfg) && cfg.Hitos === 'Hito 2; Hito 3; Hito 4; Hito 5' && cfg.Carreras === 'ADM; ICO', JSON.stringify(cfg));
assert.strictEqual(cfg.Semestres, '1; 2; 3', 'respeta lo que ya había');

/* ───── 2) la app recibe una sola rúbrica para cada hito ───── */
let r = S.get({action: 'rubrica'});
assert.ok(r.ok && r.version === 'RP 2.0', JSON.stringify(r).slice(0, 300));
assert.deepStrictEqual(r.hitos.map(h => h.id), ['Hito 2', 'Hito 3', 'Hito 4', 'Hito 5']);
assert.deepStrictEqual(r.carreras, ['ADM', 'ICO']); assert.deepStrictEqual(r.semestres, ['1', '2', '3']);
let h = r.hitos[0];
assert.strictEqual(h.total, 100);
assert.deepStrictEqual(h.dims.map(d => [d.nombre, d.peso, d.modo, d.crit.length]), [['Conceptual', 30, 'grupo', 3], ['Procedimental', 30, 'grupo', 2], ['Actitudinal', 40, 'estudiante', 1]]);
assert.deepStrictEqual(h.dims[0].crit[0].nv, [{n: 'Cumple', a: 10, b: 10}, {n: 'Cumple parcialmente', a: 5, b: 5}, {n: 'No cumple', a: 0, b: 3}]);
assert.deepStrictEqual(h.dims[1].crit[1].nv.map(n => [n.a, n.b]), [[20, 20], [10, 10], [0, 9]]);
assert.strictEqual(h.dims[2].crit[0].nv.length, 0, 'actitudinal: nota directa');
assert.deepStrictEqual(r.hitos[3].dims, h.dims, 'misma rúbrica en todos los hitos');

/* ───── 3) Rafael edita la tabla visual ───── */
const G = H.RUBRICA.d, fila = et => G.findIndex(x => x && String(x[0]).startsWith(et));
const fD = fila('Dimensión'), fP = fila('Peso'), fC = fila('Criterio'), fM = fila('Puntaje'), fN = fila('Cumple');
assert.ok(fD > 0 && fC > fD && fN > fM, 'etiquetas en la columna A');
assert.strictEqual(G[fD][1], 'Conceptual'); assert.strictEqual(G[fD][2], '', 'dimensión solo en la 1.ª columna del bloque');
G.forEach((x, i) => { if (i >= fD) x.splice(4, 0, i === fC ? 'Uso de fuentes' : i === fM ? 5 : i === fN ? '5' : i === fN + 1 ? '3' : i === fN + 2 ? '0-2' : ''); });   // criterio nuevo en Conceptual
G[fN + 1][1] = '6';                                       // «Cumple parcialmente» de Conocimiento: 5 → 6
G[fP][5] = 25; G[fP][1] = 35;                             // Procedimental 25 %, Conceptual 35 %
G.push(['Excelente', 12]);                               // nivel nuevo (solo en el 1.er criterio)
G[fD][8] = 'Ética'; G[fP][8] = 0; G[fC][8] = 'Puntualidad'; G[fM][8] = 10;   // otra dimensión al final (peso 0)
r = S.get({action: 'rubrica'}); h = r.hitos[0];
assert.deepStrictEqual(h.dims.map(d => [d.nombre, d.peso, d.crit.length]), [['Conceptual', 35, 4], ['Procedimental', 25, 2], ['Actitudinal', 40, 1], ['Ética', 0, 1]]);
assert.strictEqual(h.dims[0].crit[3].nombre, 'Uso de fuentes'); assert.strictEqual(h.dims[0].crit[3].max, 5);
assert.deepStrictEqual(h.dims[0].crit[0].nv.map(n => n.n + ':' + n.a + '-' + n.b), ['Cumple:10-10', 'Cumple parcialmente:6-6', 'No cumple:0-3', 'Excelente:12-12']);
assert.strictEqual(h.dims[0].crit[0].max, 12, 'el máximo sube si un nivel da más');
S.restablecerRubrica();                                   // sin UI no hace nada
H.RUBRICA.d.length = 0; S.configuracionInicial();         // vacía → se rehace
assert.strictEqual(S.get({action: 'rubrica'}).hitos[0].dims[0].crit.length, 3);

/* ───── 4) guardar ───── */
const items = act => [
  {dim: 'Conceptual', peso: 30, modo: 'grupo', crit: 'Conocimiento del tema', nivel: 'Cumple', pts: 10, max: 10},
  {dim: 'Conceptual', peso: 30, modo: 'grupo', crit: 'Contenido', nivel: 'Cumple parcialmente', pts: 5, max: 10},
  {dim: 'Conceptual', peso: 30, modo: 'grupo', crit: 'Redacción', nivel: 'No cumple', pts: 3, max: 10},
  {dim: 'Procedimental', peso: 30, modo: 'grupo', crit: 'Expresión', nivel: 'Cumple', pts: 10, max: 10},
  {dim: 'Procedimental', peso: 30, modo: 'grupo', crit: 'Análisis', nivel: '', pts: 99, max: 20},      // se recorta a 20
  {dim: 'Actitudinal', peso: 40, modo: 'estudiante', crit: 'Expone', nivel: '', pts: act, max: 40}];
const base = {id: 'RP-ABCDEFGH', rev: '1763650000000', version: '3.0', docente: 'Ana Pérez', hito: 'Hito 5', semestre: '2', carrera: 'ADM/ICO', grupo: '=Grupo 1', obs: 'Bien',
  est: [{nombre: 'Juan Quispe', carrera: 'ADM', items: items(35)}, {nombre: 'Lucía Rojas', carrera: 'ICO', items: items(24)}, {nombre: 'Leo Paz', carrera: 'ICO', items: items(29)}]};
r = S.post(base); assert.ok(r.ok, JSON.stringify(r));
let reg = H.REGISTROS.d, C = n => S.CAB_REG.indexOf(n);
assert.strictEqual(reg.length, 4);
assert.deepStrictEqual([reg[1][C('Hito')], reg[1][C('Semestre')], reg[1][C('Carrera del grupo')], reg[1][C('Estudiante')], reg[1][C('Carrera')]], ['Hito 5', '2', 'ADM/ICO', 'Juan Quispe', 'ADM']);
assert.deepStrictEqual(reg.slice(1).map(f => [f[C('Nota final (sobre 100)')], f[C('Nota sobre 10')]]), [[83, 8], [72, 7], [77, 8]], 'sobre 10 redondeado');
assert.strictEqual(reg[1][C('Grupo / proyecto')], "'=Grupo 1", 'texto con = protegido');
assert.strictEqual(reg[1][C('Detalle por dimensión')], 'Conceptual 18/30 · Procedimental 30/30 · Actitudinal 35/40');
assert.strictEqual(H.DETALLE.d.length, 1 + 18); assert.strictEqual(H.DETALLE.d[1][8], 'ADM');
assert.ok(S.get({action: 'verificar', id: base.id, rev: base.rev}).existe);
assert.ok(S.post(base).repetido, 'mismo envío dos veces no duplica');
// corrección: reemplaza
r = S.post(Object.assign({}, base, {rev: '1763650099999', est: [{nombre: 'Juan Quispe', carrera: 'ADM', items: items(40)}]}));
assert.ok(r.ok); reg = H.REGISTROS.d;
assert.strictEqual(reg.length, 2, 'corrección reemplaza'); assert.strictEqual(reg[1][C('Nota sobre 10')], 9);
assert.ok(!S.get({action: 'verificar', id: base.id, rev: base.rev}).existe);
// errores definitivos
assert.strictEqual(S.post(Object.assign({}, base, {id: 'malo'})).codigo, 'datos');
assert.strictEqual(S.post(Object.assign({}, base, {id: 'RP-NUEVO123', est: Array.from({length: 8}, (_, i) => ({nombre: 'E' + i, items: items(1)}))})).codigo, 'datos', 'máximo 7');
const fClave = H.CONFIG.d.findIndex(x => /^Clave/.test(x[0])); H.CONFIG.d[fClave][1] = 'secreta';
assert.strictEqual(S.post(Object.assign({}, base, {id: 'RP-NUEVO123'})).codigo, 'clave');
assert.strictEqual(S.get({action: 'clave', clave: 'secreta'}).valida, true);
assert.ok(S.post(Object.assign({}, base, {id: 'RP-NUEVO123', docente: 'PRUEBA Rafael', clave: 'secreta'})).ok);
H.CONFIG.d[1][1] = 'NO';
assert.strictEqual(S.post(Object.assign({}, base, {id: 'RP-NUEVO124', clave: 'secreta'})).codigo, 'cerrada');
assert.ok(/^cb1\(\{"ok":true/.test(S.doGet({parameter: {action: 'ping', callback: 'cb1'}}).t));
S.borrarPruebas();
assert.ok(!H.REGISTROS.d.some(f => /^PRUEBA/.test(f[2])) && !H['REGISTROS (anterior)'].d.some(f => /^PRUEBA/.test(f[2])), 'borrar pruebas (también en la hoja anterior)');
S.revisarRubrica(); S.verAvance();

/* ───── 5) hoja nueva desde cero ───── */
S = libro(); S.configuracionInicial();
r = S.get({action: 'rubrica'});
assert.ok(r.hitos.length === 4 && r.hitos[0].total === 100 && !S.hojas['RUBRICA (anterior)']);
assert.ok(S.post(Object.assign({}, base, {id: 'RP-OTRO1234'})).ok);
console.log('backend OK');
