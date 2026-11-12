# Vinculación de catálogos WolfTrack

**Producción (12 de noviembre de 2026):** se desplegaron ambas funciones y una actualización limitada de las reglas de SensunShop. La copia exacta de las reglas publicadas está en `database.production.rules.json`, referenciada por `firebase.json`; `database.rules.json` es una propuesta distinta y no es el archivo desplegado. Revisar y conciliar ambos antes de cambiar la configuración de despliegue. La cuenta de ejecución confirmada es `sensunshopweb@appspot.gserviceaccount.com`. Los roles concedidos en WolfTrack permiten lectura de la base completa y Authentication, además del uso de APIs; revisar periódicamente ese alcance.

La web y la app SensunShop pueden usar la misma función HTTPS `saveBusinessCatalog`, desplegada en `us-central1` del proyecto `sensunshopweb`. Requiere `POST`, `Content-Type: application/json` y `Authorization: Bearer <Firebase ID token>` de SensunShop, con el custom claim `admin: true`. El PIN del panel y la autenticación anónima no autorizan esta operación.

El cuerpo es `{ "businessId": "emp-002", "business": {}, "catalog": { "enabled": true, "email": "cuenta@ejemplo.com", "code": "WT-UID" } }`. `businessId` es la clave exacta, sensible a mayúsculas, del negocio en RTDB; no es su código comercial. Los datos locales usan clave `emp-002` y código `EMP-002`, pero debe comprobarse la clave en producción. `business` puede contener los campos habituales del negocio; el backend los combina con el registro existente y rechaza campos protegidos. El código respeta mayúsculas y minúsculas. La función normaliza el correo, comprueba el código y correo en `wolftrack/users/{uid}` y consulta ese UID en Authentication de WolfTrack, incluyendo la verificación del correo. En una sola transacción guarda los cambios y `hasCatalog`, `catalogUid` y `catalogUrl`. No guarda el correo ni el código en el negocio público. Si falla la validación no escribe ningún cambio.

Para conservar una vinculación activa, enviar `enabled: true` y omitir correo y código. Para deshabilitarla, enviar `enabled: false`; se conservan UID y URL pero `hasCatalog` pasa a false. Para volver a habilitarla hay que validar de nuevo. La función responde `200` con `{ "success": true }` o un error JSON con `error` y código HTTP correspondiente.

Para crear de forma exclusiva, incluir `"createOnly": true` junto a `businessId`, `business` y `catalog`. El cliente elige un identificador único y la transacción solo crea el registro si no existe; si ya existe responde `409` con `{ "error": "Ya existe un negocio con ese identificador." }`. Si se omite, el valor predeterminado es `false` y se combinan los datos. El panel web usa `createOnly` al crear. `business` admite `whatsappMsg` y `accentColor` además de los campos habituales; los campos omitidos se conservan. Estos cambios están implementados localmente y requieren despliegue.

## Preparación para producción

1. Asignar el custom claim `admin: true` a los administradores de SensunShop por un proceso confiable. Deben renovar su sesión para recibirlo. Las reglas de negocios requieren este claim; otros clientes que escriban negocios deben adaptarse.
2. Identificar la cuenta de servicio efectiva de ejecución y concederle en `com-example-jikopuntos-f9ff5` acceso IAM de lectura a Realtime Database y `firebaseauth.users.get`. Evaluar roles personalizados mínimos; `roles/firebaseauth.viewer` incluye el permiso junto con otras lecturas. Usar credenciales predeterminadas, sin distribuir claves, y comprobar los permisos reales. La instancia actual del Admin SDK usa IAM y no restringe su acceso mediante reglas. En coordinación con WolfTrack, evaluar `databaseAuthVariableOverride` y reglas que permitan leer únicamente los dos campos necesarios; esto limita esa instancia, pero no sustituye restricciones IAM ni evita que una identidad más privilegiada use otra instancia.
3. Revisar y desplegar `database.rules.json` y las funciones antes de publicar el panel y el cliente público. Los clientes no pueden modificar `hasCatalog`, `catalogUid` ni `catalogUrl` directamente; las funciones usan el Admin SDK. Las reglas de WolfTrack no están en este repositorio: coordinar con su propietario para que `wolftrack/users` y el inventario original no tengan lectura pública y para conservar el acceso del propietario.
4. Probar con una cuenta real verificada, una no verificada, código y correo incorrectos, una cuenta sin privilegios, permisos insuficientes y una vinculación existente; verificar que los errores conservan los datos. Comprobar que el propietario haya abierto la versión de WolfTrack que registra el código. Revisar permisos heredados de nodos padres y verificar inventarios vacíos y fallos de lectura por separado. Las vinculaciones antiguas deben revalidarse: la lectura pública comprueba que el negocio esté activo y su UID tenga formato válido, pero no demuestra que una vinculación histórica haya pasado la validación actual.

El equipo de WolfTrack informó que las rutas, la validación y los campos coinciden con `INTEGRACION_CATALOGO_SENSUNSHOP.md`; el documento original no está disponible en este espacio de trabajo. El código y el correo identifican la cuenta, pero no prueban el consentimiento de su propietario. Si se requiere autorización expresa para publicar el catálogo, debe implementarse un mecanismo adicional.

## Lectura pública para Android y web

El endpoint local `getBusinessCatalog` está previsto en `https://us-central1-sensunshopweb.cloudfunctions.net/getBusinessCatalog?businessId=CLAVE_EXACTA`. Atiende `GET` sin token, resuelve el UID desde SensunShop y devuelve `{ "businessId": "...", "items": [...] }`, sin UID ni campos privados. Cada artículo contiene `id`, `name`, `type`, `description`, `sellingPrice`, `imageUrl`, `variants`, `extras` y `available`. Los arrays de opciones contienen únicamente `name` y `price`. Se excluyen los materiales y las cantidades; un producto con control de existencias solo está disponible si su cantidad es válida y positiva. La variante sustituye el precio base y los extras se suman.

Una lista vacía devuelve `200`; una clave inválida `400`; un negocio inexistente, deshabilitado o sin UID válido `404`; un fallo de acceso `500`. Las respuestas incluyen `Cache-Control: no-store`. La función vuelve a comprobar la vinculación después de consultar el inventario, aunque la configuración puede cambiar después de esa comprobación. Los clientes consultan al abrir y con la acción Recargar; una pantalla abierta no se actualiza automáticamente.

La web pública local usa `wolftrack.html?businessId=CLAVE_EXACTA`. Los enlaces históricos `wolftrack.html?uid=...` no identifican un negocio y deben migrarse en la app y en enlaces externos. El campo `catalogUrl` anterior puede contener ese formato heredado hasta que se revalide el negocio. La función está desplegada; los cambios locales de las páginas web no se han publicado como parte de este despliegue.

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
