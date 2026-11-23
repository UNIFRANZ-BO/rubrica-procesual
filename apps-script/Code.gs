/**
 * Rúbrica procesual — UNIFRANZ · backend de la app (aplicación web) + menú «Rúbrica» de la hoja.
 * Generado con build.py a partir de Code.src.gs, motor.js y rubrica.json: no lo edites a mano.
 *
 * Primera vez: pegar este código → ejecutar «configuracionInicial» → Implementar → Nueva implementación →
 *              Aplicación web · Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 * Para actualizar el código: Implementar → Administrar implementaciones → ✏️ → Nueva versión (NUNCA «Nueva implementación»).
 *
 * La rúbrica (una sola para todos los hitos) se edita en la pestaña RUBRICA, con el mismo formato que se ve en la app.
 *
 * @OnlyCurrentDoc
 */
const VERSION = 'RP 2.1';
const GRIS = '#3a3a3a';
const H = {CFG: 'CONFIG', RUB: 'RUBRICA', REG: 'REGISTROS', DET: 'DETALLE', PAP: 'PAPELERA', BIT: 'BITACORA'};
const CAB_REG = ['Fecha y hora', 'ID registro', 'Docente', 'Hito', 'Semestre', 'Carrera del grupo', 'Grupo / proyecto', 'N.º', 'Estudiante', 'Carrera',
  'Nota final (sobre 100)', 'Nota sobre 10', 'Detalle por dimensión', 'Observaciones', 'Revisión', 'Versión app'];
const CAB_DET = ['ID registro', 'Revisión', 'Hito', 'Docente', 'Semestre', 'Carrera del grupo', 'Grupo / proyecto', 'Estudiante', 'Carrera',
  'Dimensión', 'Peso (%)', 'Se califica', 'Criterio', 'Nivel', 'Puntos', 'Puntaje máximo'];
