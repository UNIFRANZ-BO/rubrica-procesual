/**
 * Rúbrica procesual — UNIFRANZ · backend de la app (aplicación web) + menú «Rúbrica» de la hoja.
 * Generado con build.py a partir de Code.src.gs, motor.js y rubrica.json: no lo edites a mano.
 *
 * Primera vez: pegar este código → ejecutar «configuracionInicial» → Implementar → Nueva implementación →
 *              Aplicación web · Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 * Para actualizar el código: Implementar → Administrar implementaciones → ✏️ → Nueva versión (NUNCA «Nueva implementación»).
 *
 * La rúbrica se edita en la pestaña RUBRICA: la app la lee cada vez que un docente la abre.
 *
 * @OnlyCurrentDoc
 */
const VERSION = 'RP 1.0';
const GRIS = '#3a3a3a';
const H = {CFG: 'CONFIG', RUB: 'RUBRICA', REG: 'REGISTROS', DET: 'DETALLE', PAP: 'PAPELERA', BIT: 'BITACORA'};
const CAB_RUB_FIJAS = ['Hito', 'Dimensión', 'Peso (%)', 'Se califica', 'Criterio', 'Descripción (opcional)', 'Puntaje máximo'];
const CAB_REG = ['Fecha y hora', 'ID registro', 'Docente', 'Materia', 'Paralelo', 'Hito', 'Grupo / proyecto', 'N.º', 'Estudiante',
  'Nota final', 'Detalle por dimensión', 'Observaciones', 'Revisión', 'Versión app'];
const CAB_DET = ['ID registro', 'Revisión', 'Hito', 'Docente', 'Materia', 'Paralelo', 'Grupo / proyecto', 'Estudiante',
  'Dimensión', 'Peso (%)', 'Se califica', 'Criterio', 'Nivel', 'Puntos', 'Puntaje máximo'];
