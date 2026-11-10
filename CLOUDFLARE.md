# Publicación de prueba en Workers Static Assets

Requiere Node.js 22 o posterior y npm. Wrangler está fijado en `package-lock.json`.

```sh
npm ci
npm run build:cloudflare
npm run test:cloudflare
npm run check:cloudflare
npm run preview:cloudflare
```

`test:cloudflare` reconstruye `dist` y prueba los archivos, rutas limpias, callbacks,
widgets y respuestas 404 con el runtime local de Wrangler. No inicia sesión en
Cloudflare ni ejecuta scripts del navegador o escrituras en Firebase.
`check:cloudflare` prepara un despliegue con `--dry-run`, sin publicarlo.
`preview:cloudflare` muestra la dirección local para revisar el sitio en el navegador.
Wrangler ejecuta el build automáticamente antes de una vista previa o un despliegue.

## Qué se publica

`scripts/build-cloudflare.mjs` contiene una lista explícita de archivos públicos.
Cada archivo conserva su ruta y sus bytes. Las incorporaciones futuras requieren
añadir la ruta a esa lista. El build valida los archivos antes de reemplazar
únicamente `dist`; rechaza enlaces simbólicos, assets mayores de 25 MiB y posibles
credenciales privadas. `dist` y el estado local `.wrangler` están ignorados por Git.

Se incluyen los HTML, CSS, JavaScript, imágenes, videos y catálogos web existentes,
con la excepción autorizada de `admin.html` y `admin/index.html`: contienen una
contraseña fija y se excluyen únicamente del paquete de prueba. Sus originales
permanecen intactos. Las rutas de esas dos pantallas devuelven 404 en esta prueba.
`firebase-config.js` y `wolftrack-firebase-config.js` contienen la configuración
pública del SDK web y siguen siendo dependencias del navegador.
`businesses_only.json` contiene el catálogo público utilizado por el seeder existente;
`stream_database_seed.json` contiene los datos de muestra solicitados por el panel
de estadísticas. Los archivos JSON de `data/` contienen los catálogos de tarjetas
y productos.

Se excluyen funciones Firebase, exportaciones y respaldos de usuarios, archivos
`.bak`, documentos internos, archivos de entorno, credenciales de servidor,
configuración de otros hostings y todos los PDF. Esto incluye el manual interno
`mini_widgets/recursos/Manual_A1_Unico_Interfaces_y_Rendimiento.pdf`
(32,594,152 bytes, superior a 25 MiB). No se copia la raíz completa.

## Rutas

`html_handling: none` mantiene las URLs HTML. El build genera reglas exactas en
`dist/_redirects` con estado 200 para `/`, las rutas sin extensión y las portadas
de subdirectorios. No hay reglas genéricas ni redirecciones desde archivos HTML.
Por ejemplo, `/servicios` sirve `/servicios.html` sin cambiar la URL; ambas formas
siguen disponibles. Los callbacks OAuth y los widgets HTML conservan sus rutas y
parámetros. El comportamiento JavaScript de cada página se conserva.

Las carpetas sin un HTML hermano, como `/laboratorio` y `/mini_widgets`, llevan a
su versión con barra final para que funcionen los recursos relativos. `/sensunshop`
y `/sensunshop/admin` corresponden a sus HTML hermanos; las variantes con barra
corresponden a sus respectivos `index.html`. El build genera una página 404 propia en `dist`,
sin modificar las páginas del repositorio ni usar la portada como fallback.

## Alcance de la prueba

La configuración no declara dominios, rutas de zona ni bindings de Firebase.
Las llamadas existentes a Firebase y a las funciones Spotify continúan usando sus
direcciones actuales. Workers Static Assets no ejecuta `functions/` ni reproduce
los rewrites de Firebase `/spotify/**` y `/api/spotify/**`.

El inicio de sesión real en un hostname nuevo depende de la configuración existente
de dominios autorizados y Redirect URIs de cada proveedor. La prueba local comprueba
el transporte de las páginas OAuth; no intercambia códigos ni modifica proveedores.

Para una publicación manual de prueba, después de revisar los resultados locales:

```sh
npx wrangler deploy
```

Ese comando publica en la cuenta Cloudflare autenticada. No forma parte de las
pruebas automáticas. No se han cambiado DNS, dominio, Firebase ni GitHub Pages.

Referencias: [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
y [reglas de rutas en Static Assets](https://developers.cloudflare.com/workers/static-assets/redirects/).
