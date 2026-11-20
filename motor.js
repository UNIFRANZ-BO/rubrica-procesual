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