const MAX_EST_ABS = 40;
// Lectura de la rúbrica (compartido por la app y por el script; build.py lo incrusta en los dos).
var MOTOR = (function () {
  function sinT(s) { return String(s === null || s === undefined ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var s = String(v === null || v === undefined ? '' : v).replace(/[%\s]/g, '').replace(',', '.');
    return s === '' ? NaN : Number(s);
  }
  // Puntaje de un nivel: 10 · «0-3» · «0 a 3» · «menor a 4» · «<4». Devuelve [mín, máx] o null.
  function rango(v) {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') return isFinite(v) && v >= 0 ? [v, v] : null;
    var s = sinT(v).replace(/,/g, '.').replace(/[–—]/g, '-'), m;
    m = s.match(/^(?:de\s*)?(\d+(?:\.\d+)?)\s*(?:-|a|al|hasta)\s*(\d+(?:\.\d+)?)$/);
    if (m) { var a = +m[1], b = +m[2]; return a <= b ? [a, b] : [b, a]; }
    m = s.match(/^(?:menor\s*(?:a|que)|menos\s*de|<)\s*(\d+(?:\.\d+)?)$/);
    if (m) return [0, Math.max(0, Math.ceil(+m[1]) - 1)];
    m = s.match(/^(\d+(?:\.\d+)?)$/);
    if (m) return [+m[1], +m[1]];
    return null;
  }
  function modo(v) { return /estud|indiv|cada/.test(sinT(v)) ? 'estudiante' : 'grupo'; }
  function txt(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); }
  // niveles: nombres de las columnas de nivel · filas: filas de la pestaña RUBRICA (sin encabezado) · habil: hitos habilitados
  function parsear(niveles, filas, habil) {
    var hitos = [], avisos = [], porId = {}, hab = (habil || []).map(sinT).filter(Boolean);
    filas.forEach(function (f, i) {
      var fila = i + 2, hito = txt(f[0]), crit = txt(f[4]);
      if (!hito || !crit) return;
      if (hab.length && hab.indexOf(sinT(hito)) < 0) return;
      var h = porId[sinT(hito)];
      if (!h) { h = {id: hito, dims: []}; porId[sinT(hito)] = h; hitos.push(h); }
      var dn = txt(f[1]) || 'Sin dimensión', d = null;
      for (var k = 0; k < h.dims.length; k++) if (sinT(h.dims[k].nombre) === sinT(dn)) d = h.dims[k];
      if (!d) { d = {nombre: dn, peso: NaN, modo: modo(f[3]), crit: []}; h.dims.push(d); }
      var p = num(f[2]); if (isNaN(d.peso) && !isNaN(p)) d.peso = p;
      var nv = [];
      niveles.forEach(function (n, j) {
        var raw = f[7 + j]; if (raw === '' || raw === null || raw === undefined || !txt(n)) return;
        var r = rango(raw);
        if (!r) { avisos.push('Fila ' + fila + ': no entiendo el puntaje «' + raw + '» del nivel «' + n + '». Usa un número (10) o un rango (0-3).'); return; }
        nv.push({n: txt(n), a: r[0], b: r[1]});
      });
      var mxn = nv.reduce(function (m, x) { return Math.max(m, x.b); }, 0), mx = num(f[6]);
      if (isNaN(mx)) mx = mxn;
      if (!(mx > 0)) { avisos.push('Fila ' + fila + ': falta el puntaje máximo de «' + crit + '» (no se muestra).'); return; }
      if (mxn > mx) { avisos.push('Fila ' + fila + ': un nivel de «' + crit + '» da más puntos (' + mxn + ') que el máximo (' + mx + '); se usa ' + mxn + '.'); mx = mxn; }
      d.crit.push({nombre: crit, desc: txt(f[5]), max: mx, nv: nv});
    });
    hitos.forEach(function (h) {
      h.dims = h.dims.filter(function (d) { return d.crit.length; });
      h.dims.forEach(function (d) { if (isNaN(d.peso)) d.peso = d.crit.reduce(function (a, c) { return a + c.max; }, 0); });
      var s = h.dims.reduce(function (a, d) { return a + d.peso; }, 0);
      if (s > 0 && s <= 1.0001) { h.dims.forEach(function (d) { d.peso = Math.round(d.peso * 10000) / 100; }); s = Math.round(s * 10000) / 100; }   // pesos escritos como 30 %
      h.total = s;
      if (Math.abs(s - 100) > 0.01) avisos.push(h.id + ': los pesos de las dimensiones suman ' + s + ' (lo usual es 100).');
    });
    return {hitos: hitos.filter(function (h) { return h.dims.length; }), avisos: avisos};
  }
  // Nota de un estudiante: valores = función (dimIdx, critIdx) → puntos o null
  function nota(hito, valores) {
    var tot = 0, completo = true;
    var dims = hito.dims.map(function (d, di) {
      var pts = 0, max = 0;
      d.crit.forEach(function (c, ci) { var v = valores(di, ci); max += c.max; if (v === null || v === undefined || isNaN(v)) completo = false; else pts += Math.min(c.max, Math.max(0, v)); });
      var n = max ? pts / max * d.peso : 0; tot += n;
      return {nombre: d.nombre, peso: d.peso, pts: pts, max: max, nota: n};
    });
    return {dims: dims, total: tot, completo: completo};
  }
  function red(x, d) { var f = Math.pow(10, d === undefined ? 1 : d); return Math.round((x + 1e-9) * f) / f; }
  return {sinT: sinT, num: num, rango: rango, modo: modo, parsear: parsear, nota: nota, red: red};
})();

