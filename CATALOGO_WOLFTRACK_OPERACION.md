# Vinculación de catálogos WolfTrack

La web y la app SensunShop pueden usar la misma función HTTPS `saveBusinessCatalog`, prevista para `us-central1` del proyecto `sensunshopweb`. El repositorio contiene el código, pero el despliegue y la configuración efectiva no están verificados. Requiere `POST`, `Content-Type: application/json` y `Authorization: Bearer <Firebase ID token>` de SensunShop, con el custom claim `admin: true`. El PIN del panel y la autenticación anónima no autorizan esta operación.

El cuerpo es `{ "businessId": "emp-002", "business": {}, "catalog": { "enabled": true, "email": "cuenta@ejemplo.com", "code": "WT-UID" } }`. `businessId` es la clave exacta, sensible a mayúsculas, del negocio en RTDB; no es su código comercial. Los datos locales usan clave `emp-002` y código `EMP-002`, pero debe comprobarse la clave en producción. `business` puede contener los campos habituales del negocio; el backend los combina con el registro existente y rechaza campos protegidos. El código respeta mayúsculas y minúsculas. La función normaliza el correo, comprueba el código y correo en `wolftrack/users/{uid}` y consulta ese UID en Authentication de WolfTrack, incluyendo la verificación del correo. En una sola transacción guarda los cambios y `hasCatalog`, `catalogUid` y `catalogUrl`. No guarda el correo ni el código en el negocio público. Si falla la validación no escribe ningún cambio.

Para conservar una vinculación activa, enviar `enabled: true` y omitir correo y código. Para deshabilitarla, enviar `enabled: false`; se conservan UID y URL pero `hasCatalog` pasa a false. Para volver a habilitarla hay que validar de nuevo. La función responde `200` con `{ "success": true }` o un error JSON con `error` y código HTTP correspondiente.

Para crear de forma exclusiva, incluir `"createOnly": true` junto a `businessId`, `business` y `catalog`. El cliente elige un identificador único y la transacción solo crea el registro si no existe; si ya existe responde `409` con `{ "error": "Ya existe un negocio con ese identificador." }`. Si se omite, el valor predeterminado es `false` y se combinan los datos. El panel web usa `createOnly` al crear. `business` admite `whatsappMsg` y `accentColor` además de los campos habituales; los campos omitidos se conservan. Estos cambios están implementados localmente y requieren despliegue.

## Preparación para producción

1. Asignar el custom claim `admin: true` a los administradores de SensunShop por un proceso confiable. Deben renovar su sesión para recibirlo. Las reglas de negocios requieren este claim; otros clientes que escriban negocios deben adaptarse.
2. Identificar la cuenta de servicio efectiva de ejecución y concederle en `com-example-jikopuntos-f9ff5` acceso IAM de lectura a Realtime Database y `firebaseauth.users.get`. Evaluar roles personalizados mínimos; `roles/firebaseauth.viewer` incluye el permiso junto con otras lecturas. Usar credenciales predeterminadas, sin distribuir claves, y comprobar los permisos reales. La instancia actual del Admin SDK usa IAM y no restringe su acceso mediante reglas. En coordinación con WolfTrack, evaluar `databaseAuthVariableOverride` y reglas que permitan leer únicamente los dos campos necesarios; esto limita esa instancia, pero no sustituye restricciones IAM ni evita que una identidad más privilegiada use otra instancia.
3. Revisar y desplegar `database.rules.json` y la función antes de publicar el panel. Los clientes no pueden modificar `hasCatalog`, `catalogUid` ni `catalogUrl` directamente; la función usa el Admin SDK. Revisar las reglas del proyecto WolfTrack: evitar lecturas públicas de `wolftrack/users` y permitir a los clientes de catálogo leer únicamente los materiales que deban ser públicos. Las reglas de WolfTrack no están en este repositorio.
4. Probar con una cuenta real verificada, una no verificada, código y correo incorrectos, una cuenta sin privilegios, permisos insuficientes y una vinculación existente; verificar que los errores conservan los datos. Comprobar que el propietario haya abierto la versión de WolfTrack que registra el código. Revisar los permisos heredados de nodos padres, el acceso del propietario a su perfil y qué campos del inventario son públicos. Los clientes web consultan `wolftrack/materials/{uid}` directamente: filtrar en el navegador no oculta los demás campos de la respuesta. Si contiene información privada, publicar una proyección segura o servir un catálogo filtrado desde backend antes de habilitar el acceso. Verificar inventarios vacíos y fallos de lectura por separado.

El equipo de WolfTrack informó que las rutas, la validación y los campos coinciden con `INTEGRACION_CATALOGO_SENSUNSHOP.md`; el documento original no está disponible en este espacio de trabajo. El código y el correo identifican la cuenta, pero no prueban el consentimiento de su propietario. Si se requiere autorización expresa para publicar el catálogo, debe implementarse un mecanismo adicional.

## Aprovisionar un administrador

Un operador autorizado debe habilitar y verificar el acceso con Google en Firebase Authentication de `sensunshopweb` y hacer que la persona inicie sesión para que exista su usuario. Desde un entorno confiable con credenciales de administrador para ese proyecto, usar Admin SDK para buscar al usuario exacto y asignarle el claim. Por ejemplo, con el SDK Node.js ya inicializado para `sensunshopweb`:

```js
const user = await admin.auth().getUserByEmail(correoConfirmado);
await admin.auth().setCustomUserClaims(user.uid, {
  ...(user.customClaims || {}),
  admin: true
});
```

Confirmar fuera de banda la identidad y el correo antes de ejecutar. Esta operación sustituye el conjunto de claims, por lo que se conservan los existentes; coordinar cambios concurrentes de claims. La persona debe volver a iniciar sesión o forzar `getIdToken(true)` en Android para usar inmediatamente el claim nuevo. No se ha ejecutado este aprovisionamiento ni verificado la configuración de proveedores.