const COL_REV = CAB_REG.indexOf('Revisión') + 1;
const MAX_EST_ABS = 40;
// Colores de cada dimensión en la pestaña RUBRICA: [encabezado, fondo]
const COLORES = [['#b9adf7', '#efecfd'], ['#8fdbe8', '#e5f7fa'], ['#ffd08a', '#fff4e1'], ['#f7a8c4', '#fdeaf1'], ['#b5e3a0', '#eef8e8'], ['#a9c8f5', '#e9f1fd']];
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
  function letra(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - 1 - m) / 26 | 0; } return s; }
  // Pestaña RUBRICA en formato visual: columna A = etiquetas (Dimensión, Peso (%), Se califica, Criterio, Descripción,
  // Puntaje máximo y, debajo, un renglón por nivel); desde la columna B, una columna por criterio. La dimensión, el peso y
  // «se califica» se escriben en la primera columna de su bloque (pueden estar combinadas). Devuelve {niveles, filas, donde}.
  function desdeTabla(g) {
    var et = {}, niveles = [], filasNv = [], filas = [], cols = [];
    g.forEach(function (row, i) {
      var k = sinT(row[0]); if (!k) return;
      if (k.indexOf('dimension') === 0) et.dim = i;
      else if (k.indexOf('peso') === 0) et.peso = i;
      else if (k.indexOf('califica') >= 0) et.modo = i;
      else if (k.indexOf('descrip') === 0) et.desc = i;
      else if (k.indexOf('puntaje') === 0 || k.indexOf('maximo') >= 0) et.max = i;
      else if (k.indexOf('criterio') === 0 && et.crit === undefined) et.crit = i;
    });
    if (et.crit === undefined) return {niveles: [], filas: [], donde: function () { return ''; }};
    var ult = Math.max.apply(null, [et.dim, et.peso, et.modo, et.desc, et.max, et.crit].filter(function (x) { return x !== undefined; }));
    g.forEach(function (row, i) { var t = txt(row[0]); if (i > ult && t && !/^(nota|instruc|como|ayuda|ℹ)/i.test(sinT(t))) { niveles.push(t); filasNv.push(i); } });
    var c0 = function (i, c) { return i === undefined || !g[i] || g[i][c] === undefined || g[i][c] === null ? '' : g[i][c]; };
    var ncol = g.reduce(function (m, r) { return Math.max(m, r.length); }, 0), dim = '', peso = '', md = '';
    for (var c = 1; c < ncol; c++) {
      var dn = txt(c0(et.dim, c));
      if (dn) { dim = dn; peso = c0(et.peso, c); md = c0(et.modo, c); }
      else { var p = c0(et.peso, c); if (txt(p)) peso = p; var m = c0(et.modo, c); if (txt(m)) md = m; }
      var cn = txt(c0(et.crit, c)); if (!cn) continue;
      filas.push(['Rúbrica', dim, peso, md, cn, c0(et.desc, c), c0(et.max, c)].concat(filasNv.map(function (i) { return c0(i, c); })));
      cols.push(c);
    }
    return {niveles: niveles, filas: filas, donde: function (i) { return 'Columna ' + letra(cols[i] + 1); }};
  }
  // Rúbrica de rubrica.json (dims con nv crudos) → filas para parsear
  function aFilas(r) {
    var f = [];
    r.dims.forEach(function (d) { d.crit.forEach(function (c) { f.push(['Rúbrica', d.nombre, d.peso, d.modo, c.nombre, c.desc || '', c.max].concat(c.nv)); }); });
    return f;
  }
  // niveles: nombres de los niveles · filas: [hito, dimensión, peso, se califica, criterio, descripción, máximo, nivel1, nivel2…]
  function parsear(niveles, filas, habil, donde) {
    var hitos = [], avisos = [], porId = {}, hab = (habil || []).map(sinT).filter(Boolean);
    filas.forEach(function (f, i) {
      var fila = donde ? donde(i) : 'Fila ' + (i + 2), hito = txt(f[0]), crit = txt(f[4]);
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
        if (!r) { avisos.push(fila + ': no entiendo el puntaje «' + raw + '» del nivel «' + n + '». Usa un número (10) o un rango (0-3).'); return; }
        nv.push({n: txt(n), a: r[0], b: r[1]});
      });
      var mxn = nv.reduce(function (m, x) { return Math.max(m, x.b); }, 0), mx = num(f[6]);
      if (isNaN(mx)) mx = mxn;
      if (!(mx > 0)) { avisos.push(fila + ': falta el puntaje máximo de «' + crit + '» (no se muestra).'); return; }
      if (mxn > mx) { avisos.push(fila + ': un nivel de «' + crit + '» da más puntos (' + mxn + ') que el máximo (' + mx + '); se usa ' + mxn + '.'); mx = mxn; }
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
  return {sinT: sinT, num: num, rango: rango, modo: modo, letra: letra, desdeTabla: desdeTabla, aFilas: aFilas, parsear: parsear, nota: nota, red: red};
})();

const SEED = {"titulo":"Rúbrica de evaluación procesual","hitos":["Hito 2","Hito 3","Hito 4","Hito 5"],"carreras":["ADM","ICO"],"niveles":["Cumple","Cumple parcialmente","No cumple"],"dims":[{"nombre":"Conceptual","peso":30,"modo":"Por grupo","crit":[{"nombre":"Conocimiento del tema","desc":"","max":10,"nv":[10,5,"0-3"]},{"nombre":"Contenido y pertinencia","desc":"","max":10,"nv":[10,5,"0-3"]},{"nombre":"Redacción y ortografía","desc":"","max":10,"nv":[10,5,"0-3"]}]},{"nombre":"Procedimental","peso":30,"modo":"Por grupo","crit":[{"nombre":"Expresión oral","desc":"","max":10,"nv":[10,8,"0-7"]},{"nombre":"Análisis de la empresa, aplicando los conocimientos conceptuales obtenidos","desc":"","max":20,"nv":[20,10,"0-9"]}]},{"nombre":"Actitudinal","peso":40,"modo":"Por estudiante","crit":[{"nombre":"Expone su proyecto con seguridad, demuestra dominio del tema, utilizando lenguaje académico","desc":"","max":40,"nv":["","",""]}]}]};

