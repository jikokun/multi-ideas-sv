# Documentación de sobres y cartas Jikokun

Esta carpeta acompaña al sistema de sobres de la tiendita. Los mismos manuales se guardan en la subcarpeta **Documentacion** de **Tarjetas_jikokun**, en Google Drive.

- [Uso, compra y administración](01_Manual_Sobres.md).
- [Comandos y cola de espera](02_Comandos.md).
- [Datos de Firebase, recuperación y pruebas](03_Firebase_y_recuperacion.md).

Configuración inicial: **1500 Jikopuntos por sobre**, tres cartas por sobre y colección principal 001–100. La configuración, las compras, la colección de cada usuario y los turnos se guardan en Firebase Realtime Database.

El carrusel original completo se conserva en `laboratorio/tarjetero_mostrador_legacy.html.txt`. El comando nuevo `!mostrarcartas` utiliza un carrusel pequeño para las cartas ganadas, sin reactivar los antiguos comandos del mostrador.

La presentación activa está integrada en `laboratorio/tarjetero.html`: aperturas compactas en la zona de la mesa, ampliación para especiales o superiores y carrusel inferior izquierdo. Las compras múltiples usan una presentación más rápida. La versión modular previa se conserva en `laboratorio/tarjetero_modular_respaldo.txt`.

Actualización: 7 de noviembre de 2026.