const SEED = {"niveles":["Cumple","Cumple parcialmente","No cumple"],"filas":[["Hito 2 · Semana 6","Conceptual",30,"Por grupo","Conocimiento del tema","",10,10,5,0],["Hito 2 · Semana 6","Conceptual",30,"Por grupo","Contenido y pertinencia","",10,10,5,0],["Hito 2 · Semana 6","Conceptual",30,"Por grupo","Redacción y ortografía","",10,10,5,0],["Hito 2 · Semana 6","Procedimental",30,"Por grupo","Expresión oral","",15,15,8,0],["Hito 2 · Semana 6","Procedimental",30,"Por grupo","Análisis de la parte conceptual aplicada a la empresa","",15,15,8,0],["Hito 2 · Semana 6","Actitudinal",40,"Por estudiante","Expone su proyecto con seguridad, demuestra dominio del tema, utilizando lenguaje académico","",40,"","",""],["Hito 3 · Semana 12","Conceptual",30,"Por grupo","Conocimiento del tema","",10,10,5,0],["Hito 3 · Semana 12","Conceptual",30,"Por grupo","Contenido y pertinencia","",10,10,5,0],["Hito 3 · Semana 12","Conceptual",30,"Por grupo","Redacción y ortografía","",10,10,5,0],["Hito 3 · Semana 12","Procedimental",30,"Por grupo","Expresión oral","",15,15,8,0],["Hito 3 · Semana 12","Procedimental",30,"Por grupo","Análisis de la parte conceptual aplicada a la empresa","",15,15,8,0],["Hito 3 · Semana 12","Actitudinal",40,"Por estudiante","Expone su proyecto con seguridad, demuestra dominio del tema, utilizando lenguaje académico","",40,"","",""],["Hito 5 · Semana 20","Conceptual",30,"Por grupo","Conocimiento del tema","",10,10,5,"0-3"],["Hito 5 · Semana 20","Conceptual",30,"Por grupo","Contenido y pertinencia","",10,10,5,"0-3"],["Hito 5 · Semana 20","Conceptual",30,"Por grupo","Redacción y ortografía","",10,10,5,"0-3"],["Hito 5 · Semana 20","Procedimental",30,"Por grupo","Expresión oral","",10,10,8,"0-7"],["Hito 5 · Semana 20","Procedimental",30,"Por grupo","Análisis de la empresa, aplicando los conocimientos conceptuales obtenidos","",20,20,10,"0-9"],["Hito 5 · Semana 20","Actitudinal",40,"Por estudiante","Expone su proyecto con seguridad, demuestra dominio del tema, utilizando lenguaje académico","",40,"","",""]]};

function ss_() { return SpreadsheetApp.getActive(); }
function hoja_(n) { return ss_().getSheetByName(n); }
function txt_(s, max) { s = String(s === undefined || s === null ? '' : s).replace(/\s+$/, '').slice(0, max || 2000); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function linea_(s, max) { return txt_(String(s === undefined || s === null ? '' : s).replace(/\s+/g, ' ').trim(), max || 200); }
function ui_() { try { return SpreadsheetApp.getUi(); } catch (e) { return null; } }
function avisar_(t, m) { const u = ui_(); if (u) u.alert(t, m, u.ButtonSet.OK); else Logger.log(t + '\n' + m); }
function bitacora_(accion, detalle) {
  const sh = hoja_(H.BIT); if (!sh) return; let quien = '';
  try { quien = Session.getActiveUser().getEmail(); } catch (e) {}
  sh.appendRow([new Date(), accion, detalle || '', quien]);
}
function cabecera_(sh, cab) {
  sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setFontColor('#ffffff').setBackground(GRIS).setWrap(true).setVerticalAlignment('middle');
  sh.setFrozenRows(1);
}
function config_() {
  const sh = hoja_(H.CFG), o = {abierta: true, titulo: 'Rúbrica de evaluación procesual', hitos: [], maxEst: 7, clave: '', mensaje: 'El registro de la rúbrica está cerrado por ahora.'};
  if (!sh || sh.getLastRow() < 2) return o;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    const k = MOTOR.sinT(r[0]), v = String(r[1] === null ? '' : r[1]).trim();
    if (k.indexOf('abiert') >= 0) o.abierta = !/^no$/i.test(v);
    else if (k.indexOf('titulo') >= 0) { if (v) o.titulo = v; }
    else if (k.indexOf('hitos') >= 0) o.hitos = v ? v.split(/[;\n]/).map(function (x) { return x.trim(); }).filter(String) : [];
    else if (k.indexOf('maximo') >= 0) { const n = parseInt(v, 10); if (n > 0) o.maxEst = Math.min(n, MAX_EST_ABS); }
    else if (k.indexOf('clave') >= 0) o.clave = v;
    else if (k.indexOf('mensaje') >= 0) { if (v) o.mensaje = v; }
  });
  return o;
}
function setConfig_(clave, valor) {
  const sh = hoja_(H.CFG); if (!sh || sh.getLastRow() < 2) return false;
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < v.length; i++) if (MOTOR.sinT(v[i][0]).indexOf(clave) >= 0) { sh.getRange(i + 2, 2).setValue(valor); return true; }
  return false;
}
function leerRubrica_(habil) {
  const sh = hoja_(H.RUB); if (!sh) throw new Error('Falta la pestaña RUBRICA: ejecuta «Configuración inicial».');
  const nc = Math.max(sh.getLastColumn(), CAB_RUB_FIJAS.length), nf = sh.getLastRow();
  const cab = sh.getRange(1, 1, 1, nc).getValues()[0];
  const niveles = cab.slice(CAB_RUB_FIJAS.length).map(function (x) { return String(x).trim(); });
  while (niveles.length && !niveles[niveles.length - 1]) niveles.pop();
  const filas = nf < 2 ? [] : sh.getRange(2, 1, nf - 1, nc).getValues();
  const r = MOTOR.parsear(niveles, filas, habil);
  r.niveles = niveles.filter(String);
  return r;
}