function ss_() { return SpreadsheetApp.getActive(); }
function hoja_(n) { return ss_().getSheetByName(n); }
function txt_(s, max) { s = String(s === undefined || s === null ? '' : s).replace(/\s+$/, '').slice(0, max || 2000); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function linea_(s, max) { return txt_(String(s === undefined || s === null ? '' : s).replace(/\s+/g, ' ').trim(), max || 200); }
function ui_() { try { return SpreadsheetApp.getUi(); } catch (e) { return null; } }
function avisar_(t, m) { const u = ui_(); if (u) u.alert(t, m, u.ButtonSet.OK); else Logger.log(t + '\n' + m); }
function lista_(v) { return v ? String(v).split(/[;\n]/).map(function (x) { return x.trim(); }).filter(String) : []; }
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
  const sh = hoja_(H.CFG), o = {abierta: true, titulo: SEED.titulo, hitos: SEED.hitos.slice(), semestres: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    carreras: SEED.carreras.slice(), maxEst: 7, clave: '', mensaje: 'El registro de la rúbrica está cerrado por ahora.'};
  if (!sh || sh.getLastRow() < 2) return o;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    const k = MOTOR.sinT(r[0]), v = String(r[1] === null ? '' : r[1]).trim();
    if (k.indexOf('abiert') >= 0) o.abierta = !/^no$/i.test(v);
    else if (k.indexOf('titulo') >= 0) { if (v) o.titulo = v; }
    else if (k.indexOf('hito') >= 0) { if (v) o.hitos = lista_(v); }
    else if (k.indexOf('semestre') >= 0) { if (v) o.semestres = lista_(v); }
    else if (k.indexOf('carrera') >= 0) { if (v) o.carreras = lista_(v); }
    else if (k.indexOf('maximo') >= 0) { const n = parseInt(v, 10); if (n > 0) o.maxEst = Math.min(n, MAX_EST_ABS); }
    else if (k.indexOf('clave') >= 0) o.clave = v;
    else if (k.indexOf('mensaje') >= 0) { if (v) o.mensaje = v; }
  });
  return o;
}
function filaConfig_(clave) {
  const sh = hoja_(H.CFG); if (!sh || sh.getLastRow() < 2) return 0;
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < v.length; i++) if (MOTOR.sinT(v[i][0]).indexOf(clave) >= 0) return i + 2;
  return 0;
}
function setConfig_(clave, valor) { const f = filaConfig_(clave); if (f) hoja_(H.CFG).getRange(f, 2).setValue(valor); return !!f; }

