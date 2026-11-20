"""Recorrido completo de la app (Playwright).  Uso: python tests/e2e_test.py
1) modo de prueba (sin servidor) a 390 px  2) con un servidor simulado (?api=) a 1366 px: GET por JSONP, POST, corrección."""
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
errores = []


def calificar(p, actitudinal):
    p.wait_for_selector('#sEval.on')
    # Conceptual: Cumple / Cumple parcialmente / No cumple → 2 ; Procedimental: Cumple / Cumple parcialmente
    dims = p.locator('.dim')
    c = dims.nth(0).locator('.lv')
    c.nth(0).locator('button').nth(0).click()
    c.nth(1).locator('button').nth(1).click()
    c.nth(2).locator('button').nth(2).click()
    dims.nth(0).locator('.fino button', has_text='2').click()
    pr = dims.nth(1).locator('.lv')
    pr.nth(0).locator('button').nth(0).click()
    pr.nth(1).locator('button').nth(1).click()
    for i, v in enumerate(actitudinal):
        dims.nth(2).locator('.directo input.inp').nth(i).fill(str(v))


with sync_playwright() as pw:
    b = pw.chromium.launch()
    # ───── 1) modo de prueba, celular ─────
    p = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    p.on('pageerror', lambda e: errores.append(str(e)))
    p.goto(URL + '?api=prueba'); p.wait_for_selector('#sInicio.on')
    assert 'Modo de prueba' in p.inner_text('#avisoInicio')
    assert p.locator('#chHitos .chip.on').inner_text() == 'Hito 5 · Semana 20'
    p.screenshot(path=str(out / '01_inicio_movil.png'), full_page=True)
    p.click('#bNuevo'); assert p.locator('#sInicio.on').count() == 1, 'sin nombre no avanza'
    p.fill('#iDocente', 'Rafael Aramayo'); p.fill('#iMateria', 'Administración Gerencial'); p.fill('#iParalelo', 'adm-s2-p107')
    p.click('#bNuevo'); p.wait_for_selector('#sGrupo.on')
    p.fill('#iGrupo', 'Grupo 3 · Café Andino')
    p.fill('#iEst', 'JUAN PÉREZ QUISPE\n2. maría de la cruz\nLucía Rojas'); p.press('#iEst', 'Enter')
    assert p.locator('#lEst li').count() == 3
    assert p.locator('#lEst li span').nth(0).inner_text() == 'Juan Pérez Quispe'
    assert p.locator('#lEst li span').nth(1).inner_text() == 'María de la Cruz'
    p.fill('#iEst', 'lucia rojas'); p.press('#iEst', 'Enter')
    assert p.locator('#lEst li').count() == 3, 'no duplica'
    p.fill('#iEst', '')
    p.screenshot(path=str(out / '02_grupo_movil.png'), full_page=True)
    p.click('#bGrupoSig')
    p.wait_for_selector('#sEval.on')
    p.click('#bRevisar'); assert p.locator('#sEval.on').count() == 1, 'incompleto no avanza'
    calificar(p, [35, 28, 40])
    assert 'Todo calificado' in p.inner_text('#bSt')
    assert p.locator('[data-dp="0"]').inner_text() == '17 / 30'
    p.screenshot(path=str(out / '03_eval_movil.png'), full_page=True)
    p.fill('#iObs', 'Buen análisis; mejorar la redacción.')
    p.click('#bRevisar'); p.wait_for_selector('#sRev.on')
    t = p.inner_text('#rTabla'); print(t)
    assert '17\t20\t35\t72' in t.replace(' ', ''), t      # conceptual 10+5+2 = 17 ; procedimental 10+10 = 20 ; actitudinal 35
    p.screenshot(path=str(out / '04_revision_movil.png'), full_page=True)
    p.click('#bGuardar'); p.wait_for_selector('#sFin.on')
    assert 'modo de prueba' in p.inner_text('#fTit')
    regs = p.evaluate("JSON.parse(localStorage.getItem('rubp1_regs'))")
    assert len(regs) == 1 and regs[0]['estado'] == 'pru' and regs[0]['paralelo'] == 'ADM-S2-P107'
    p.click('#bOtro'); p.wait_for_selector('#sGrupo.on')
    assert p.locator('#prevChips .chip').count() == 1, 'ofrece repetir integrantes'
    p.locator('#prevChips .chip').click(); assert p.locator('#lEst li').count() == 3
    p.fill('#iEst', 'Ju'); p.wait_for_timeout(100)
    p.goto(URL + '?api=prueba'); p.wait_for_selector('#modal.on'); assert 'sin terminar' in p.inner_text('#modalC')
    p.locator('#modalC button', has_text='Descartar').click()
    p.click('#bMisRegs'); p.wait_for_selector('#sRegs.on'); assert p.locator('.reg').count() == 1
    p.screenshot(path=str(out / '05_registros_movil.png'), full_page=True)
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
        if a == 'rubrica': r = {'ok': True, 'titulo': 'Rúbrica procesual 2026', 'abierta': True, 'maxEst': 5, 'clave': False, 'niveles': rub['niveles'], 'hitos': hitos[1:]}
        elif a == 'verificar': r = {'ok': True, 'existe': False}
        else: r = {'ok': True}
        body = json.dumps(r, ensure_ascii=False)
        if 'callback' in q: return route.fulfill(status=200, content_type='application/javascript', body=f"{q['callback']}({body});")
        return route.fulfill(status=200, content_type='application/json', body=body)

    p = b.new_page(viewport={'width': 1366, 'height': 900})
    p.on('pageerror', lambda e: errores.append(str(e)))
    p.route('https://servidor.test/**', servidor)
    p.goto(URL + '?api=https://servidor.test/exec'); p.wait_for_selector('#sInicio.on')
    assert p.inner_text('#hTitulo') == 'Rúbrica procesual 2026'
    assert p.locator('#chHitos .chip').count() == 2
    p.fill('#iDocente', 'Docente Uno'); p.fill('#iMateria', 'SIG'); p.fill('#iParalelo', 'P100')
    p.click('#bNuevo'); p.wait_for_selector('#sGrupo.on')
    assert '(máximo 5)' in p.inner_text('#gMax')
    p.fill('#iEst', 'A Uno\nB Dos\nC Tres\nD Cuatro\nE Cinco\nF Seis'); p.press('#iEst', 'Enter')
    assert p.locator('#lEst li').count() == 5, 'respeta el máximo'
    p.locator('#lEst li').nth(4).locator('[data-a=del]').click(); p.locator('#lEst li').nth(3).locator('[data-a=del]').click()
    p.click('#bGrupoSig'); calificar(p, [30, 20, 10])
    p.screenshot(path=str(out / '06_eval_escritorio.png'), full_page=True)
    p.click('#bRevisar'); p.click('#bGuardar'); p.wait_for_selector('#sFin.on')
    assert p.inner_text('#fTit') == '¡Registro guardado!', p.inner_text('#fTit')
    assert len(recibidos) == 1 and len(recibidos[0]['est']) == 3 and recibidos[0]['hito'] == 'Hito 5 · Semana 20'
    assert recibidos[0]['est'][0]['items'][5] == {'dim': 'Actitudinal', 'peso': 40, 'modo': 'estudiante', 'crit': hitos[2]['dims'][2]['crit'][0]['nombre'], 'nivel': '', 'pts': 30, 'max': 40}
    # corrección: mismo id, revisión nueva
    p.click('#bFinRegs'); p.locator('.reg').first.click(); p.locator('#modalC button', has_text='Corregir').click()
    p.wait_for_selector('#sEval.on'); p.locator('.dim').nth(2).locator('.directo input.inp').nth(2).fill('12')
    p.click('#bRevisar'); assert 'reemplaza' in p.inner_text('#rAviso'); p.click('#bGuardar'); p.wait_for_selector('#sFin.on')
    assert len(recibidos) == 2 and recibidos[1]['id'] == recibidos[0]['id'] and recibidos[1]['rev'] != recibidos[0]['rev']
    assert recibidos[1]['est'][2]['items'][5]['pts'] == 12
    regs = p.evaluate("JSON.parse(localStorage.getItem('rubp1_regs'))"); assert len(regs) == 1 and regs[0]['estado'] == 'env'
    b.close()

assert not errores, errores
print('e2e OK · capturas en tests/capturas')
