"""Recorrido completo de la app v3.1 (rúbrica única, carreras, nota parcial a mano, medidor, asistencia) con Playwright.  Uso: python tests/e2e_test.py
1) modo de prueba (?api=prueba) a 390 px  2) servidor simulado (?api=https://servidor.test/exec) a 1366 px: JSONP, POST, corrección."""
import json, pathlib, subprocess, shutil, sys, urllib.parse
from playwright.sync_api import sync_playwright

raiz = pathlib.Path(__file__).resolve().parent.parent
sys.stdout.reconfigure(encoding='utf-8')
out = raiz / 'tests' / 'capturas'; out.mkdir(exist_ok=True)
URL = (raiz / 'index.html').as_uri()
node = shutil.which('node') or r'C:\Program Files\nodejs\node.exe'
rub = json.loads((raiz / 'rubrica.json').read_text(encoding='utf-8'))
h0 = json.loads(subprocess.run([node, '-e', (raiz / 'motor.js').read_text(encoding='utf-8') + f'\nconst r={json.dumps(rub, ensure_ascii=False)};console.log(JSON.stringify(MOTOR.parsear(r.niveles,MOTOR.aFilas(r),[]).hitos[0]))'],
                               capture_output=True, text=True, encoding='utf-8').stdout)
hitos = [{'id': i, 'dims': h0['dims'], 'total': h0['total']} for i in rub['hitos']]
H5 = 'Hito 5'
errores = []


def grupal(p):
    """Conceptual: Cumple / Cumple parcialmente / No cumple → 2 ; Procedimental: Cumple / Cumple parcialmente"""
    gc = p.locator('.gc')
    gc.nth(0).locator('.gl button').nth(0).click()
    gc.nth(1).locator('.gl button').nth(1).click()
    gc.nth(2).locator('.gl button').nth(2).click()
    p.locator('.gc').nth(2).locator('.fino button', has_text='2').click()
    p.locator('.gc').nth(3).locator('.gl button').nth(0).click()
    p.locator('.gc').nth(4).locator('.gl button').nth(1).click()


