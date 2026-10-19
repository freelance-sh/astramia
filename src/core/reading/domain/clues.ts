import type { QuizAnswer } from "./types";

/**
 * What usually comes with each answer, one step beyond what it says: a
 * feeling or a way of seeing things most people who pick it would
 * recognize but didn't write. Inner states, not deeds: "it weighs on
 * them" is almost always true; "they don't tell their friends" is a fact
 * one reader in three will deny. A reading that names those, instead of echoing the
 * answer back, is the one that feels like it saw them (self-reported data
 * is the real signal; an echo of it, a minute later, reads as a trick).
 *
 * Written as notes, not sentences, so the model has to write its own:
 * pasted, the same line would show up for everyone who gave that answer.
 * Only the reader's own answers' clues go in its prompt. High base rate on
 * purpose (nothing a reader of that answer would deny), and nothing about
 * the other person's gender, nor events they didn't tell. Where an answer
 * can mean several things, the note says the range, never picks one: a
 * reader who chose "perderme a mí" over clashing life plans was told it
 * was about leaving their friends.
 */
const CLUES: Record<string, Record<string, readonly string[]>> = {
    // ---------- compatibility ----------
    vinculo: {
        pareja: [
            "a ratos se pregunta si se conocen de verdad o si ya se acostumbraron",
        ],
        gusta: [
            "lee cada señal de esa persona dos veces, buscando si significa algo",
            "imagina cómo sería y le da un poco de miedo que sea tan bueno como imagina",
        ],
        sin_nombre: ["le cansa no saber qué son, y a la vez teme preguntarlo"],
        ex: [
            "todavía hay algo de esa historia que no termina de entender",
            "a veces se pregunta si fue el momento o fueron las personas",
        ],
    },
    conocen: {
        poco: ["todo es nuevo: cada detalle todavía dice mucho"],
        meses: [
            "ya pasó la primera emoción; ahora empieza a ver lo que viene después",
        ],
        anio: ["ya conoce sus días buenos y sus días malos"],
        anios: ["la historia es larga: hay cosas que ya no necesitan decirse"],
    },
    fluye: {
        hablar: [
            "las conversaciones largas le hacen sentir visto o vista como pocas cosas",
        ],
        quimica: [
            "hay una atracción que no siempre sabe explicar con palabras",
        ],
        risa: ["reírse juntos le hace olvidar lo que en otro momento pesaría"],
        calma: ["valora poder estar en silencio sin que nada se sienta raro"],
    },
    choca: {
        discutir: ["después de discutir repasa lo que dijo y lo que no dijo"],
        tiempos: [
            "siente que uno de los dos siempre va más rápido o más lento",
        ],
        confianza: ["hay momentos en que duda, y le molesta dudar"],
        futuro: [
            "a veces piensa en lo que viene y no sabe si lo imaginan igual",
        ],
        mostrar: ["siente que quiere de una forma y le quieren de otra"],
        casi_no: [
            "que casi no choquen le da paz, y a ratos le hace preguntarse qué se callan",
        ],
        aun_no: ["todavía no sabe cómo sería el día a día con esa persona"],
    },
    // ---------- personality ----------
    notan: {
        energia: ["llena un lugar sin proponérselo, y a veces eso cansa"],
        calma: ["los demás le buscan cuando algo se complica"],
        humor: ["usa el humor también para no mostrar lo que le pesa"],
        seriedad: [
            "por dentro es más tierno o tierna de lo que parece por fuera",
        ],
        misterio: ["no le gusta explicar lo que siente hasta tenerlo claro"],
    },
    llegar: {
        observo: ["lee el ambiente antes de mostrarse"],
        saludo: ["prefiere romper el hielo antes de que el silencio pese"],
        busco: ["con alguien conocido al lado se suelta mucho más"],
        espero: ["le cuesta dar el primer paso, aunque tenga ganas de hablar"],
    },
    cuesta: {
        ayuda: ["está acostumbrado o acostumbrada a resolver solo o sola"],
        decir_no: ["dice que sí para no incomodar y luego carga con eso"],
        quieto: ["descansar sin culpa todavía le cuesta"],
        mostrar: ["siente mucho y lo cuenta poco"],
        empezar: ["lo piensa tanto que a veces se le pasa el momento"],
    },
    oculto: {
        pienso: ["repasa conversaciones horas después"],
        sensible: ["una frase pequeña le puede acompañar todo el día"],
        ganar: ["se exige más de lo que le exige nadie"],
        dudas: [
            "detrás de lo que muestra hay preguntas que no le cuenta a nadie",
        ],
        espacio: ["necesita tiempo a solas para volver a sentirse bien"],
    },
    // ---------- path ----------
    momento: {
        cambio: ["siente que algo se mueve aunque no sepa todavía hacia dónde"],
        no_avanzo: [
            "se compara con otros y le pesa sentirse en el mismo lugar",
        ],
        empezando: ["tiene ganas y algo de vértigo a la vez"],
        cerrando: ["le cuesta soltar algo aunque sepa que ya terminó"],
        perdida: ["tiene más preguntas que respuestas, y eso le inquieta"],
    },
    area: {
        trabajo: ["lo que hace todos los días ya no le alcanza como antes"],
        amor: ["lo que siente pide un lugar distinto en su vida"],
        familia: [
            "su lugar en la familia está cambiando, aunque nadie lo diga",
        ],
        casa: ["piensa en otro lugar donde vivir, o en otra forma de vivir"],
        yo: ["siente que está dejando de ser quien era"],
    },
    pesa: {
        incertidumbre: ["le gustaría saber al menos el siguiente paso"],
        cansancio: ["lleva tiempo dando más de lo que recupera"],
        decision: ["vuelve a esa decisión en los momentos tranquilos del día"],
        atras: ["mira lo que hacen otros y siente que llega tarde"],
        nada: ["está en un momento tranquilo, y quiere aprovecharlo bien"],
    },
    busco_etapa: {
        claridad: [
            "no necesita respuestas para todo: solo ver un poco más lejos",
        ],
        estabilidad: ["quiere algo firme donde apoyarse"],
        cambio_real: ["está harto o harta de los cambios a medias"],
        tiempo: ["necesita volver a tener tiempo para lo suyo"],
        se_mueva: ["lleva tiempo esperando algo que no termina de llegar"],
    },
    situacion: {
        soltera: [
            "disfruta su espacio y a ratos imagina a alguien que aún no existe",
            "no le basta cualquiera: busca a alguien que de verdad le entienda",
        ],
        alguien: [
            "ensaya en su cabeza lo que diría y cómo sonaría",
            "una respuesta tibia le deja pensando más de lo que admite",
        ],
        relacion: [
            "hay algo que siente y todavía no encuentra cómo decir",
            "a ratos compara cómo empezó todo con cómo está hoy",
        ],
        ruptura: [
            "repasa lo que pasó buscando el momento en que cambió",
            "hay días buenos, y de pronto algo pequeño le regresa al inicio",
        ],
        complicado: [
            "le cansa no saber bien a qué atenerse",
            "le cuesta explicar la historia completa, incluso a sí",
        ],
    },
    ultimo_amor: {
        hace_poco: ["lo reciente todavía marca lo que busca y lo que evita"],
        mas_de_un_ano: ["sabe estar sin nadie; ya no se conforma con poco"],
        anos: ["hace tiempo que nadie le mueve por dentro: pide más que antes"],
        nunca: ["ha querido, pero no así: espera algo que aún no conoce"],
    },
    sabe: {
        mutuo: ["las señales dicen que sí, y aun así le cuesta creerlo"],
        no_se_que_siente: ["no saber qué siente la otra persona le inquieta"],
        sospecha: ["le gusta que se note sin tener que decirlo del todo"],
        no_sabe: ["guarda lo que siente; imagina cómo sería decirlo"],
    },
    como_estan: {
        muy_bien: ["quiere cuidar lo que tiene; teme que la rutina lo gaste"],
        algo_falta: ["sabe que quiere algo más y no sabe cómo pedirlo"],
        rutina: ["extraña cómo se sentía al principio"],
        peleas: ["siente que las peleas pequeñas esconden algo más grande"],
        caminos: [
            "el cariño no está en duda, el rumbo sí: qué cedería y qué no",
        ],
        dudas: ["un día piensa en irse y al siguiente en quedarse"],
    },
    termino: {
        reciente_hablan: ["cada conversación le abre y le cierra la herida"],
        reciente_sin: ["el silencio le pesa más de lo que esperaba"],
        meses: ["ya sigue su vida, pero algo sigue sin cerrar"],
        mas_de_un_ano: ["lo superó en lo grande; queda una pregunta pequeña"],
    },
    complica: {
        sin_nombre: ["le pesa no poder ponerle nombre a lo que tienen"],
        otra_persona: [
            "hay una tercera persona en la historia; de quién es, no lo sabes: no lo elijas",
        ],
        idas_y_vueltas: ["cada regreso le ilusiona y le cansa a la vez"],
        distancia: ["extraña lo que la distancia no deja tener"],
        entorno: [
            "lo que siente y lo que le dicen no coinciden; quién tiene razón, no lo sabes: no lo elijas",
        ],
    },
    espera: {
        reviso: ["la espera le inquieta más de lo que muestra"],
        escribo: ["prefiere preguntar a quedarse con la duda"],
        como_si_nada: ["esconde cuánto le importa"],
        que_hice: ["tiende a buscar la falla en sí"],
        sigo: ["no deja que una respuesta le marque el día"],
    },
    patron: {
        indisponibles: [
            "lo difícil le atrae más que lo seguro",
            "cuando alguien sí está, algo en esta persona se aburre o desconfía",
        ],
        doy_demasiado: [
            "da sin que se lo pidan y le cuesta pedir",
            "espera que alguien note lo que da sin tener que decirlo",
        ],
        me_alejo: [
            "cuando algo se vuelve serio, siente que pierde aire",
            "sabe querer; lo difícil es quedarse cuando se vuelve serio",
        ],
        celos: [
            "nota los cambios pequeños antes que nadie",
            "le cuesta creer lo bueno cuando llega",
        ],
        no_se: [
            "siente que algo se repite y aún no le pone nombre",
            "desde adentro le cuesta ver su parte",
        ],
    },
    // No longer asked: readings made before still carry it.
    necesidad: {
        seguridad: [
            "le calma más un hecho que una promesa",
            "la duda le quita más paz de lo que admite",
        ],
        pasion: [
            "lo tibio le aburre rápido",
            "no sabe disimular cuando algo le gusta",
        ],
        libertad: [
            "necesita sentir que puede irse para querer quedarse",
            "le pesa tener que dar explicaciones",
        ],
        admiracion: [
            "se enamora de cómo piensa alguien antes que de cómo se ve",
            "el interés se apaga cuando deja de admirar",
        ],
        complicidad: [
            "quiere a alguien con quien reírse de lo mismo",
            "extraña la confianza de poder contarlo todo",
        ],
    },
    herida: {
        abandono: [
            "cuando alguien tarda en responder, imagina lo peor primero",
            "le importa cerrar bien las cosas: sabe lo que duele lo contrario",
        ],
        engano: [
            "quiere volver a confiar, pero le cuesta soltar la guardia",
            "cree menos en los elogios que en las críticas",
        ],
        indiferencia: [
            "el silencio le duele más que una pelea",
            "nota enseguida cuando alguien deja de poner interés",
        ],
        control: [
            "cuida su espacio más de lo que parece",
            "desconfía de lo que va demasiado rápido",
        ],
        perder_me: [
            "en una relación sintió que dejaba de ser quien es; qué cedió (tiempo, gente, planes, sueños), no lo sabes: no lo elijas",
            "quiere que querer a alguien no le cueste lo que quiere para su vida",
        ],
        no_correspondido: [
            "sabe lo que es querer más que la otra persona; ahora mide antes de entregarse",
            "le cuesta creer que alguien le elija sin dudar",
        ],
        ilusion: [
            "se ilusiona rápido y después se cuida de hacerlo",
            "imagina mucho lo que podría ser antes de que empiece",
        ],
        nada: [
            "no ha dejado que nadie llegue tan hondo; le da curiosidad y algo de miedo cómo sería",
        ],
    },
    pregunta: {
        volvera: ["además de si vuelve: si lo vivido fue real"],
        cuando: ["teme que algo en su forma de querer cierre la puerta"],
        por_que: [
            "quiere entenderlo para no repetirlo; teme que la causa sea suya",
        ],
        quedarme: ["ya intuye la respuesta; busca claridad para decidir"],
        quien: ["dejar de elegir lo que luego le hace daño"],
        pasara: ["además de si pasa algo: si vale la pena dar el paso"],
        futuro: ["el cariño está; quiere saber si van hacia el mismo lado"],
        cuidar: ["lo que tiene le importa; teme que la costumbre lo apague"],
    },
};

