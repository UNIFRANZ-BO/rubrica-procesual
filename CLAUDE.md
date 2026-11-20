# Rúbrica procesual — UNIFRANZ (registro docente)

Proyecto de Rafael Aramayo (creado 20-nov-2026). App para que los docentes califiquen grupos con una rúbrica
genérica y los registros queden en Google Sheets. Viene de `RUBRICA PROCESUAL.xlsx` (copia en `docs/`, no va al repo):
Hitos 2, 3 y 5 (+ Hito 4 agregado el 20-nov a pedido de Rafael, copia del Hito 3; sin semana) · Conceptual 30 % y Procedimental 30 % (por grupo) · Actitudinal 40 % (por estudiante, puntaje directo /40).
Castellano neutro (tú); Rafael no es programador: pasos exactos.

## Estructura
| Ruta | Qué es |
|---|---|
| `src.html` | Fuente de la app. Marcadores `__LOGO_*__`, `/*__MOTOR__*/`, `/*__RUB_DEMO__*/`. |
| `motor.js` | Lectura de la rúbrica (`MOTOR.parsear`) y cálculo de notas, compartido por app y script. |
| `rubrica.json` | Rúbrica inicial: prellena la pestaña RUBRICA y es la del modo de prueba. |
| `apps-script/Code.src.gs` → `Code.gs` | Backend. `Code.gs` lo genera build.py: es el que se pega. |
| `build.py` | Genera `index.html` y `Code.gs`, valida sintaxis con node. |
| `tests/backend.test.js`, `tests/e2e_test.py` | Hoja simulada en Node; recorrido Playwright (modo prueba + servidor simulado). |

## Publicación
- Repo `UNIFRANZ-BO/rubrica-procesual` (público, Pages en main/raíz) → https://unifranz-bo.github.io/rubrica-procesual/ (enlace con `?v=N`).
- Hoja: «Rúbrica procesual – registros docentes» en la cuenta @unifranz, id `1EC-bYCxlb_eKmwRBI9fW5_DzT4jLAcKIFDA5R5RoX-E`.
- `URL_SCRIPT` en `src.html`: vacía = modo de prueba (todo queda en el dispositivo). `?api=<url>` prueba otra URL. Triple toque en «v1.0» o `?admin=1` = panel técnico.

## Diseño
- **La rúbrica vive en la pestaña RUBRICA** (Hito | Dimensión | Peso (%) | Se califica | Criterio | Descripción | Puntaje máximo | niveles…). Los nombres de nivel salen de la fila 1 desde la columna H (se pueden renombrar o agregar columnas). Cada nivel: número (10), rango (0-3, «menor a 4») o vacío. Todos vacíos → el docente pone puntaje directo 0..máximo. Peso vacío = suma de máximos. Nota de dimensión = puntos/máximo × peso. La app la lee al abrir: cambiar la hoja no requiere tocar código.
- CONFIG: Registro abierto · Título · Hitos habilitados («;») · Máximo de estudiantes por grupo (7) · Clave para docentes (vacío = sin clave) · Mensaje de cerrado.
- REGISTROS: una fila por estudiante (Nota final, detalle por dimensión). DETALLE: formato largo (una fila por criterio) para tablas dinámicas. Un registro = un grupo con ID `RP-…`; al corregir se reemplaza (mismo ID, nueva Revisión). PAPELERA para anulados.
- Menú «Rúbrica»: Ver avance · Revisar la rúbrica · Abrir/Cerrar · Anular por ID · Borrar registros de prueba (docente que empieza con «PRUEBA») · Configuración inicial.
- Red como en las otras apps: GET JSONP (+fetch), POST text/plain → no-cors + verificar → JSONP; pendientes en `rubp1_regs` con reintento.
- Docentes: nombres pegados en lista (uno por línea) se separan solos, se pasan a nombre propio, sin duplicados; autocompleta con nombres ya usados y ofrece repetir integrantes de grupos anteriores del mismo paralelo.
- Sin fórmulas en la hoja (no hay problema del separador «;»). `@OnlyCurrentDoc`.

## Estado (20-nov-2026)
- [x] v1.0 publicada en modo de prueba; pruebas backend y e2e OK.
- [x] Script pegado e implementado (20-nov): implementación `AKfycbyWnkZy…xnfA`, incrustada en `URL_SCRIPT`. (entonces `?v=2`). Prueba real OK (RP-F6XVDT7Z, docente «PRUEBA Claude»).
- [x] v2.0 (20-nov, a pedido de Rafael): **hoja única** «como la rúbrica impresa»: arriba pestañas de hito + docente/materia/paralelo/grupo; dimensiones por grupo en columnas (criterios con niveles para tocar, nota parcial); abajo tabla de estudiantes (nombre + nota por estudiante + nota final, pegar lista reparte filas, Enter avanza); botón único «Enviar todo» con resumen. Diseño oscuro con degradado por dimensión (Rafael: no hace falta copiar los colores del Excel). Borrador automático en `rubp1_ev`. Enlace vigente `?v=3`. Prueba real OK (RP-K20K35F9).
- [x] v2.3 (20-nov): selector «Hito a evaluar» (cada hito es una evaluación aparte; con un solo hito habilitado en CONFIG no aparece); hitos sin semana («Hito 2»…«Hito 5»); sin Materia; **Semestre** (lista de CONFIG «Semestres», por defecto 1–10) y **Paralelo** (lista de CONFIG «Paralelos»; vacía = se escribe). Columna D de REGISTROS/PAPELERA y E de DETALLE renombradas «Semestre» (la app manda `semestre` y también `materia` = semestre para que el script 1.0 siga funcionando). Script RP 1.1 (devuelve semestres/paralelos). Enlace `?v=4`.
- [x] Script RP 1.1 implementado como Nueva versión (20-nov), misma URL. Paralelo queda abierto (CONFIG Paralelos vacío, decisión de Rafael).
- [ ] Rafael: menú Rúbrica → Borrar registros de prueba antes de difundir (hay 2 grupos «PRUEBA Claude…»).
- Para probar sin escribir en la hoja: `?api=prueba`.

## Comandos
```bash
python build.py && node tests/backend.test.js && python tests/e2e_test.py
```