with sync_playwright() as pw:
    b = pw.chromium.launch()
    # ───── 1) modo de prueba, celular ─────
    p = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    p.on('pageerror', lambda e: errores.append(str(e)))
    p.goto(URL + '?api=prueba'); p.wait_for_selector('#sHoja.on')
    assert 'Modo de prueba' in p.inner_text('#avisos')
    assert p.text_content('#hTit') == H5 and p.input_value('#selHito') == H5 and p.locator('#selHito option').count() == 4
    assert p.locator('.gc').count() == 5 and p.locator('#ind input.nom').count() == 7 and p.locator('#ind select.car').count() == 7
    assert [o.inner_text() for o in p.locator('#iCarrera option').all()] == ['Elige…', 'ADM', 'ICO', 'ADM/ICO']
    assert [o.inner_text() for o in p.locator('#ind select.car').first.locator('option').all()] == ['—', 'ADM', 'ICO']
    assert p.locator('#iParalelo').count() == 0, 'sin paralelo'
    assert p.get_attribute('#ind input.nom', 'placeholder') == 'Apellidos y nombres' and p.locator('#ind .asis').first.inner_text() == 'Sí'
    assert p.locator('.gc .med.vacio').count() == 5, 'medidores en espera'
    med = lambda i: p.locator('.gc').nth(i).locator('.med')
    p.screenshot(path=str(out / '01_hoja_vacia_movil.png'), full_page=True)
    p.click('#bEnviar'); p.wait_for_timeout(300)
    assert p.locator('#modal.on').count() == 0, 'incompleta no abre el resumen'
    p.fill('#iDocente', 'Rafael Aramayo'); p.select_option('#iSemestre', '2'); p.select_option('#iCarrera', 'ADM/ICO')
    p.fill('#iGrupo', 'Grupo 3 · Café Andino')
    # pegar una lista en la primera fila → se reparte
    p.locator('#ind input.nom').first.focus()
    p.evaluate("""() => { const t = document.querySelector('#ind input.nom'); const dt = new DataTransfer(); dt.setData('text/plain', 'JUAN PÉREZ QUISPE\\n2. maría de la cruz\\nLucía Rojas\\n'); t.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true})); }""")
    noms = [p.locator('#ind input.nom').nth(i).input_value() for i in range(4)]
    assert noms == ['Juan Pérez Quispe', 'María de la Cruz', 'Lucía Rojas', ''], noms
    grupal(p)
    assert p.locator('[data-dp="0"]').inner_text() == '17 / 30'
    assert med(0).get_attribute('data-pc') == '1' and med(0).locator('.mt').inner_text().replace('\n', ' ') == '100% EXCELENTE', med(0).locator('.mt').inner_text()
    assert med(4).get_attribute('data-pc') == '0.5' and 'REGULAR' in med(4).locator('.mt').inner_text()
    assert med(2).get_attribute('data-pc') == '0.2' and 'BÁSICO' in med(2).locator('.mt').inner_text()
    # nota parcial escrita a mano
    np = p.locator('.gc input.np')
    np.nth(4).fill('15'); np.nth(4).press('Enter')
    assert p.locator('.gc').nth(4).locator('.gl button.on').count() == 0, '15 no es ningún nivel'
    assert med(4).get_attribute('data-pc') == '0.75' and 'BUENO' in med(4).locator('.mt').inner_text(), 'el medidor sigue a la nota parcial'
    np.nth(0).fill('5'); np.nth(0).press('Enter')
    assert p.locator('.gc').nth(0).locator('.gl button.on').inner_text().startswith('Cumple parcialmente'), 'marca el nivel que corresponde'
    assert p.locator('[data-dp="0"]').inner_text() == '12 / 30' and p.locator('[data-dp="1"]').inner_text() == '25 / 30'
    sc = p.locator('#ind input.sc')
    for i, v in enumerate([35, 28]): sc.nth(i).fill(str(v))
    p.click('#bEnviar'); p.wait_for_timeout(300)
    assert p.locator('#modal.on').count() == 0 and p.locator('#ind tr.falta').count() == 3, 'faltan carreras y la nota de Lucía'
    sc.nth(2).fill('40')
    for i, c in enumerate(['ADM', 'ICO', 'ICO']): p.locator('#ind select.car').nth(i).select_option(c)
    assert 'completa' in p.inner_text('#bSt') and p.locator('#bEnviar.listo').count() == 1
    assert p.locator('[data-nf] span.lista').nth(0).inner_text() == '72' and p.locator('[data-nf] small').nth(0).inner_text() == '7/10'
    assert p.locator('[data-nf] small').nth(2).inner_text() == '8/10', '77 → 8'
    p.wait_for_timeout(1300)
    p.screenshot(path=str(out / '02_hoja_llena_movil.png'), full_page=True)
    assert p.evaluate('document.documentElement.scrollWidth') <= 390, 'sin desborde en la hoja'
    p.click('#bEnviar'); p.wait_for_selector('#modal.on')
    t = p.inner_text('#modalC').replace(' ', ''); print(t)
    assert 'JuanPérezQuispeADM\t12\t25\t35\t72\t7' in t, t
    p.screenshot(path=str(out / '03_resumen_movil.png'))
    p.locator('#modalC button', has_text='Enviar todo').click(); p.wait_for_selector('#sFin.on')
    assert 'modo de prueba' in p.inner_text('#fTit')
    regs = p.evaluate("JSON.parse(localStorage.getItem('rubp1_regs'))")
    assert len(regs) == 1 and regs[0]['estado'] == 'pru' and regs[0]['carrera'] == 'ADM/ICO' and regs[0]['semestre'] == '2' and [s['c'] for s in regs[0]['est']] == ['ADM', 'ICO', 'ICO']
    p.click('#bOtro'); p.wait_for_selector('#sHoja.on')
    assert p.locator('.gl button.on').count() == 0 and p.locator('#ind input.nom').first.input_value() == '', 'hoja limpia'
    assert p.input_value('#iDocente') == 'Rafael Aramayo' and p.input_value('#iCarrera') == 'ADM/ICO', 'recuerda al docente y la carrera'
    p.select_option('#iCarrera', 'ICO')
    assert all(s.input_value() == 'ICO' for s in p.locator('#ind select.car').all()), 'grupo de una carrera → todos ICO'
    p.select_option('#iCarrera', 'ADM/ICO')
    assert all(s.input_value() == '' for s in p.locator('#ind select.car').all()), 'mixto → se elige en cada fila'
    p.click('#bPrev'); p.locator('#modalC .lst button').first.click()
    assert p.locator('#ind input.nom').nth(2).input_value() == 'Lucía Rojas' and p.locator('#ind select.car').nth(2).input_value() == 'ICO', 'repite integrantes con su carrera'
    nom4 = p.locator('#ind input.nom').nth(3); nom4.fill('maría de la cruz'); nom4.press('Tab')
    # cambiar de hito con notas marcadas pide confirmación y conserva los nombres
    p.locator('.gc').nth(0).locator('.gl button').nth(0).click()
    p.select_option('#selHito', 'Hito 2'); p.wait_for_selector('#modal.on')
    p.locator('#modalC button', has_text='Cambiar de hito').click()
    assert p.text_content('#hTit') == 'Hito 2' and p.locator('.gl button.on').count() == 0
    assert p.locator('#ind input.nom').first.input_value() == 'Juan Pérez Quispe' and p.locator('.gc').count() == 5, 'misma rúbrica en otro hito'
    # borrador: al recargar sigue ahí
    p.goto(URL + '?api=prueba'); p.wait_for_selector('#sHoja.on')
    assert p.text_content('#hTit') == 'Hito 2' and p.locator('#ind input.nom').first.input_value() == 'Juan Pérez Quispe'
    p.screenshot(path=str(out / '04_hoja_arriba_movil.png'))
    p.click('#bMisRegs'); p.wait_for_selector('#sRegs.on'); assert p.locator('.reg').count() == 1
    sw = p.evaluate('document.documentElement.scrollWidth'); assert sw <= 390, f'scroll horizontal {sw}'
    p.close()

    # ───── 2) con servidor simulado, escritorio ─────
    recibidos = []

    def servidor(route):
        u = urllib.parse.urlparse(route.request.url); q = dict(urllib.parse.parse_qsl(u.query))
        if route.request.method == 'POST':
            d = json.loads(route.request.post_data)['data']; recibidos.append(d)
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'id': d['id']}))
        a = q.get('action')
        if a == 'rubrica': r = {'ok': True, 'titulo': 'Rúbrica procesual 2026', 'abierta': True, 'maxEst': 5, 'clave': False, 'semestres': ['1', '2', '3'], 'carreras': ['ADM', 'ICO'], 'niveles': rub['niveles'], 'hitos': hitos_srv}
        elif a == 'verificar': r = {'ok': True, 'existe': False}
        else: r = {'ok': True}
        body = json.dumps(r, ensure_ascii=False)
        if 'callback' in q: return route.fulfill(status=200, content_type='application/javascript', body=f"{q['callback']}({body});")
        return route.fulfill(status=200, content_type='application/json', body=body)

    hitos_srv = hitos[2:]
    p = b.new_page(viewport={'width': 1366, 'height': 900})
    p.on('pageerror', lambda e: errores.append(str(e)))
    p.route('https://servidor.test/**', servidor)
    p.goto(URL + '?api=https://servidor.test/exec'); p.wait_for_selector('#sHoja.on')
    assert p.text_content('#hSub') == 'Rúbrica procesual 2026' and p.locator('#selHito option').count() == 2
    assert p.locator('#ind input.nom').count() == 5, 'máximo 5'
    assert p.locator('#iSemestre option').count() == 4
    p.fill('#iDocente', 'Docente Uno'); p.select_option('#iSemestre', '3'); p.select_option('#iCarrera', 'ICO')
    nom = p.locator('#ind input.nom')
    for i, n in enumerate(['Ana Uno', 'Beto Dos', 'Ceci Tres']): nom.nth(i).fill(n); nom.nth(i).press('Tab')
    grupal(p)
    for i, v in enumerate([30, 20]): p.locator('#ind input.sc').nth(i).fill(str(v))
    assert 'Faltan 1' in p.inner_text('#bSt')
    p.locator('#ind .asis').nth(2).click()
    assert p.locator('#ind .asis').nth(2).inner_text() == 'No' and p.locator('#ind input.sc').nth(2).is_disabled()
    assert 'completa' in p.inner_text('#bSt') and p.locator('[data-nf] span.aus').inner_text() == '0'
    p.wait_for_timeout(1300)
    p.screenshot(path=str(out / '05_hoja_escritorio.png'), full_page=True)
    p.screenshot(path=str(out / '06_hoja_escritorio_arriba.png'))
    p.click('#bEnviar'); p.locator('#modalC button', has_text='Enviar todo').click(); p.wait_for_selector('#sFin.on')
    assert p.inner_text('#fTit') == '¡Rúbrica enviada!', p.inner_text('#fTit')
    d = recibidos[0]
    assert len(recibidos) == 1 and [e['nombre'] for e in d['est']] == ['Ana Uno', 'Beto Dos', 'Ceci Tres'] and d['hito'] == H5 and d['semestre'] == '3' and d['carrera'] == 'ICO'
    assert 'paralelo' not in d and all(e['carrera'] == 'ICO' for e in d['est'])
    assert all(it['nivel'] == 'No asistió' and it['pts'] == 0 for it in d['est'][2]['items']) and d['obs'].startswith('No asistió: Ceci Tres.')
    assert d['est'][0]['items'][5] == {'dim': 'Actitudinal', 'peso': 40, 'modo': 'estudiante', 'crit': h0['dims'][2]['crit'][0]['nombre'], 'nivel': '', 'pts': 30, 'max': 40}
    assert d['est'][0]['items'][2]['nivel'] == 'No cumple' and d['est'][0]['items'][2]['pts'] == 2
    # corrección: mismo id, revisión nueva
    p.click('#bFinRegs'); p.locator('.reg').first.click(); p.locator('#modalC button', has_text='Corregir').click()
    p.wait_for_selector('#sHoja.on'); assert 'corrigiendo' in p.inner_text('#avisos').lower() and p.input_value('#iCarrera') == 'ICO'
    p.locator('#ind .asis').nth(2).click(); p.locator('#ind input.sc').nth(2).fill('12')
    p.click('#bEnviar'); p.locator('#modalC button', has_text='Enviar todo').click(); p.wait_for_selector('#sFin.on')
    assert len(recibidos) == 2 and recibidos[1]['id'] == d['id'] and recibidos[1]['rev'] != d['rev']
    assert recibidos[1]['est'][2]['items'][5]['pts'] == 12 and recibidos[1]['obs'] == ''
    regs = p.evaluate("JSON.parse(localStorage.getItem('rubp1_regs'))"); assert len(regs) == 1 and regs[0]['estado'] == 'env'
    # con un solo hito habilitado no aparece el selector
    hitos_srv = hitos[3:]
    p.evaluate("localStorage.removeItem('rubp1_ev')")
    p.goto(URL + '?api=https://servidor.test/exec'); p.wait_for_selector('#sHoja.on')
    assert p.locator('#tabs.oculto').count() == 1 and p.text_content('#hTit') == H5
    b.close()

assert not errores, errores
print('e2e OK · capturas en tests/capturas')
