# Vinculación de catálogos WolfTrack

La web y la app SensunShop pueden usar la misma función HTTPS `saveBusinessCatalog`, desplegada en `us-central1` del proyecto `sensunshopweb`. Requiere `POST`, `Content-Type: application/json` y `Authorization: Bearer <Firebase ID token>` de SensunShop, con el custom claim `admin: true`. El PIN del panel y la autenticación anónima no autorizan esta operación.

El cuerpo es `{ "businessId": "emp-002", "business": {}, "catalog": { "enabled": true, "email": "cuenta@ejemplo.com", "code": "WT-UID" } }`. `business` puede contener los campos habituales del negocio; el backend los combina con el registro existente. El código respeta mayúsculas y minúsculas. La función normaliza el correo, comprueba el código y correo en `wolftrack/users/{uid}` y consulta ese UID en Authentication de WolfTrack, incluyendo la verificación del correo. En una sola transacción guarda los cambios y `hasCatalog`, `catalogUid` y `catalogUrl`. No guarda el correo ni el código en el negocio público. Si falla la validación no escribe ningún cambio.

Para conservar una vinculación activa, enviar `enabled: true` y omitir correo y código. Para deshabilitarla, enviar `enabled: false`; se conservan UID y URL pero `hasCatalog` pasa a false. Para volver a habilitarla hay que validar de nuevo. La función responde `200` con `{ "success": true }` o un error JSON con `error` y código HTTP correspondiente.

## Preparación para producción

1. Asignar el custom claim `admin: true` a los administradores de SensunShop por un proceso confiable. Deben renovar su sesión para recibirlo. Las reglas de negocios requieren este claim; otros clientes que escriban negocios deben adaptarse.
2. Conceder a la cuenta de servicio de ejecución de la función en SensunShop acceso IAM de lectura a Realtime Database y consulta de usuarios de Firebase Authentication en `com-example-jikopuntos-f9ff5`. Usar roles mínimos o roles personalizados y credenciales predeterminadas del entorno; no distribuir claves. Verificar que la cuenta pueda leer específicamente `wolftrack/users/{uid}`. El Admin SDK usa IAM y no depende de las reglas de cliente de WolfTrack.
3. Revisar y desplegar `database.rules.json` y la función antes de publicar el panel. Los clientes no pueden modificar `hasCatalog`, `catalogUid` ni `catalogUrl` directamente; la función usa el Admin SDK. Revisar las reglas del proyecto WolfTrack: evitar lecturas públicas de `wolftrack/users` y permitir a los clientes de catálogo leer únicamente los materiales que deban ser públicos. Las reglas de WolfTrack no están en este repositorio.
4. Probar con una cuenta administradora, una cuenta sin privilegios, correo no verificado y una vinculación existente; verificar que los errores conservan los datos. Confirmar también el acceso público deseado a `wolftrack/materials/{uid}` y el comportamiento de inventarios vacíos.

El contrato original `INTEGRACION_CATALOGO_SENSUNSHOP.md` del proyecto InventarioWolf no está disponible en este espacio de trabajo. Antes de integrar la app, contrastar esta interfaz con ese contrato y coordinar cualquier diferencia.
