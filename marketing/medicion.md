# Plan de medición

Qué se mide, con qué nombre y en qué momento. Los nombres no cambian: si
cambian, se rompen los embudos.

## Meta (Pixel 1653247253123702)

| Evento | Tipo | Cuándo se dispara | Parámetros | eventID |
|---|---|---|---|---|
| `PageView` | estándar | Cada página, también al pasar de una a otra | — | — |
| `InicioCuestionario` | personalizado | Abre el cuestionario | `tema` | — |
| `FechaIngresada` | personalizado | Envía su fecha de nacimiento | `signo` | — |
| `CompleteRegistration` | estándar | Se crea su lectura: cuestionario terminado | `content_name`, `status`, `signo` | `registro-<lectura>` |
| `Lead` | estándar | El mismo momento (se queda por si alguna campaña ya lo usa) | `content_name` | `lead-<lectura>` |
| `ViewContent` | estándar | Llega a donde se corta lo gratis y ve el precio | `value: 19.9`, `currency: 'PEN'` | `viewcontent-<lectura>` |
| `InitiateCheckout` | estándar | Toca "Desbloquear por S/ 19.90" | `value`, `currency` | — |
| `AddPaymentInfo` | estándar | Vuelve de Mercado Pago habiendo intentado pagar (aprobado, pendiente o rechazado) | `value`, `currency` | `addpaymentinfo-<lectura>` |
| `Purchase` | estándar | Se abre una lectura con un pedido pagado (haya vuelto o no del redirect) | `value` (lo que pagó), `currency` | `purchase-<lectura>` |

- **Una vez por lectura.** ViewContent, AddPaymentInfo y Purchase se mandan
  una sola vez por lectura, aunque recargue o vuelva otro día.
- **Purchase cuenta lo que se pagó.** El valor y la moneda salen del pedido,
  no del catálogo, y no hace falta volver del redirect: si el webhook fue el
  único que vio el pago, el evento sale la primera vez que se abre la
  lectura. Un desbloqueo sin pedido (el del dueño, que no paga) no cuenta.
- **Dos copias, un evento.** `Purchase` lo manda el navegador (al abrir la
  lectura pagada) y el servidor (cuando el pedido pasa a pagado, en
  `syncPaymentService`), con el mismo `eventID`: Meta cuenta uno. La copia
  del servidor necesita `META_CAPI_ACCESS_TOKEN` y cubre bloqueadores de
  anuncios y compradores que no vuelven a la página.
- **eventID.** Es el id de la lectura, porque una lectura se paga una sola
  vez. Si luego agregamos la API de Conversiones (eventos desde el
  servidor), el servidor manda el mismo id y Meta no cuenta doble.
- **AddPaymentInfo.** El pago es en la página de Mercado Pago y desde ahí no
  vemos cuándo escribe la tarjeta. Por eso se cuenta al volver con un pago
  intentado; quien cierra Mercado Pago sin intentar no lo dispara.
- **Datos sensibles.** Nunca se mandan las respuestas del cuestionario
  (situación, lo que le dolió) ni la fecha u hora de nacimiento. Solo el
  tema de la lectura y el signo solar, como dice la política de privacidad.
- **Conversiones personalizadas.** Para optimizar con InicioCuestionario o
  FechaIngresada, primero hay que crearlas como "Conversión personalizada"
  en el Administrador de eventos.
- **Probar.** En Administrador de eventos → Probar eventos, se hace una
  lectura real y se ven llegar en vivo. `Purchase` solo aparece con un pago
  real: el desbloqueo del dueño no manda el evento. Con
  `META_CAPI_TEST_EVENT_CODE` la copia del servidor llega como prueba, sin
  ensuciar los datos.

## Qué optimizar

- **Mientras las compras sean pocas:** `Lead` o `CompleteRegistration`, que
  ya se registran en cada cuestionario terminado. Optimizar por `Purchase`
  con cero compras deja al conjunto sin señal y Meta no gasta.
- **Cuando haya unas cuantas compras:** volver a `Purchase`. Ya lleva
  `value` y `currency`, así que el ROAS y el valor por conversión salen sin
  tocar código.
- Cambiar el evento de un conjunto reinicia su aprendizaje: mejor hacerlo
  mientras el gasto es mínimo.

## Enlaces de los anuncios: utm

El panel (`/panel`, tabla "Del anuncio a la compra") cruza cada anuncio con
lo que la gente hace después: si empieza el cuestionario, da su fecha, ve el
precio, va a pagar y paga. Para eso, cada enlace de anuncio necesita sus utm:

- Meta: `?utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`
- TikTok: `?utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__&utm_content=__CID_NAME__`

Cada persona cuenta para el primer anuncio por el que llegó.

## Nuestra analítica (panel)

Nombres en minúsculas, `objeto_accion`:

- **Visita:** `page_view` (con los utm y el sitio de origen), `page_time`,
  `click`, `start_reading_click` (qué botón llevó al cuestionario),
  `client_error`.
- **Cuestionario:** `quiz_start`, `quiz_answer` (pregunta, respuesta, paso,
  tiempo), `quiz_back`, `quiz_abandon` (lo cerró sin enviarlo: paso y
  segundos), `quiz_submit`, `quiz_error`, `quiz_fail`.
- **Lectura:** `reading_created` (servidor, cuánto tardó), `reading_view`,
  `story_step` (con los segundos del paso anterior), `paywall_view` (con el
  precio), `paywall_button_view`, `paywall_exit`, `story_end`.
- **Pago:** `checkout_click`, `checkout_open`, `checkout_error`,
  `checkout_return` (servidor: pagó, falló, pendiente o se fue).
- **Después de pagar:** `content_written` (servidor), `chat_view`,
  `chat_send`, `chat_reply` (servidor).
