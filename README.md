# LEGAL TECH OAXACA | PERFECT V12 RELEASE

## App instalable y videoteca

El botón «Instalar app» utiliza la instalación del navegador cuando está disponible;
en otros casos muestra las instrucciones para agregar el sitio a la pantalla de
inicio. Requiere HTTPS (o localhost para desarrollo). La instalación es una app
web, no una descarga de una tienda, y el chat y los videos requieren conexión.

La videoteca incluye listas del canal oficial de la SCJN y enlaces alternativos
al sitio de la Corte y a YouTube. La disponibilidad de cada video depende del
proveedor.

`index.html` y `legaltech_oaxaca.html` son entradas equivalentes y deben
mantenerse sincronizadas. Para comprobar los cambios, ejecutar:

```text
node --test test/app-install.test.mjs test/site-chat.test.mjs functions/chat-worker/test/worker.test.mjs
```
