# Taking D&D Notes

Manager de personajes y libro de notas para D&D 5e (2014). App web local (PWA): los datos viven en el navegador (IndexedDB) y se respaldan exportando JSON.

Diseño y plan por fases: [DESIGN.md](DESIGN.md).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests (Vitest)
npm run build      # typecheck + build de producción en dist/
```

## Estructura

```
src/
  db/          tipos del modelo, esquema Dexie, campañas, export/import
  features/    pantallas por sección (campaigns, workspace, ...)
  components/  UI compartida (Dialog, Toasts, Theme)
  lib/ store/  utilidades y estado de UI (Zustand)
  styles/      tokens de tema y estilos base
```
