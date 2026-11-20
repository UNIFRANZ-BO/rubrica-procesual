"""Recorrido completo de la app v2 (hoja única) con Playwright.  Uso: python tests/e2e_test.py
1) modo de prueba (?api=prueba) a 390 px  2) servidor simulado (?api=https://servidor.test/exec) a 1366 px: JSONP, POST, corrección."""
import json, pathlib, subprocess, shutil, sys, urllib.parse
from playwright.sync_api import sync_playwright

raiz = pathlib.Path(__file__).resolve().parent.parent
sys.stdout.reconfigure(encoding='utf-8')
out = raiz / 'tests' / 'capturas'; out.mkdir(exist_ok=True)
URL = (raiz / 'index.html').as_uri()
node = shutil.which('node') or r'C:\Program Files\nodejs\node.exe'
rub = json.loads((raiz / 'rubrica.json').read_text(encoding='utf-8'))
hitos = json.loads(subprocess.run([node, '-e', (raiz / 'motor.js').read_text(encoding='utf-8') + f'\nconsole.log(JSON.stringify(MOTOR.parsear({json.dumps(rub["niveles"])},{json.dumps(rub["filas"], ensure_ascii=False)},[]).hitos))'],
                                  capture_output=True, text=True, encoding='utf-8').stdout)
