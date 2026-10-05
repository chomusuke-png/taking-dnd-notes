# Taking D&D Notes

Manager de personajes y libro de notas para D&D 5e (2014). App web local (PWA): los datos viven en el navegador (IndexedDB) y se respaldan exportando JSON.

Diseño y plan por fases: [DESIGN.md](DESIGN.md).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests (Vitest)
npm run build      # typecheck + build de producción en dist/
npm run srd        # regenera src/srd/data/ desde 5e-bits/5e-database (requiere red)
npm run preview    # sirve dist/ para probar la PWA (service worker, offline)
npx pwa-assets-generator   # regenera los íconos desde public/icon.svg
```

## Publicar

`npm run build` deja una app estática en `dist/`. Se puede subir a cualquier hosting estático
(GitHub Pages, Netlify, Cloudflare Pages, un servidor propio…), en la raíz o en un subdirectorio:
usa rutas relativas y el router con `#`, así que no necesita configurar reescrituras. Para que
el navegador ofrezca instalarla y funcione offline debe servirse por **HTTPS** (o `localhost`).

Los datos de cada persona quedan en su navegador; para pasarlos a otro dispositivo se usa
"Respaldar todo" e "Importar" en la pantalla de inicio.

## Licencias de contenido

El compendio incluye material del System Reference Document 5.1 de Wizards of the Coast LLC,
con licencia [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode). Los datos
estructurados provienen de [5e-bits/5e-database](https://github.com/5e-bits/5e-database) (MIT).

## Estructura

```
src/
  db/          tipos del modelo, esquema Dexie, campañas, personajes, notas, export/import
  rules/       motor de reglas 5e 2014 (funciones puras con tests)
  srd/         compendio SRD: tipos, transformación y datos generados
  features/    pantallas por sección (campaigns, workspace, ...)
  components/  UI compartida (Dialog, Toasts, Theme)
  lib/ store/  utilidades y estado de UI (Zustand)
  styles/      tokens de tema y estilos base
```
