# Rúbrica procesual — UNIFRANZ (registro docente)

Proyecto de Rafael Aramayo (creado 20-nov-2026). App para que los docentes califiquen grupos con una rúbrica
genérica y los registros queden en Google Sheets. Viene de `RUBRICA PROCESUAL.xlsx` (copia en `docs/`, no va al repo).
Desde la v3.0 (23-nov) hay **una sola rúbrica para todos los hitos** (la inicial es la del Hito 5 del Excel:
Conceptual 30 % y Procedimental 30 % por grupo · Actitudinal 40 % por estudiante, nota directa /40).
Castellano neutro (tú); Rafael no es programador: pasos exactos.

## Estructura
| Ruta | Qué es |
|---|---|
| `src.html` | Fuente de la app. Marcadores `__LOGO_*__`, `/*__MOTOR__*/`, `/*__RUB_DEMO__*/`. |
| `motor.js` | `desdeTabla` (lee la pestaña RUBRICA visual), `aFilas`, `parsear`, `nota`: compartido por app, script y pruebas. |
| `rubrica.json` | Rúbrica inicial (dims/criterios/niveles + hitos + carreras): arma la pestaña RUBRICA y es la del modo de prueba. |
| `apps-script/Code.src.gs` → `Code.gs` | Backend. `Code.gs` lo genera build.py: es el que se pega. |
| `build.py` | Genera `index.html` y `Code.gs`, valida sintaxis con node. |
| `tests/backend.test.js`, `tests/e2e_test.py` | Hoja simulada en Node (incluye migración desde v1); recorrido Playwright (modo prueba + servidor simulado). |

## Publicación
- Repo `UNIFRANZ-BO/rubrica-procesual` (público, Pages en main/raíz) → https://unifranz-bo.github.io/rubrica-procesual/ (enlace con `?v=N`, vigente **`?v=5`**).
- Hoja: «Rúbrica procesual – registros docentes» en la cuenta @unifranz, id `1EC-bYCxlb_eKmwRBI9fW5_DzT4jLAcKIFDA5R5RoX-E`. Implementación `AKfycbyWnkZy…xnfA` (incrustada en `URL_SCRIPT`).
- `?api=prueba` = modo de prueba sin escribir en la hoja. `?api=<url>` prueba otra URL. Triple toque en la versión o `?admin=1` = panel técnico.

## Diseño (v3.0)
- **Pestaña RUBRICA en formato visual** (igual que la app): fila 1 título, fila 2 instrucciones; desde la fila 4, columna A = etiquetas
  (Dimensión · Peso (%) · Se califica · Criterio · Descripción (opcional) · Puntaje máximo · y un renglón por nivel: Cumple, Cumple parcialmente, No cumple);
  desde la columna B, **una columna por criterio**. Dimensión/peso/«Se califica» van en la 1.ª columna del bloque (celdas combinadas; las vacías heredan).
  Nivel: número, rango (0-3, «menor a 4») o vacío; todos vacíos → nota directa. Peso vacío = suma de máximos. Las etiquetas se buscan por nombre
  (`MOTOR.desdeTabla`), así que se pueden insertar columnas/filas. Menú «Restablecer la rúbrica original» la rehace desde `rubrica.json`.
- CONFIG: Registro abierto · Título · **Hitos** («Hito 2; Hito 3; Hito 4; Hito 5», cada uno es una evaluación aparte con la misma rúbrica) · Máximo de estudiantes · Clave · Mensaje · **Semestres** · **Carreras** («ADM; ICO»).
- App: selector de hito · docente · semestre · **carrera del grupo** (ADM, ICO o ADM/ICO = todas unidas por «/») · grupo. Tabla de estudiantes con **carrera de cada uno** (solo ADM/ICO; si el grupo es de una carrera se llena sola). **Nota parcial editable** a mano (marca el nivel cuyo rango la contiene). Nota final /100 y **sobre 10** (redondeo, 7,5 → 8). Sin paralelo ni materia.
- REGISTROS (16 col.): Fecha · ID · Docente · Hito · Semestre · Carrera del grupo · Grupo · N.º · Estudiante · Carrera · Nota final (sobre 100) · **Nota sobre 10** · Detalle · Obs. · Revisión · Versión. DETALLE: formato largo. Corregir = mismo ID, nueva Revisión (reemplaza). PAPELERA para anulados.
- **Migración:** «Configuración inicial» (RP 2.0) pasa la hoja v1 al formato nuevo: RUBRICA vieja → «RUBRICA (anterior)», REGISTROS/DETALLE con datos → «(anterior)», quita «Paralelos», completa Hitos y agrega Carreras. `guardar_` rechaza si el encabezado de REGISTROS no coincide.
- Interfaz «épica» (pedido de Rafael 23-nov): aurora animada, rejilla en perspectiva, estrellas, borde cónico giratorio, fuente Exo 2, orbe de avance, barridos de luz. Respeta `prefers-reduced-motion`. Sin desborde a 390 px.
- Red como en las otras apps: GET JSONP (+fetch), POST text/plain → no-cors + verificar → JSONP; pendientes en `rubp1_regs` con reintento. Borrador en `rubp1_ev`.
- Sin fórmulas en la hoja (no hay problema del separador «;»). `@OnlyCurrentDoc`.

## Historial
- v1.0 (20-nov) flujo por pantallas · v2.0 hoja única «Enviar todo» · v2.3 un hito por evaluación, semestre, sin materia · **v3.0 (23-nov)** rúbrica única visual en Sheets, carreras, nota parcial manual, nota sobre 10, sin paralelo, interfaz épica (script RP 2.0, enlace `?v=5`).

## Pendientes
- 23-nov: RP 2.0 falló en la hoja real en `setFrozenColumns(1)` (el título combinado ocupa toda la fila) después de crear RUBRICA y migrar CONFIG, sin tocar REGISTROS/DETALLE → los envíos se rechazaban. RP 2.1: sin inmovilizar y **migración en su lugar** (copia «… (respaldo v1)» + filas pasadas al formato nuevo por nombre de columna, nota /10 calculada). Había 18 filas reales (José David Quiñones Coca, Hito 4, paralelo 102).
- [ ] Rafael: pegar RP 2.1 → Nueva versión → Rúbrica → Configuración inicial. Luego borrar «RUBRICA (anterior)» si quiere.

## Comandos
```bash
python build.py && node tests/backend.test.js && python tests/e2e_test.py
```
