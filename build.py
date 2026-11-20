"""Genera los dos archivos que se publican/pegan:
  · index.html               → GitHub Pages (logos en base64, motor y rúbrica de prueba incrustados)
  · apps-script/Code.gs      → se pega en Apps Script (motor y rúbrica inicial incrustados)
y valida la sintaxis JS de ambos con node --check.
Uso:  python build.py
"""
import base64, json, pathlib, re, shutil, subprocess, sys

raiz = pathlib.Path(__file__).parent
sys.stdout.reconfigure(encoding='utf-8')
node = shutil.which('node') or r'C:\Program Files\nodejs\node.exe'
js = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def check(codigo, nombre):
    tmp = raiz / 'tests' / ('.check_' + nombre + '.js'); tmp.write_text(codigo, encoding='utf-8')
    r = subprocess.run([node, '--check', str(tmp)], capture_output=True, text=True); tmp.unlink()
    if r.returncode: print(nombre, r.stderr); sys.exit(1)


rub = json.loads((raiz / 'rubrica.json').read_text(encoding='utf-8'))
motor = (raiz / 'motor.js').read_text(encoding='utf-8')

# Rúbrica de prueba = la inicial, leída con el mismo motor que usa el script
demo = subprocess.run([node, '-e', motor + '\nconst r=' + js(rub) + ';const p=MOTOR.parsear(r.niveles,r.filas,[]);'
                       'if(p.avisos.length){console.error(p.avisos.join("\\n"));process.exit(1)}'
                       'console.log(JSON.stringify({ok:true,titulo:"Rúbrica de evaluación procesual",abierta:true,maxEst:7,clave:false,niveles:r.niveles,hitos:p.hitos}))'],
                      capture_output=True, text=True, encoding='utf-8')
if demo.returncode: print('rubrica.json:', demo.stderr); sys.exit(1)
rub_demo = demo.stdout.strip()

b64 = lambda f: 'data:image/png;base64,' + base64.b64encode((raiz / 'assets' / f).read_bytes()).decode()
s = (raiz / 'src.html').read_text(encoding='utf-8')
for a, b in [('/*__MOTOR__*/', motor), ('/*__RUB_DEMO__*/null', rub_demo), ('__LOGO_FULL__', b64('logo_full.png')), ('__LOGO_WORD__', b64('logo_word.png'))]:
    assert a in s, a
    s = s.replace(a, b)
(raiz / 'index.html').write_text(s, encoding='utf-8')
check(re.search(r'<script>(.*)</script>', s, re.S).group(1), 'index')
print(f'index.html generado ({len(s) // 1024} KB) · sintaxis JS OK')

g = (raiz / 'apps-script' / 'Code.src.gs').read_text(encoding='utf-8')
for a, b in [('/*__MOTOR__*/', motor), ('/*__SEED__*/', 'const SEED = ' + js({'niveles': rub['niveles'], 'filas': rub['filas']}) + ';')]:
    assert a in g, a
    g = g.replace(a, b)
g = g.replace('ESTE ARCHIVO SE GENERA con build.py a partir de Code.src.gs', 'Generado con build.py a partir de Code.src.gs')
(raiz / 'apps-script' / 'Code.gs').write_text(g, encoding='utf-8')
check(g, 'code')
print(f'apps-script/Code.gs generado ({len(g) // 1024} KB) · sintaxis OK')