/* ───────── la rúbrica (pestaña RUBRICA, formato visual) ───────── */
function leerRubrica_() {
  const sh = hoja_(H.RUB); if (!sh) throw new Error('Falta la pestaña RUBRICA: ejecuta «Configuración inicial».');
  const t = MOTOR.desdeTabla(sh.getDataRange().getValues());
  const r = MOTOR.parsear(t.niveles, t.filas, [], t.donde), h = r.hitos[0] || {dims: [], total: 0};
  if (!t.filas.length) r.avisos.push('La pestaña RUBRICA no tiene criterios (fila «Criterio»).');
  return {dims: h.dims, total: h.total, niveles: t.niveles, avisos: r.avisos};
}
function esRubricaVieja_(sh) { return sh.getLastRow() >= 1 && MOTOR.sinT(sh.getRange(1, 1).getValue()) === 'hito'; }
function crearRubrica_(sh, rub, titulo) {
  const cols = []; rub.dims.forEach(function (d, di) { d.crit.forEach(function (c, ci) { cols.push({d: d, di: di, c: c, ci: ci}); }); });
  const etq = ['Dimensión', 'Peso (%)', 'Se califica', 'Criterio', 'Descripción (opcional)', 'Puntaje máximo'].concat(rub.niveles);
  const F0 = 4, n = cols.length + 1, filas = etq.map(function (e, i) {
    return [e].concat(cols.map(function (x) {
      const prim = x.ci === 0;
      switch (i) {
        case 0: return prim ? x.d.nombre : ''; case 1: return prim ? x.d.peso : ''; case 2: return prim ? x.d.modo : '';
        case 3: return x.c.nombre; case 4: return x.c.desc || ''; case 5: return x.c.max;
        default: { const v = x.c.nv[i - 6]; return v === undefined || v === null ? '' : String(v); }
      }
    }));
  });
  sh.clear(); try { sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart(); } catch (e) {}
  sh.getRange(1, 1, 1, n).merge().setValue(String(titulo || SEED.titulo).toUpperCase()).setFontSize(15).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1b2440').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.getRange(2, 1, 1, n).merge().setValue('Edita aquí la rúbrica (sirve para todos los hitos): lo que cambies aparece en la app al abrirla. Una columna por criterio: para agregar uno, inserta una columna dentro de su dimensión; para otra dimensión, escribe su nombre, peso y «Se califica» en la primera columna del bloque. Cada nivel: un número (10), un rango (0-3) o vacío; si todos están vacíos, el docente pone la nota directa. Puedes agregar niveles en filas nuevas al final.')
    .setFontStyle('italic').setFontColor('#5f6b7d').setWrap(true).setFontSize(9).setVerticalAlignment('middle');
  sh.setRowHeight(1, 40); sh.setRowHeight(2, 46);
  sh.getRange(F0 + 6, 2, Math.max(rub.niveles.length, 1) + 6, Math.max(n - 1, 1) + 12).setNumberFormat('@');
  sh.getRange(F0, 1, filas.length, n).setValues(filas).setVerticalAlignment('middle').setHorizontalAlignment('center').setWrap(true)
    .setBorder(true, true, true, true, true, true, '#c9d0db', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(F0, 1, filas.length, 1).setBackground(GRIS).setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('left');
  let c = 2;
  rub.dims.forEach(function (d, di) {
    const k = d.crit.length, col = COLORES[di % COLORES.length];
    [0, 1, 2].forEach(function (i) { const r = sh.getRange(F0 + i, c, 1, k); if (k > 1) r.merge(); r.setBackground(col[0]).setFontWeight(i === 0 ? 'bold' : 'normal'); });
    sh.getRange(F0, c, 1, k).setFontSize(12);
    sh.getRange(F0 + 3, c, filas.length - 3, k).setBackground(col[1]);
    sh.getRange(F0 + 3, c, 1, k).setFontWeight('bold');
    c += k;
  });
  sh.getRange(F0 + 2, 2, 1, Math.max(n - 1, 1) + 12).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Por grupo', 'Por estudiante'], true).setAllowInvalid(true).build());
  sh.getRange(F0 + 3, 1).setNote('Nombre del criterio. Una columna = un criterio.');
  sh.getRange(F0 + 5, 1).setNote('Puntaje máximo del criterio. Si lo dejas vacío, se toma el puntaje más alto de sus niveles.');
  sh.getRange(F0 + 6, 1).setNote('Desde aquí hacia abajo, un renglón por nivel (puedes cambiar el nombre o agregar niveles). En cada criterio: número (10), rango (0-3) o vacío.');
  sh.setColumnWidth(1, 170); for (let i = 2; i <= n; i++) sh.setColumnWidth(i, 175);
  sh.setRowHeight(F0 + 3, 62);
}

/* ═════════════════════════ CONFIGURACIÓN INICIAL (también migra versiones anteriores) ═════════════════════════ */
function configuracionInicial() {
  const ss = ss_(), cambios = [];
  try { ss.setSpreadsheetTimeZone('America/La_Paz'); } catch (e) {}
  const crear = function (n) { return ss.getSheetByName(n) || ss.insertSheet(n); };
  // CONFIG
  let sh = crear(H.CFG);
  if (sh.getLastRow() < 2) {
    cabecera_(sh, ['Parámetro', 'Valor', 'Ayuda']);
    sh.getRange(2, 1, 9, 3).setValues([
      ['Registro abierto', 'SÍ', 'SÍ = los docentes pueden guardar. NO = la app muestra el mensaje de cerrado.'],
      ['Título de la rúbrica', SEED.titulo, 'Aparece arriba en la app.'],
      ['Hitos', SEED.hitos.join('; '), 'Hitos que el docente puede elegir, separados por «;». Cada hito es una evaluación aparte, con la misma rúbrica.'],
      ['Máximo de estudiantes por grupo', 7, 'Cuántos nombres puede poner un docente en un grupo.'],
      ['Clave para docentes', '', 'Vacío = sin clave. Si escribes una, la app la pide una vez a cada docente.'],
      ['Mensaje cuando está cerrado', 'El registro de la rúbrica está cerrado por ahora.', ''],
      ['Semestres', '1; 2; 3; 4; 5; 6; 7; 8; 9; 10', 'Opciones que el docente elige en «Semestre», separadas por «;».'],
      ['Carreras', SEED.carreras.join('; '), 'Carreras de los estudiantes, separadas por «;». El grupo puede ser de una carrera o mixto (por ejemplo ADM/ICO).'],
      ['', '', '']
    ]);
    sh.getRange(2, 2, 9, 1).setNumberFormat('@').setHorizontalAlignment('left');
    sh.setColumnWidth(1, 240); sh.setColumnWidth(2, 260); sh.setColumnWidth(3, 560);
    sh.getRange(2, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['SÍ', 'NO'], true).build());
  } else {
    const fp = filaConfig_('paralelo'); if (fp) { sh.deleteRow(fp); cambios.push('CONFIG: se quitó «Paralelos».'); }
    const fh = filaConfig_('hito');
    if (fh) {
      const v = String(sh.getRange(fh, 2).getValue()).trim();
      sh.getRange(fh, 1, 1, 3).setValues([['Hitos', v || SEED.hitos.join('; '), 'Hitos que el docente puede elegir, separados por «;». Cada hito es una evaluación aparte, con la misma rúbrica.']]);
      if (!v) cambios.push('CONFIG: «Hitos» = ' + SEED.hitos.join('; ') + '.');
    }
    if (!filaConfig_('carrera')) {
      const f = sh.getLastRow() + 1;
      sh.getRange(f, 1, 1, 3).setValues([['Carreras', SEED.carreras.join('; '), 'Carreras de los estudiantes, separadas por «;». El grupo puede ser de una carrera o mixto (por ejemplo ADM/ICO).']]);
      sh.getRange(f, 2).setNumberFormat('@'); cambios.push('CONFIG: se agregó «Carreras».');
    }
  }
  // RUBRICA (una sola, formato visual)
  sh = ss.getSheetByName(H.RUB);
  if (sh && esRubricaVieja_(sh)) { const nom = 'RUBRICA (anterior)'; const x = ss.getSheetByName(nom); if (x) ss.deleteSheet(x); sh.setName(nom); sh = null; cambios.push('La rúbrica por hito pasó a «RUBRICA (anterior)» (puedes borrarla) y se creó la nueva RUBRICA única.'); }
  if (!sh) sh = ss.insertSheet(H.RUB);
  if (sh.getLastRow() < 2) crearRubrica_(sh, SEED, config_().titulo);
  // REGISTROS, DETALLE, PAPELERA (si el encabezado cambió: con datos se guarda la versión anterior aparte)
  [[H.REG, CAB_REG], [H.DET, CAB_DET], [H.PAP, CAB_REG.concat(['Anulado el', 'Motivo'])]].forEach(function (p) {
    let x = ss.getSheetByName(p[0]), datos = null;
    if (x && x.getLastRow() >= 1 && !cabeceraOk_(x, p[1])) {
      if (x.getLastRow() > 1) {
        const nom = p[0] + ' (respaldo v1)'; const y = ss.getSheetByName(nom); if (y) ss.deleteSheet(y);
        x.copyTo(ss).setName(nom);
        datos = migrarFilas_(x.getDataRange().getValues(), p[1]);
        cambios.push(p[0] + ': ' + datos.length + ' fila(s) pasaron al formato nuevo (copia sin tocar en «' + nom + '»).');
      }
      x.clear();
    }
    if (!x) x = ss.insertSheet(p[0]);
    if (x.getLastRow() < 1) {
      cabecera_(x, p[1]);
      if (p[0] === H.REG) x.getRange(2, COL_REV, x.getMaxRows() - 1, 1).setNumberFormat('@');
      if (p[0] === H.DET) x.getRange(2, 2, x.getMaxRows() - 1, 1).setNumberFormat('@');
      if (datos && datos.length) x.getRange(2, 1, datos.length, p[1].length).setValues(datos);
      if (p[0] === H.REG) {
        [140, 110, 190, 90, 80, 110, 170, 40, 240, 80, 90, 80, 330, 260, 110, 80].forEach(function (w, i) { x.setColumnWidth(i + 1, w); });
      }
    }
  });
  sh = crear(H.BIT); if (sh.getLastRow() < 1) cabecera_(sh, ['Fecha', 'Acción', 'Detalle', 'Usuario']);
  ['Hoja 1', 'Sheet1', 'Hoja1'].forEach(function (n) { const x = ss.getSheetByName(n); if (x && x.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(x); });
  [H.RUB, H.CFG, H.REG, H.DET, H.PAP, H.BIT].forEach(function (n, i) { const x = ss.getSheetByName(n); if (x) { ss.setActiveSheet(x); ss.moveActiveSheet(i + 1); } });
  ss.setActiveSheet(ss.getSheetByName(H.RUB));
  bitacora_('Configuración inicial', VERSION + (cambios.length ? ' · ' + cambios.join(' ') : ''));
  try { onOpen(); } catch (e) {}
  avisar_('Listo', (cambios.length ? cambios.join('\n') + '\n\n' : '') + 'La rúbrica está en RUBRICA (una sola tabla para todos los hitos): lo que cambies ahí aparece en la app al abrirla.');
}
// Filas con el encabezado de la v1 → filas con el encabezado nuevo (las columnas se buscan por nombre)
function migrarFilas_(v, cab) {
  const viejo = v[0].map(function (x) { return String(x).trim(); }), alias = {'Nota final (sobre 100)': 'Nota final'};
  const ix = cab.map(function (c) { let i = viejo.indexOf(c); if (i < 0 && alias[c]) i = viejo.indexOf(alias[c]); return i; });
  const iNota = viejo.indexOf('Nota final');
  return v.slice(1).filter(function (f) { return f.some(function (x) { return x !== '' && x !== null; }); }).map(function (f) {
    return cab.map(function (c, j) {
      if (c === 'Nota sobre 10' && ix[j] < 0) { const n = Number(f[iNota]); return iNota >= 0 && f[iNota] !== '' && !isNaN(n) ? Math.round(n / 10 + 1e-9) : ''; }
      return ix[j] >= 0 ? f[ix[j]] : '';
    });
  });
}
function cabeceraOk_(sh, cab) {
  if (sh.getLastColumn() < cab.length) return false;
  const c = sh.getRange(1, 1, 1, cab.length).getValues()[0];
  for (let i = 0; i < cab.length; i++) if (String(c[i]) !== cab[i]) return false;
  return true;
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
    .addItem('Restablecer la rúbrica original…', 'restablecerRubrica')
    .addItem('Configuración inicial', 'configuracionInicial')
    .addToUi();
}
function abrirRegistro() { setConfig_('abiert', 'SÍ'); bitacora_('Registro abierto'); avisar_('Registro abierto', 'Los docentes ya pueden guardar.'); }
function cerrarRegistro() { setConfig_('abiert', 'NO'); bitacora_('Registro cerrado'); avisar_('Registro cerrado', 'La app mostrará el mensaje de cerrado.'); }
function restablecerRubrica() {
  const u = ui_(); if (!u) return;
  if (u.alert('Restablecer la rúbrica', 'La pestaña RUBRICA vuelve a la rúbrica original (la del Excel). Lo que cambiaste en ella se pierde. ¿Continuar?', u.ButtonSet.YES_NO) !== u.Button.YES) return;
  crearRubrica_(hoja_(H.RUB) || ss_().insertSheet(H.RUB), SEED, config_().titulo); bitacora_('Rúbrica restablecida');
}

function revisarRubrica() {
  const r = leerRubrica_(), cfg = config_(), t = ['■ Total ' + r.total + (Math.abs(r.total - 100) > 0.01 ? '  ⚠ (lo usual es 100)' : '')];
  r.dims.forEach(function (d) {
    const m = d.crit.reduce(function (a, c) { return a + c.max; }, 0);
    t.push('   · ' + d.nombre + ' ' + d.peso + '% (' + (d.modo === 'grupo' ? 'por grupo' : 'por estudiante') + '): ' + d.crit.length + ' criterio(s), suman ' + m + ' pts' + (m !== d.peso ? ' → se escala a ' + d.peso : ''));
    d.crit.forEach(function (c) { t.push('        – ' + c.nombre + ' (máx. ' + c.max + ')' + (c.nv.length ? ': ' + c.nv.map(function (n) { return n.n + ' ' + (n.a === n.b ? n.a : n.a + '-' + n.b); }).join(' · ') : ': nota directa')); });
  });
  t.push('', 'Hitos: ' + cfg.hitos.join('; '), 'Carreras: ' + cfg.carreras.join('; '));
  if (r.avisos.length) t.push('', 'Avisos:', r.avisos.map(function (a) { return '⚠ ' + a; }).join('\n'));
  avisar_('Rúbrica tal como la ve la app', t.join('\n'));
}

function verAvance() {
  const sh = hoja_(H.REG); if (!sh || sh.getLastRow() < 2) { avisar_('Avance', 'Todavía no hay registros.'); return; }
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, CAB_REG.length).getValues(), g = {};
  v.forEach(function (r) { const k = r[2] + ' · ' + r[3] + ' · sem. ' + r[4] + ' · ' + r[5]; g[k] = g[k] || {ids: {}, n: 0}; g[k].ids[r[1]] = 1; g[k].n++; });
  const t = Object.keys(g).sort().map(function (k) { return k + ': ' + Object.keys(g[k].ids).length + ' grupo(s), ' + g[k].n + ' estudiante(s)'; });
  avisar_('Avance (docente · hito · semestre · carrera)', t.join('\n'));
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
    [H.REG, H.REG + ' (anterior)', H.REG + ' (respaldo v1)'].forEach(function (nom) {
      const reg = hoja_(nom), ids = {}; if (!reg) return;
      if (reg.getLastRow() >= 2) reg.getRange(2, 1, reg.getLastRow() - 1, 3).getValues().forEach(function (r) { if (/^prueba/i.test(String(r[2]).trim())) ids[r[1]] = 1; });
      Object.keys(ids).forEach(function (id) { const f = filasDeId_(reg, 2, id); n += f.length; borrarFilas_(reg, f); [H.DET, H.DET + ' (anterior)', H.DET + ' (respaldo v1)'].forEach(function (d) { const det = hoja_(d); if (det) borrarFilas_(det, filasDeId_(det, 1, id)); }); });
    });
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
  const cfg = config_(), r = leerRubrica_();
  return {ok: true, version: VERSION, abierta: cfg.abierta, mensaje: cfg.mensaje, titulo: cfg.titulo, maxEst: cfg.maxEst, clave: !!cfg.clave,
    semestres: cfg.semestres, carreras: cfg.carreras, niveles: r.niveles, hitos: r.dims.length ? cfg.hitos.map(function (id) { return {id: id, dims: r.dims, total: r.total}; }) : []};
}
function verificar_(p) {
  const sh = hoja_(H.REG), id = String(p.id || ''), rev = String(p.rev || '');
  if (!sh || !id) return {ok: true, existe: false};
  const existe = filasDeId_(sh, 2, id).some(function (n) { return String(sh.getRange(n, COL_REV).getValue()) === rev; });
  return {ok: true, existe: existe};
}
function guardar_(d) {
  const cfg = config_();
  if (!cfg.abierta) return {ok: false, codigo: 'cerrada', mensaje: cfg.mensaje};
  if (cfg.clave && String(d.clave || '').trim() !== cfg.clave) return {ok: false, codigo: 'clave'};
  const id = String(d.id || '').toUpperCase(), rev = String(d.rev || '');
  const docente = linea_(d.docente, 120), hito = linea_(d.hito, 120), semestre = linea_(d.semestre, 60), carrera = linea_(d.carrera, 60), grupo = linea_(d.grupo, 160);
  if (!/^RP-[A-Z0-9]{6,12}$/.test(id) || !/^\d{6,16}$/.test(rev)) return {ok: false, codigo: 'datos', mensaje: 'Identificador inválido.'};
  if (!docente || !hito) return {ok: false, codigo: 'datos', mensaje: 'Falta el nombre del docente o el hito.'};
  const est = Array.isArray(d.est) ? d.est : [];
  if (!est.length) return {ok: false, codigo: 'datos', mensaje: 'El grupo no tiene estudiantes.'};
  if (est.length > cfg.maxEst) return {ok: false, codigo: 'datos', mensaje: 'El grupo tiene ' + est.length + ' estudiantes; el máximo es ' + cfg.maxEst + '.'};
  const ahora = new Date(), filasReg = [], filasDet = [];
  est.forEach(function (s, i) {
    const nombre = linea_(s.nombre, 160), carr = linea_(s.carrera, 40); if (!nombre) return;
    const items = Array.isArray(s.items) ? s.items.slice(0, 200) : [], dims = [], porDim = {};
    items.forEach(function (it) {
      const dn = linea_(it.dim, 80), max = Math.max(0, Number(it.max) || 0), pts = Math.min(max, Math.max(0, Number(it.pts) || 0)), peso = Math.max(0, Number(it.peso) || 0);
      if (!porDim[dn]) { porDim[dn] = {nombre: dn, peso: peso, pts: 0, max: 0}; dims.push(porDim[dn]); }
      porDim[dn].pts += pts; porDim[dn].max += max;
      filasDet.push([id, rev, hito, docente, semestre, carrera, grupo, nombre, carr, dn, peso, it.modo === 'estudiante' ? 'Por estudiante' : 'Por grupo', linea_(it.crit, 300), linea_(it.nivel, 60), pts, max]);
    });
    let total = 0, escala = 0;
    const detalle = dims.map(function (x) { const n = x.max ? x.pts / x.max * x.peso : 0; total += n; escala += x.peso; return x.nombre + ' ' + MOTOR.red(n, 1) + '/' + x.peso; }).join(' · ');
    const sobre10 = escala ? Math.round(total / escala * 10 + 1e-9) : 0;     // 7,5 → 8
    filasReg.push([ahora, id, docente, hito, semestre, carrera, grupo, i + 1, nombre, carr, MOTOR.red(total, 2), sobre10, detalle, txt_(d.obs, 2000), rev, linea_(d.version, 20)]);
  });
  if (!filasReg.length) return {ok: false, codigo: 'datos', mensaje: 'El grupo no tiene estudiantes.'};
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const reg = hoja_(H.REG), det = hoja_(H.DET);
    if (!reg || !det || !cabeceraOk_(reg, CAB_REG)) throw new Error('La hoja no tiene el formato de esta versión: en la hoja, menú Rúbrica → Configuración inicial.');
    const viejas = filasDeId_(reg, 2, id);
    if (viejas.length) {      // edición: reemplaza el registro anterior del mismo grupo
      if (String(reg.getRange(viejas[0], COL_REV).getValue()) === rev) return {ok: true, id: id, rev: rev, repetido: true};
      borrarFilas_(reg, viejas); borrarFilas_(det, filasDeId_(det, 1, id));
    }
    reg.getRange(reg.getLastRow() + 1, 1, filasReg.length, CAB_REG.length).setValues(filasReg);
    if (filasDet.length) det.getRange(det.getLastRow() + 1, 1, filasDet.length, CAB_DET.length).setValues(filasDet);
    if (viejas.length) bitacora_('Registro editado', id + ' · ' + docente + ' · ' + hito);
  } finally { lock.releaseLock(); }
  return {ok: true, id: id, rev: rev, n: filasReg.length};
}