/* ═════════════════════════ CONFIGURACIÓN INICIAL ═════════════════════════ */
function configuracionInicial() {
  const ss = ss_();
  try { ss.setSpreadsheetTimeZone('America/La_Paz'); } catch (e) {}
  const crear = function (n) { return ss.getSheetByName(n) || ss.insertSheet(n); };
  let sh = crear(H.CFG);
  if (sh.getLastRow() < 2) {
    cabecera_(sh, ['Parámetro', 'Valor', 'Ayuda']);
    sh.getRange(2, 1, 6, 3).setValues([
      ['Registro abierto', 'SÍ', 'SÍ = los docentes pueden guardar. NO = la app muestra el mensaje de cerrado.'],
      ['Título de la rúbrica', 'Rúbrica de evaluación procesual', 'Aparece arriba en la app.'],
      ['Hitos habilitados', '', 'Vacío = todos los de la pestaña RUBRICA. Para limitar, escribe los nombres exactos separados por «;».'],
      ['Máximo de estudiantes por grupo', 7, 'Cuántos nombres puede poner un docente en un grupo.'],
      ['Clave para docentes', '', 'Vacío = sin clave. Si escribes una, la app la pide una vez a cada docente.'],
      ['Mensaje cuando está cerrado', 'El registro de la rúbrica está cerrado por ahora.', '']
    ]);
    sh.getRange(2, 2, 6, 1).setNumberFormat('@').setHorizontalAlignment('left');
    sh.setColumnWidth(1, 240); sh.setColumnWidth(2, 260); sh.setColumnWidth(3, 520);
    sh.getRange(2, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['SÍ', 'NO'], true).build());
  }
  sh = crear(H.RUB);
  if (sh.getLastRow() < 2) {
    const cab = CAB_RUB_FIJAS.concat(SEED.niveles);
    cabecera_(sh, cab);
    sh.getRange(2, 1, SEED.filas.length, cab.length).setValues(SEED.filas.map(function (f) { return f.slice(0, cab.length); }));
    sh.getRange(2, 8, Math.max(SEED.filas.length, 200), 6).setNumberFormat('@').setHorizontalAlignment('center');
    sh.getRange(2, 3, Math.max(SEED.filas.length, 200), 1).setHorizontalAlignment('center');
    sh.getRange(2, 7, Math.max(SEED.filas.length, 200), 1).setHorizontalAlignment('center');
    sh.getRange(2, 4, 300, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Por grupo', 'Por estudiante'], true).build());
    [170, 130, 80, 120, 380, 260, 90, 90, 130, 100].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    sh.getRange(2, 5, 300, 2).setWrap(true);
    sh.getRange(1, 8, 1, 3).setNote('Nombre del nivel (se puede cambiar o agregar columnas a la derecha). En cada fila: un número (10), un rango (0-3) o vacío si ese nivel no aplica. Si todos los niveles están vacíos, el docente pone el puntaje directo de 0 al máximo.');
  }
  sh = crear(H.REG); if (sh.getLastRow() < 1) { cabecera_(sh, CAB_REG); sh.getRange(2, 13, sh.getMaxRows() - 1, 1).setNumberFormat('@'); [140, 110, 190, 170, 110, 140, 160, 40, 240, 80, 330, 260, 110, 80].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); }); }
  sh = crear(H.DET); if (sh.getLastRow() < 1) cabecera_(sh, CAB_DET);
  sh = crear(H.PAP); if (sh.getLastRow() < 1) cabecera_(sh, CAB_REG.concat(['Anulado el', 'Motivo']));
  sh = crear(H.BIT); if (sh.getLastRow() < 1) cabecera_(sh, ['Fecha', 'Acción', 'Detalle', 'Usuario']);
  ['Hoja 1', 'Sheet1', 'Hoja1'].forEach(function (n) { const x = ss.getSheetByName(n); if (x && x.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(x); });
  const orden = [H.RUB, H.CFG, H.REG, H.DET, H.PAP, H.BIT];
  orden.forEach(function (n, i) { const x = ss.getSheetByName(n); if (x) { ss.setActiveSheet(x); ss.moveActiveSheet(i + 1); } });
  ss.setActiveSheet(ss.getSheetByName(H.RUB));
  bitacora_('Configuración inicial', VERSION);
  try { onOpen(); } catch (e) {}
  avisar_('Listo', 'Pestañas creadas. La rúbrica está en RUBRICA: lo que cambies ahí aparece en la app al abrirla.\n\nAhora: Implementar → Nueva implementación → Aplicación web (Ejecutar como: Yo · Acceso: Cualquier persona).');
}

