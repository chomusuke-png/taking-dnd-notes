# Taking D&D Notes: manager de personajes y notas para D&D 5e (2014)

Documento de diseño. Lo que aquí está decidido guía la programación; lo marcado como **[abierto]** está pendiente de decisión.

## 1. Decisiones base

| Tema | Decisión |
|---|---|
| Plataforma | PWA web local: funciona sin servidor, se instala en PC y celular y sigue funcionando offline |
| Datos | IndexedDB en el dispositivo + exportar/importar JSON (campaña completa o un personaje) |
| Usuarios | El DM gestiona PJ, PNJ, monstruos y encuentros. Los jugadores pueden usar la misma app con sus personajes y compartirlos mediante archivo JSON |
| Reglas | 5e 2014 con cálculos derivados + compendio SRD 5.1 |
| Notas | Diario de sesiones + wiki (PNJ, lugares, misiones, facciones, objetos) enlazada con `[[Nombre]]`, backlinks y búsqueda global |
| Idioma UI | Español |

## 2. Stack técnico

- **Vite + React + TypeScript**: tipado fuerte, que hace falta para un modelo de reglas con muchos campos derivados.
- **Dexie.js** sobre IndexedDB: consultas, índices y migraciones de esquema. `useLiveQuery` refresca la UI automáticamente.
- **TipTap** (ProseMirror) como editor de notas: texto enriquecido, extensión de *mention* para los `[[enlaces]]` y atajos Markdown.
- **Zustand** para el estado de la UI (panel abierto, campaña activa).
- **MiniSearch** para la búsqueda global en notas, personajes y SRD.
- **vite-plugin-pwa** para offline e instalación.
- **Vitest** para probar el motor de reglas, que es donde un error se nota en la mesa.
- Datos SRD: JSON de [5e-bits/5e-database](https://github.com/5e-bits/5e-database) (SRD 5.1, licencia CC-BY-4.0), empaquetados en la app y cargados de forma diferida.

**Decidido:** el compendio SRD queda en inglés y la UI en español. Más adelante se agregará una capa de traducción de nombres (diccionario propio, incremental).

## 3. Arquitectura

```
src/
  rules/        motor de reglas puro (sin React): modificadores, competencia, CA, espacios de conjuro...
  srd/          carga y tipos del compendio SRD
  db/           esquema Dexie, repositorios, export/import, migraciones
  features/
    campaigns/  selector y ajustes de campaña
    characters/ hoja de personaje
    notes/      diario + wiki + editor + backlinks
    encounters/ tracker de iniciativa (DM)
    compendium/ buscador SRD
    party/      vista de grupo para el DM
  components/   UI compartida (StatBox, Dialog, NumberStepper...)
```

Principio clave: **se guarda solo lo que el usuario decide** (puntuaciones, competencias, nivel, equipo, PG actuales). **Todo lo derivado se calcula** con funciones puras de `rules/` (modificadores, bonos, CD, CA, espacios de conjuro). Así nunca hay datos inconsistentes. Cada valor derivado admite un `override` manual para casos raros u homebrew.

## 4. Modelo de datos

```ts
Campaign   { id, name, description, createdAt, settings: { variantEncumbrance, ... } }

Character  {
  id, campaignId, kind: 'pc' | 'npc',
  name, player?, race, subrace?, background, alignment, portrait?,
  classes: [{ classId, subclassId?, level, hitDie }],   // multiclase
  abilities: { str, dex, con, int, wis, cha },          // puntuaciones finales
  proficiencies: {
    saves: Ability[],
    skills: Record<Skill, 0 | 0.5 | 1 | 2>,             // nada / Jack of all trades / competente / pericia
    armor, weapons, tools, languages: string[]
  },
  hp: { max, current, temp }, hitDiceUsed: Record<die, n>,
  deathSaves: { success, fail }, conditions: Condition[], exhaustion: 0..6,
  inspiration: boolean, speed, acOverride?,
  spellcasting?: { entries: [{ classId, ability, known: SpellRef[], prepared: SpellRef[] }],
                   slotsUsed: number[9], pactSlotsUsed },
  inventory: [{ itemRef | custom, qty, equipped, attuned, weight, notes }],
  currency: { cp, sp, ep, gp, pp },
  features: [{ name, source, description, uses?: { max, used, recharge: 'short' | 'long' | 'dawn' } }],
  attacks: [{ name, ability, proficient, damage, damageType, bonus }],  // también se derivan de las armas equipadas
  notesId?                                               // ficha wiki asociada
}

Note       {
  id, campaignId, type: 'session' | 'npc' | 'location' | 'quest' | 'faction' | 'item' | 'free',
  title, aliases: string[], content: TipTapJSON, tags: string[],
  session?: { number, date, xp?, loot? },
  quest?: { status: 'active' | 'done' | 'failed' },
  characterId?,                                          // un PNJ puede tener hoja de stats
  links: string[]                                        // ids enlazados (derivado al guardar → backlinks)
}

Encounter  { id, campaignId, name, round, turnIndex,
             combatants: [{ ref: { type: 'character' | 'srdMonster' | 'custom', id }, name,
                            initiative, hp, maxHp, ac, conditions, hidden }] }

CustomEntry { id, campaignId, kind: 'spell' | 'item' | 'monster' | 'feat', data }   // homebrew
```

## 5. Motor de reglas 5e 2014 (`rules/`)

| Cálculo | Fórmula |
|---|---|
| Modificador | `floor((score - 10) / 2)` |
| Bono de competencia | `2 + floor((nivelTotal - 1) / 4)` |
| Salvación / habilidad | `mod + prof × multiplicador` (½ Jack of all trades redondeado hacia abajo, ×2 pericia) |
| Percepción pasiva | `10 + Percepción` (+5 / −5 con ventaja / desventaja) |
| Iniciativa | `mod DES` (+ extras como Alert) |
| CD de conjuros / ataque | `8 + prof + mod` / `prof + mod` |
| CA | según armadura: ligera = base + DES, media = base + min(DES, 2), pesada = base; +2 escudo; Defensa sin armadura de bárbaro (10 + DES + CON) y de monje (10 + DES + SAB) |
| Espacios de conjuro | tabla de lanzador multiclase (completo ×1, medio ×½, tercio ×⅓); Pacto del brujo aparte |
| Capacidad de carga | `FUE × 15` (variante de carga opcional) |
| Descanso corto | gastar dados de golpe, recargar rasgos `short` y espacios de pacto |
| Descanso largo | PG al máximo, recuperar la mitad de los dados de golpe (mínimo 1), recargar todo, −1 nivel de agotamiento |
| Daño | primero se descuentan los PG temporales; a 0 PG se activan las salvaciones de muerte; muerte instantánea si el daño sobrante ≥ PG máx. |

Todo esto lleva tests unitarios.

## 6. Pantallas

1. **Inicio**: lista de campañas, crear, importar o exportar.
2. **Espacio de campaña**: barra lateral con *Grupo · Personajes · Diario · Wiki · Encuentros · Compendio* y búsqueda global con `Ctrl+K`.
3. **Hoja de personaje**: evoluciona las tres columnas del prototipo.
   - Izquierda: atributos, salvaciones, habilidades (todo derivado), pasivas y competencias.
   - Centro, en pestañas: *Acciones* (ataques y conjuros con tirada) · *Conjuros* · *Inventario* · *Rasgos* · *Notas*.
   - Derecha, estado vivo: PG con campo "daño / curar", PG temporales, salvaciones de muerte, condiciones, espacios de conjuro marcables, usos de rasgos, botones de descanso corto y largo, monedero.
   - En móvil, las tres columnas pasan a pestañas inferiores.
4. **Diario y wiki**: lista filtrable por tipo y etiqueta a la izquierda, editor al centro, y a la derecha metadatos más el panel "Mencionado en" (backlinks). Al escribir `[[` aparece un autocompletado de notas y personajes; si el nombre no existe, se crea la nota en ese momento.
5. **Encuentros (DM)**: lista de iniciativa ordenada, agregar PJ y monstruos SRD (con tirada automática de iniciativa y PG), daño y condiciones por combatiente, contador de rondas y turno actual, y bloque de stats del monstruo al costado.
6. **Compendio**: buscar conjuros, monstruos, objetos, condiciones y reglas; filtros por nivel, escuela y clase; botones "Agregar al personaje" y "Agregar al encuentro".
7. **Grupo (DM)**: tarjetas de cada PJ con PG, CA, percepción, investigación y perspicacia pasivas, y condiciones; sirve como pantalla del DM.

Estilo visual: se mantiene el tema oscuro del prototipo (rojo para PG, dorado para dinero y acentos) y se agrega un tema claro opcional.

## 7. Plan por fases

| Fase | Entrega | Resultado usable |
|---|---|---|
| **F0** | Proyecto Vite + TS, esquema Dexie, campañas, export/import JSON, layout base | Crear campañas y respaldarlas |
| **F1** | Motor de reglas + tests; hoja de personaje con creación manual | Llevar un PJ completo a la mesa |
| **F2** | Diario + wiki con TipTap, `[[enlaces]]`, backlinks y búsqueda | Tomar notas de sesión |
| **F3** | Compendio SRD; agregar conjuros y objetos a la hoja | Menos escritura manual |
| **F4** | Tracker de encuentros + vista de grupo (el estado de combate de la hoja se adelantó a F1) | Herramientas del DM |
| **F5** | PWA offline, ajustes para móvil, respaldo automático (recordatorio de exportar) | Uso diario en el celular |
| Futuro | Asistente de creación por raza y clase, subir de nivel, traducción del SRD, sync opcional | |

## 8. Decisiones tomadas

1. Compendio SRD en inglés por ahora; traducción de nombres como mejora futura.
2. Tiradas de dados integradas desde F1 (clic en una habilidad o ataque → tirada con historial).
3. Retratos e imágenes: se posponen (harían crecer los respaldos).

## 9. Estado

- **F0 ✅**: proyecto Vite + React + TS, esquema Dexie v1 con todas las tablas del modelo, CRUD de campañas con borrado en cascada, export/import JSON de campañas y personajes (ids regenerados al importar), layout de campaña con navegación lateral (inferior en móvil), tema oscuro/claro/sistema, tests de la capa de datos.
- **F1 ✅**: motor de reglas en `src/rules/` con tests (modificadores, competencia, Jack of all trades, CA con armaduras y Defensa sin armadura, CD/ataque de conjuros por clase, espacios de conjuro de una clase y multiclase, Magia de pacto, PG promedio, carga, daño con PG temporales y muerte instantánea, salvaciones de muerte, descansos corto y largo, dados). Hoja de personaje con modo juego/edición, tiradas integradas con ventaja/desventaja e historial, inventario, rasgos con usos, ataques, condiciones y agotamiento, monedero. Lista de PJ/PNJ con import/export de personajes. Esquema Dexie v2 con migración (`normalizeCharacter`).
  - Se adelantó desde F4 el estado de combate de la hoja (daño/curación, salvaciones de muerte, descansos, espacios de conjuro).
  - Pendiente para F3: lista de conjuros conocidos/preparados (necesita el compendio SRD).
- **F2 ✅**: Diario (sesiones numeradas con fecha) y Wiki (PNJ, lugares, misiones con estado, facciones, objetos, general) con editor TipTap v3 y autoguardado. Enlaces `[[...]]` a notas y personajes con autocompletado, creación de notas desde el enlace y navegación con clic. Backlinks ("Mencionado en") en cada nota y en la pestaña Notas de la hoja de personaje. Renombrar una nota o un personaje actualiza sus menciones en toda la campaña (índice `*links`). Etiquetas, alias, ficha PNJ ↔ hoja de estadísticas. Búsqueda global `Ctrl+K` con MiniSearch (sin tildes, prefijos, tolerancia a errores).
