# Guiones para ElevenLabs

Cada bloque es el texto exacto de un video, listo para pegar. El video ya
está armado con estas palabras y, al recibir el audio, se sincroniza solo
(`videos/<nombre>.voice.json`).

## Cómo están escritos

Usan lo que documenta ElevenLabs para Eleven v4
([guía de prompting](https://elevenlabs.io/docs/best-practices/prompting/eleven-v3),
[lista de etiquetas](https://elevenlabs.io/blog/elevenlabs-audio-tags-list)):

- **Etiquetas de audio** entre corchetes y en inglés, justo antes de las
  palabras que afectan: `[curious]`, `[softly]`, `[mischievously]`. No se
  leen en voz alta. La emoción sigue hasta la próxima etiqueta.
- **Pausas:** `...` da un respiro corto y `[pause]` una pausa clara. En
  v4 no funciona `<break time="…"/>`: ese era el de los modelos viejos.
- **Énfasis:** una palabra en MAYÚSCULAS se dice con más fuerza.

La energía va de más a menos y vuelve a subir: el gancho, directo y con
urgencia (compite con todo lo que suena en el feed); el medio, íntimo, como
quien cuenta un secreto; el cierre, cálido y firme. Esa caída es lo que
retiene: si el gancho ya empieza bajo, no hay a dónde bajar.

Las pausas están justo donde el video cambia de frase. El ajuste las usa
para encontrar cada frase, así que no hay que agregar pausas en medio de
una frase.

Al generar:

- **Modelo Eleven v4**, no Turbo. Con otro modelo, las etiquetas se leen en
  voz alta.
- **La misma voz que en Escorpio**, para que la marca suene igual.
- **Estabilidad un poco baja:** más expresiva, pero cada toma sale
  distinta. Genera dos o tres tomas y quédate con la mejor.
- **Si una etiqueta no se nota**, cámbiala por una vecina (`[softly]` por
  `[quietly]`, por ejemplo) y vuelve a generar.
- **Si sale con acento de España**, prueba a agregar
  `[neutral Latin American Spanish accent]` al principio. Es experimental y
  depende de la voz.
- **Si cambia o se come una palabra**, genera otra toma: el video muestra
  exactamente estas palabras.

## Escorpio · `escorpio` · ya grabado

Vale hasta el 24 de octubre de 2026 (Venus sale de Escorpio el 25 a las 5 a. m.).

## Libra · `libra` · del 25 de octubre al 13 de noviembre de 2026

Venus, que rige Libra, entra retrógrada a Libra el 25 de octubre (5 a. m. en Lima) y se pone
directa el 13 de noviembre (8 p. m. en Lima). Fuera de esas fechas el video
dice algo falso.

```
[urgent, direct] Si eres Libra... NO pases este video.
[confiding] Venus es tu planeta. [pause] Y entró RETRÓGRADA a tu signo... hasta el trece de noviembre.
[knowingly] Por eso estás dudando de lo que dabas por seguro.
[softly] Le das mil vueltas a un mensaje. Cedes para no pelear. [pause] [vulnerable] Y no sabes qué quieres tú.
[warm, confident] Astramia lee el cielo del día que naciste.
[curious] Pregúntale a tu carta... qué persona te conviene.
[warm, inviting] Empieza gratis en astramia punto app.
```

## Por qué tu horóscopo nunca te acierta · `horoscopo` · cualquier fecha

Para todos los signos. Es la idea de Astramia en 20 segundos: el horóscopo
mira tu Sol, el amor lo mandan Venus y Marte.

```
[incredulous, direct] ¿Por qué tu horóscopo NUNCA te acierta?
[matter-of-fact] Porque le habla a más de seiscientos millones de personas a la vez. [pause] Y solo mira tu Sol.
[leaning in, confiding] Pero en el amor mandan Venus y Marte.
Venus dice cómo amas. Marte dice qué te atrae.
[pause] Y pueden estar en otro signo. [playful] Puedes ser Aries... y amar como Piscis.
[warm, confident] Astramia lee el cielo del día que naciste.
[inviting] Descubre cómo amas de verdad. Empieza gratis en astramia punto app.
```

## Los 3 signos que siempre vuelven con su ex · `tres-signos` · cualquier fecha

Una cuenta regresiva que la gente discute en los comentarios ("¿y Leo?"), y
el giro: no manda tu signo, manda tu Venus.

```
[excited, gossipy] Los tres signos que SIEMPRE vuelven con su ex.
Número tres... [playful] Tauro. No vuelve por amor. [pause] Vuelve por costumbre.
Número dos... [softly] Cáncer. Guarda todos los recuerdos... y un día los vuelve a abrir.
[building suspense] Y el número uno... [pause] Escorpio. [knowingly] Dice que ya lo superó. [pause] [sarcastic] No es cierto.
[serious, leaning in] Pero aquí no manda tu signo. Manda tu Venus.
[warm, confident] Astramia lee el cielo del día que naciste.
[inviting] Descubre gratis si tu Venus es de las que vuelven. Entra a astramia punto app.
```
