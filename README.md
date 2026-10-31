# Eurovision Hub 2027

Agenda y actualidad del camino a Eurovisión 2027 en Burgas. El sitio es estático, accesible y adaptable a móvil; los enlaces de noticias y eventos llevan a sus fuentes.

## Contenido

- `index.html`: estructura y contenido de la página.
- `scss/main.scss`: estilos fuente.
- `styles.css`: hoja compilada que consume la página.
- `app.js`: búsqueda, filtros, cuenta atrás y renderizado de datos.
- `data/news.json`: noticias, resúmenes y enlaces de origen.
- `data/calendar.json`: preselecciones y galas oficiales.

Las fechas pendientes aparecen indicadas como tales. La lista de países, las fechas y el programa pueden cambiar; revisa siempre la fuente enlazada.

## Editar estilos

Requiere Node.js y npm. Instala Sass y compila los estilos:

```sh
npm install
npm run build:css
```

Edita `scss/main.scss`; no edites `styles.css` directamente. GitHub Pages recompila el SCSS al desplegar.

## Abrir en local

Como la página carga los JSON mediante `fetch`, sírvela por HTTP desde la raíz del proyecto:

```sh
python3 -m http.server 8000
```

Abre <http://localhost:8000>.

## Publicar

El workflow de `.github/workflows/pages.yml` compila Sass y publica el proyecto en GitHub Pages al recibir cambios en `main`. En el repositorio, configura **Settings → Pages → Source → GitHub Actions**.

## Fuentes

La UER/Eurovision.com y las emisoras nacionales (entre ellas RTVE y ERR). Las noticias se resumen y enlazan a la publicación original. Las banderas se sirven desde flagcdn.com.