function onOpen() {
  const u = ui_(); if (!u) return;
  u.createMenu('Rúbrica')
    .addItem('📊 Ver avance', 'verAvance')
    .addItem('✔ Revisar la rúbrica (pesos y puntajes)', 'revisarRubrica')
    .addSeparator()
    .addItem('▶ Abrir registro', 'abrirRegistro')
    .addItem('⏸ Cerrar registro', 'cerrarRegistro')
    .addSeparator()
    .addItem('Anular un registro (por ID)…', 'anularRegistro')
    .addItem('Borrar registros de prueba', 'borrarPruebas')
    .addItem('Configuración inicial', 'configuracionInicial')
    .addToUi();
}
function abrirRegistro() { setConfig_('abiert', 'SÍ'); bitacora_('Registro abierto'); avisar_('Registro abierto', 'Los docentes ya pueden guardar.'); }
function cerrarRegistro() { setConfig_('abiert', 'NO'); bitacora_('Registro cerrado'); avisar_('Registro cerrado', 'La app mostrará el mensaje de cerrado.'); }

function revisarRubrica() {
  const r = leerRubrica_([]), cfg = config_(), t = [];
  r.hitos.forEach(function (h) {
    t.push('■ ' + h.id + ' — total ' + h.total + (Math.abs(h.total - 100) > 0.01 ? '  ⚠' : ''));
    h.dims.forEach(function (d) {
      const m = d.crit.reduce(function (a, c) { return a + c.max; }, 0);
      t.push('   · ' + d.nombre + ' ' + d.peso + '% (' + (d.modo === 'grupo' ? 'por grupo' : 'por estudiante') + '): ' + d.crit.length + ' criterio(s), suman ' + m + ' pts' + (m !== d.peso ? ' → se escala a ' + d.peso : ''));
    });
  });
  if (cfg.hitos.length) t.push('', 'Hitos habilitados en CONFIG: ' + cfg.hitos.join('; '));
  if (r.avisos.length) t.push('', 'Avisos:', r.avisos.map(function (a) { return '⚠ ' + a; }).join('\n'));
  avisar_('Rúbrica tal como la ve la app', t.join('\n') || 'La pestaña RUBRICA está vacía.');
}

function verAvance() {
  const sh = hoja_(H.REG); if (!sh || sh.getLastRow() < 2) { avisar_('Avance', 'Todavía no hay registros.'); return; }
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, CAB_REG.length).getValues(), g = {};
  v.forEach(function (r) { const k = r[2] + ' · ' + r[3] + ' ' + r[4] + ' · ' + r[5]; g[k] = g[k] || {ids: {}, n: 0}; g[k].ids[r[1]] = 1; g[k].n++; });
  const t = Object.keys(g).sort().map(function (k) { return k + ': ' + Object.keys(g[k].ids).length + ' grupo(s), ' + g[k].n + ' estudiante(s)'; });
  avisar_('Avance (docente · materia paralelo · hito)', t.join('\n'));
}

