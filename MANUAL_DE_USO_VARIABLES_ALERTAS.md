# Manual de Uso: Variables Dinámicas y Configuración de Alertas

¡Bienvenido al sistema de alertas interactivas para creadores de contenido! Este manual te guiará paso a paso para personalizar los mensajes de tus alertas (**Alerta Estelar**, **Alerta Conejita**, **Alerta Eléctrica** y más), integrar variables dinámicas y conectarlas a OBS Studio en pocos segundos.

---

## 1. ¿Qué son las Variables Dinámicas?

Las variables son etiquetas especiales escritas entre llaves `{}` que el widget reemplaza automáticamente en tiempo real con los datos exactos del evento que ocurre en tu transmisión (el nombre del usuario, los meses suscritos, la cantidad de regalos, etc.).

Al escribir tu mensaje personalizado, solo debes colocar la variable donde deseas que aparezca ese dato.

---

## 2. Lista de Variables Disponibles

| Variable | Descripción | Eventos recomendados | Ejemplo de resultado |
| :--- | :--- | :--- | :--- |
| **`{user}`** | Nombre del usuario que activa la alerta. | Todos (Follow, Sub, Gift, Raid, Kicks) | *EstrellaFugaz_99*, *ConejitoKawaii* |
| **`{meses}`** | Número de meses acumulados o renovados de suscripción. | Suscripción | *3*, *12* |
| **`{subs}`** | Cantidad de suscripciones de regalo entregadas. | Sub Regalada (Gift) | *5*, *20* |
| **`{viewers}`** | Número de espectadores que acompañan la incursión (Raid). | Incursión / Raid | *45*, *120* |
| **`{kicks}`** | Cantidad de Kicks (gemas o monedas de apoyo) donadas en el chat. | Apoyo con Kicks | *500*, *2500* |

---

## 3. Ejemplos de Mensajes Personalizados para Copiar y Pegar

Puedes copiar cualquiera de estos ejemplos y pegarlo directamente en los campos de configuración de tu widget:

### 🌟 Nuevo Seguidor
- `¡{user} se ha unido a la tripulación!` *(Estelar)*
- `¡{user} se unió a la madriguera!` *(Conejita Kawaii)*
- `Bienvenido al canal, {user}. ¡Ponte cómodo!`
- `¡Gracias por el follow, {user}! Bienvenido a la comunidad.`

### ⭐ Suscriptor
- `{user} lleva {meses} meses apoyando el canal`
- `¡{user} ahora es un conejito VIP!` *(Conejita Kawaii)*
- `¡{user} renueva su pase estelar por {meses} meses!`
- `¡{meses} meses de puro apoyo con {user} en la nave!`

### 🎁 Sub Regalada (Gift)
- `¡{user} regaló {subs} suscripciones a la comunidad!`
- `¡{user} ha regalado {subs} zanahorias a la madriguera!` *(Conejita Kawaii)*
- `¡Lluvia de regalos! {user} repartió {subs} pases a la tripulación`
- `¡{user} acaba de bendecir el chat con {subs} suscripciones!`

### 🚀 Incursión / Raid
- `¡Invasión épica de {user} con {viewers} espectadores!`
- `¡{user} trajo una estampida de {viewers} conejitos!` *(Conejita Kawaii)*
- `¡{user} llega con una flota de {viewers} personas a bordo!`
- `¡{viewers} tripulantes aterrizan junto a {user}!`

### 💎 Kicks / Apoyo
- `¡{user} nos envió {kicks} Kicks mágicos!` *(Conejita Kawaii)*
- `¡{user} envió {kicks} Kicks de pura energía!`
- `¡Poder para el directo! {user} aportó {kicks} gemas`
- `¡Gracias por tu apoyo, {user}! ({kicks} Kicks)`

---

## 4. Cómo Insertar Variables en el Panel

1. Abre el panel de configuración del widget deseado en la galería.
2. Desplázate por el panel derecho hasta la sección de **Mensajes Personalizados**.
3. Haz clic en los botones de inserción rápida que aparecen sobre cada campo (por ejemplo, `+ {user}`, `+ {meses}`, `+ {subs}`, `+ {viewers}`, `+ {kicks}`).
4. La etiqueta se insertará automáticamente al final de tu texto.
5. Puedes pulsar los botones **▶ Probar** ubicados a la derecha de cada tarjeta para ver cómo se verá la alerta en vivo en la pantalla de previsualización.

---

## 5. Cómo Integrar tu Alerta en OBS Studio

Una vez que hayas configurado tu canal, volumen y mensajes:

1. **Copiar el enlace**:
   - En el panel del widget, haz clic en el botón azul **"Copiar Enlace para OBS"**.
   - El enlace personalizado con todos tus ajustes se copiará a tu portapapeles.

2. **Crear la fuente en OBS Studio**:
   - Abre **OBS Studio**.
   - En la sección **Fuentes** (Sources), haz clic en el botón **`+`**.
   - Selecciona **Navegador** (Browser Source).
   - Asígnale un nombre descriptivo (por ejemplo: `Alerta Estelar` o `Alerta Eléctrica`) y presiona **Aceptar**.

3. **Configurar los parámetros del navegador**:
   - **URL**: Pega el enlace copiado (`Ctrl + V`).
   - **Ancho (Width)**: `1920` (o el ancho de tu lienzo de transmisión).
   - **Alto (Height)**: `1080` (o el alto de tu lienzo de transmisión).
   - **Controlar audio a través de OBS** *(Opcional)*: Activa esta casilla si deseas controlar y mezclar el volumen de la alerta desde el mezclador de audio de OBS Studio.
   - **Apagar fuente cuando no esté visible**: Marcado (recomendado).
   - **Actualizar el navegador cuando la escena se active**: Marcado (recomendado).
   - Haz clic en **Aceptar**.

¡Listo! Tu widget de alertas ya está en vivo, conectado y listo para reaccionar a todos los eventos de tu transmisión con tus mensajes personalizados y avatares.