/**
 * For a ranking: what its first place says weighs on them, and what its
 * last rules out. The bottom is the safer signal: whatever they put last is
 * almost never what their other answers are about, so no scene goes there.
 */
const RANKED: Record<
    string,
    {
        first: Record<string, readonly string[]>;
        last: Record<string, readonly string[]>;
    }
> = {
    prioridades: {
        first: {
            amor: ["hoy lo que pase en el amor le mueve todo lo demás"],
            gente: [
                "su gente es su base: quiere un amor que quepa con su familia y sus amigos, no que le aleje de ellos",
            ],
            proyectos: [
                "está construyendo algo propio: quiere un amor que acompañe sus planes, no que los frene",
            ],
            libertad: [
                "cuida su espacio: quiere a alguien con quien estar sin dejar de ser quien es",
            ],
            familia: [
                "su familia es su base: lo que elija en el amor tiene que poder convivir con ella",
            ],
            amigos: [
                "su gente es su lugar seguro: no quiere un amor que le aleje de ella",
            ],
            dinero: [
                "hoy sus planes y su estabilidad pesan mucho: quiere un amor que sume a eso, no que lo frene",
            ],
        },
        last: {
            gente: [
                "su familia y sus amigos van al final de lo que hoy le importa: si ninguna otra respuesta los nombra, no los pongas en escena",
            ],
            proyectos: [
                "el trabajo y los estudios van al final de lo que hoy le importa: no los pongas en escena",
            ],
            libertad: [
                "no le pesa compartir su espacio: no le pintes como alguien que necesita escapar",
            ],
            amor: [
                "hoy pone otras cosas antes que el amor: no le pintes una vida que gira alrededor de alguien",
            ],
            familia: [
                "su familia va al final de lo que hoy le importa: si ninguna otra respuesta la nombra, no la pongas en escena",
            ],
            amigos: [
                "sus amigos van al final de lo que hoy le importa: si ninguna otra respuesta los nombra, no los pongas en escena",
            ],
            dinero: [
                "el dinero y el trabajo van al final de lo que hoy le importa: no los pongas en escena",
            ],
        },
    },
};

/** The clues for these answers, in the quiz's order. */
export function cluesFor(answers: readonly QuizAnswer[]): string[] {
    return answers.flatMap((a) => {
        if ("optionId" in a) return CLUES[a.questionId]?.[a.optionId] ?? [];
        const ranked = RANKED[a.questionId];
        const first = a.ranking[0];
        const last = a.ranking[a.ranking.length - 1];
        return [...(ranked?.first[first] ?? []), ...(ranked?.last[last] ?? [])];
    });
}