function filasDeId_(sh, col, id) {
  const n = sh.getLastRow(); if (n < 2) return [];
  const v = sh.getRange(2, col, n - 1, 1).getValues(), out = [];
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === id) out.push(i + 2);
  return out;
}
function borrarFilas_(sh, filas) {   // filas en orden ascendente; borra por bloques contiguos desde abajo
  for (let i = filas.length - 1; i >= 0;) {
    let j = i; while (j > 0 && filas[j - 1] === filas[j] - 1) j--;
    sh.deleteRows(filas[j], i - j + 1); i = j - 1;
  }
}
function anularRegistro() {
  const u = ui_(); if (!u) return;
  const r = u.prompt('Anular un registro', 'ID del registro (columna B de REGISTROS, por ejemplo RP-AB12CD34). Pasa a PAPELERA.', u.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== u.Button.OK) return;
  const id = String(r.getResponseText()).trim().toUpperCase();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const reg = hoja_(H.REG), f = filasDeId_(reg, 2, id);
    if (!f.length) { avisar_('No encontrado', 'No hay filas con el ID ' + id + '.'); return; }
    const pap = hoja_(H.PAP), ahora = new Date();
    const filas = f.map(function (n) { return reg.getRange(n, 1, 1, CAB_REG.length).getValues()[0].concat([ahora, 'Anulado desde el menú']); });
    pap.getRange(pap.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);
    borrarFilas_(reg, f);
    const det = hoja_(H.DET); borrarFilas_(det, filasDeId_(det, 1, id));
    bitacora_('Registro anulado', id + ' (' + f.length + ' estudiante/s)');
    avisar_('Anulado', id + ': ' + f.length + ' fila(s) pasaron a PAPELERA.');
  } finally { lock.releaseLock(); }
}
function borrarPruebas() {
  const lock = LockService.getScriptLock(); lock.waitLock(20000); let n = 0;
  try {
    const reg = hoja_(H.REG), ids = {};
    if (reg.getLastRow() >= 2) reg.getRange(2, 1, reg.getLastRow() - 1, 3).getValues().forEach(function (r) { if (/^prueba/i.test(String(r[2]).trim())) ids[r[1]] = 1; });
    Object.keys(ids).forEach(function (id) { const f = filasDeId_(reg, 2, id); n += f.length; borrarFilas_(reg, f); const det = hoja_(H.DET); borrarFilas_(det, filasDeId_(det, 1, id)); });
    bitacora_('Borrar registros de prueba', n + ' fila(s)');
  } finally { lock.releaseLock(); }
  avisar_('Registros de prueba', n ? 'Se borraron ' + n + ' fila(s) cuyo docente empieza con «PRUEBA».' : 'No hay registros cuyo docente empiece con «PRUEBA».');
}