H5 = 'Hito 5 · Semana 20'
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
    assert p.inner_text('#hTit') == H5 and p.locator('#tabs button.on').inner_text() == H5
    assert p.locator('#tabs button').count() == 4
    assert p.locator('.gc').count() == 5 and p.locator('#ind input.nom').count() == 7
    p.screenshot(path=str(out / '01_hoja_vacia_movil.png'), full_page=True)
    p.click('#bEnviar'); p.wait_for_timeout(300)
    assert p.locator('#modal.on').count() == 0, 'incompleta no abre el resumen'
    p.fill('#iDocente', 'Rafael Aramayo'); p.fill('#iMateria', 'Administración Gerencial'); p.fill('#iParalelo', 'adm-s2-p107'); p.press('#iParalelo', 'Tab')
    p.fill('#iGrupo', 'Grupo 3 · Café Andino')
    # pegar una lista en la primera fila → se reparte
    p.locator('#ind input.nom').first.focus()
    p.evaluate("""() => { const t = document.querySelector('#ind input.nom'); const dt = new DataTransfer(); dt.setData('text/plain', 'JUAN PÉREZ QUISPE\\n2. maría de la cruz\\nLucía Rojas\\n'); t.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true})); }""")
    noms = [p.locator('#ind input.nom').nth(i).input_value() for i in range(4)]
    assert noms == ['Juan Pérez Quispe', 'María de la Cruz', 'Lucía Rojas', ''], noms
    grupal(p)
    assert p.locator('[data-dp="0"]').inner_text() == '17 / 30'
    sc = p.locator('#ind input.sc')
    for i, v in enumerate([35, 28]): sc.nth(i).fill(str(v))
    p.click('#bEnviar'); p.wait_for_timeout(300)
    assert p.locator('#modal.on').count() == 0 and p.locator('#ind tr.falta').count() == 1, 'falta la nota de Lucía'
    sc.nth(2).fill('40')
    assert 'completa' in p.inner_text('#bSt')
    assert p.locator('[data-nf] span.lista').nth(0).inner_text() == '72'
    p.screenshot(path=str(out / '02_hoja_llena_movil.png'), full_page=True)
    p.click('#bEnviar'); p.wait_for_selector('#modal.on')
    t = p.inner_text('#modalC').replace(' ', ''); print(t)
    assert 'JuanPérezQuispe\t17\t20\t35\t72' in t, t
    p.screenshot(path=str(out / '03_resumen_movil.png'))
    p.locator('#modalC button', has_text='Enviar todo').click(); p.wait_for_selector('#sFin.on')
    assert 'modo de prueba' in p.inner_text('#fTit')
    regs = p.evaluate("JSON.parse(localStorage.getItem('rubp1_regs'))")
    assert len(regs) == 1 and regs[0]['estado'] == 'pru' and regs[0]['paralelo'] == 'ADM-S2-P107' and len(regs[0]['est']) == 3
    p.click('#bOtro'); p.wait_for_selector('#sHoja.on')
    assert p.locator('.gl button.on').count() == 0 and p.locator('#ind input.nom').first.input_value() == '', 'hoja limpia'
    assert p.input_value('#iDocente') == 'Rafael Aramayo', 'recuerda al docente'
    p.click('#bPrev'); p.locator('#modalC .lst button').first.click()
    assert p.locator('#ind input.nom').nth(2).input_value() == 'Lucía Rojas', 'repite integrantes'
    # cambiar de hito con notas marcadas pide confirmación y conserva los nombres
    p.locator('.gc').nth(0).locator('.gl button').nth(0).click()
    p.locator('#tabs button', has_text='Hito 2').click(); p.wait_for_selector('#modal.on')
    p.locator('#modalC button', has_text='Cambiar de hito').click()
    assert p.inner_text('#hTit') == 'Hito 2 · Semana 6' and p.locator('.gl button.on').count() == 0
    assert p.locator('#ind input.nom').first.input_value() == 'Juan Pérez Quispe'
    assert '0–3' not in p.inner_text('#gg') and '15' in p.inner_text('#gg')
    # borrador: al recargar sigue ahí
    p.goto(URL + '?api=prueba'); p.wait_for_selector('#sHoja.on')
    assert p.inner_text('#hTit') == 'Hito 2 · Semana 6' and p.locator('#ind input.nom').first.input_value() == 'Juan Pérez Quispe'
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
        if a == 'rubrica': r = {'ok': True, 'titulo': 'Rúbrica procesual 2026', 'abierta': True, 'maxEst': 5, 'clave': False, 'niveles': rub['niveles'], 'hitos': hitos[2:]}
        elif a == 'verificar': r = {'ok': True, 'existe': False}
        else: r = {'ok': True}
        body = json.dumps(r, ensure_ascii=False)
        if 'callback' in q: return route.fulfill(status=200, content_type='application/javascript', body=f"{q['callback']}({body});")
        return route.fulfill(status=200, content_type='application/json', body=body)

    p = b.new_page(viewport={'width': 1366, 'height': 900})
    p.on('pageerror', lambda e: errores.append(str(e)))
    p.route('https://servidor.test/**', servidor)
    p.goto(URL + '?api=https://servidor.test/exec'); p.wait_for_selector('#sHoja.on')
    assert p.text_content('#hSub') == 'Rúbrica procesual 2026' and p.locator('#tabs button').count() == 2
    assert p.locator('#ind input.nom').count() == 5, 'máximo 5'
    p.fill('#iDocente', 'Docente Uno'); p.fill('#iMateria', 'SIG'); p.fill('#iParalelo', 'P100')
    nom = p.locator('#ind input.nom')
    for i, n in enumerate(['Ana Uno', 'Beto Dos', 'Ceci Tres']): nom.nth(i).fill(n); nom.nth(i).press('Tab')
    grupal(p)
    for i, v in enumerate([30, 20, 10]): p.locator('#ind input.sc').nth(i).fill(str(v))
    p.screenshot(path=str(out / '04_hoja_escritorio.png'), full_page=True)
    p.click('#bEnviar'); p.locator('#modalC button', has_text='Enviar todo').click(); p.wait_for_selector('#sFin.on')
    assert p.inner_text('#fTit') == '¡Rúbrica enviada!', p.inner_text('#fTit')
    d = recibidos[0]
    assert len(recibidos) == 1 and [e['nombre'] for e in d['est']] == ['Ana Uno', 'Beto Dos', 'Ceci Tres'] and d['hito'] == H5
    assert d['est'][0]['items'][5] == {'dim': 'Actitudinal', 'peso': 40, 'modo': 'estudiante', 'crit': hitos[3]['dims'][2]['crit'][0]['nombre'], 'nivel': '', 'pts': 30, 'max': 40}
    assert d['est'][0]['items'][2]['nivel'] == 'No cumple' and d['est'][0]['items'][2]['pts'] == 2
    # corrección: mismo id, revisión nueva
    p.click('#bFinRegs'); p.locator('.reg').first.click(); p.locator('#modalC button', has_text='Corregir').click()
    p.wait_for_selector('#sHoja.on'); assert 'corrigiendo' in p.inner_text('#avisos').lower()
    p.locator('#ind input.sc').nth(2).fill('12')
    p.click('#bEnviar'); p.locator('#modalC button', has_text='Enviar todo').click(); p.wait_for_selector('#sFin.on')
    assert len(recibidos) == 2 and recibidos[1]['id'] == d['id'] and recibidos[1]['rev'] != d['rev']
    assert recibidos[1]['est'][2]['items'][5]['pts'] == 12
    regs = p.evaluate("JSON.parse(localStorage.getItem('rubp1_regs'))"); assert len(regs) == 1 and regs[0]['estado'] == 'env'
    b.close()

assert not errores, errores
print('e2e OK · capturas en tests/capturas')