/* ═════════════════════════ APLICACIÓN WEB ═════════════════════════ */
function salida_(o, cb) {
  const j = JSON.stringify(o);
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) return ContentService.createTextOutput(cb + '(' + j + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(j).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  const p = (e && e.parameter) || {}; let r;
  try {
    if (p.action === 'rubrica') r = rubricaApp_();
    else if (p.action === 'clave') r = {ok: true, valida: claveOk_(p.clave)};
    else if (p.action === 'verificar') r = verificar_(p);
    else if (p.action === 'guardar') r = guardar_(JSON.parse(p.data || '{}'));
    else r = ping_();
  } catch (err) { r = {ok: false, error: String(err && err.message || err)}; }
  return salida_(r, p.callback);
}
function doPost(e) {
  let r;
  try { const b = JSON.parse(e.postData.contents); r = b.action === 'guardar' ? guardar_(b.data || {}) : {ok: false, error: 'accion_desconocida'}; }
  catch (err) { r = {ok: false, error: String(err && err.message || err)}; }
  return salida_(r);
}
function ping_() {
  const sh = hoja_(H.REG), cfg = config_();
  return {ok: true, version: VERSION, abierta: cfg.abierta, filas: sh ? Math.max(0, sh.getLastRow() - 1) : 0, hora: new Date().getTime()};
}
function claveOk_(c) { const cfg = config_(); return !cfg.clave || String(c || '').trim() === cfg.clave; }
function rubricaApp_() {
  const cfg = config_(), r = leerRubrica_(cfg.hitos);
  return {ok: true, version: VERSION, abierta: cfg.abierta, mensaje: cfg.mensaje, titulo: cfg.titulo, maxEst: cfg.maxEst, clave: !!cfg.clave, niveles: r.niveles, hitos: r.hitos};
}
function verificar_(p) {
  const sh = hoja_(H.REG), id = String(p.id || ''), rev = String(p.rev || '');
  if (!sh || !id) return {ok: true, existe: false};
  const f = filasDeId_(sh, 2, id);
  const existe = f.some(function (n) { return String(sh.getRange(n, 13).getValue()) === rev; });
  return {ok: true, existe: existe};
}
function guardar_(d) {
  const cfg = config_();
  if (!cfg.abierta) return {ok: false, codigo: 'cerrada', mensaje: cfg.mensaje};
  if (cfg.clave && String(d.clave || '').trim() !== cfg.clave) return {ok: false, codigo: 'clave'};
  const id = String(d.id || '').toUpperCase(), rev = String(d.rev || '');
  const docente = linea_(d.docente, 120), materia = linea_(d.materia, 120), paralelo = linea_(d.paralelo, 60), hito = linea_(d.hito, 120), grupo = linea_(d.grupo, 160);
  if (!/^RP-[A-Z0-9]{6,12}$/.test(id) || !/^\d{6,16}$/.test(rev)) return {ok: false, codigo: 'datos', mensaje: 'Identificador inválido.'};
  if (!docente || !hito) return {ok: false, codigo: 'datos', mensaje: 'Falta el nombre del docente o el hito.'};
  const est = Array.isArray(d.est) ? d.est : [];
  if (!est.length) return {ok: false, codigo: 'datos', mensaje: 'El grupo no tiene estudiantes.'};
  if (est.length > cfg.maxEst) return {ok: false, codigo: 'datos', mensaje: 'El grupo tiene ' + est.length + ' estudiantes; el máximo es ' + cfg.maxEst + '.'};
  const ahora = new Date(), filasReg = [], filasDet = [];
  est.forEach(function (s, i) {
    const nombre = linea_(s.nombre, 160); if (!nombre) return;
    const items = Array.isArray(s.items) ? s.items.slice(0, 200) : [], dims = [], porDim = {};
    items.forEach(function (it) {
      const dn = linea_(it.dim, 80), max = Math.max(0, Number(it.max) || 0), pts = Math.min(max, Math.max(0, Number(it.pts) || 0)), peso = Math.max(0, Number(it.peso) || 0);
      if (!porDim[dn]) { porDim[dn] = {nombre: dn, peso: peso, pts: 0, max: 0}; dims.push(porDim[dn]); }
      porDim[dn].pts += pts; porDim[dn].max += max;
      filasDet.push([id, rev, hito, docente, materia, paralelo, grupo, nombre, dn, peso, it.modo === 'estudiante' ? 'Por estudiante' : 'Por grupo', linea_(it.crit, 300), linea_(it.nivel, 60), pts, max]);
    });
    let total = 0;
    const detalle = dims.map(function (x) { const n = x.max ? x.pts / x.max * x.peso : 0; total += n; return x.nombre + ' ' + MOTOR.red(n, 1) + '/' + x.peso; }).join(' · ');
    filasReg.push([ahora, id, docente, materia, paralelo, hito, grupo, i + 1, nombre, MOTOR.red(total, 2), detalle, txt_(d.obs, 2000), rev, linea_(d.version, 20)]);
  });
  if (!filasReg.length) return {ok: false, codigo: 'datos', mensaje: 'El grupo no tiene estudiantes.'};
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const reg = hoja_(H.REG), det = hoja_(H.DET);
    if (!reg || !det) throw new Error('Faltan pestañas: ejecuta «Configuración inicial».');
    const viejas = filasDeId_(reg, 2, id);
    if (viejas.length) {      // edición: reemplaza el registro anterior del mismo grupo
      if (String(reg.getRange(viejas[0], 13).getValue()) === rev) return {ok: true, id: id, rev: rev, repetido: true};
      borrarFilas_(reg, viejas); borrarFilas_(det, filasDeId_(det, 1, id));
    }
    reg.getRange(reg.getLastRow() + 1, 1, filasReg.length, CAB_REG.length).setValues(filasReg);
    if (filasDet.length) det.getRange(det.getLastRow() + 1, 1, filasDet.length, CAB_DET.length).setValues(filasDet);
    if (viejas.length) bitacora_('Registro editado', id + ' · ' + docente + ' · ' + hito);
  } finally { lock.releaseLock(); }
  return {ok: true, id: id, rev: rev, n: filasReg.length};
}
