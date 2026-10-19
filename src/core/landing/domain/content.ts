import { PAYMENT_PROCESSOR } from "@/core/legal/domain/business";
import { REFUND_POLICY } from "@/core/legal/domain/policies";
import {
    formatPrice,
    PRODUCTS,
    priceParts,
} from "@/core/payment/domain/catalog";
import { QUIZ_LENGTH } from "@/core/reading/domain/quiz";
import { CHAT_LIMITS } from "@/core/reading/domain/schemas";

/**
 * Landing copy + product facts. Single source so pricing/session length
 * never drift between sections.
 */

const UNLOCK_PRICE = PRODUCTS.reading_unlock.price;

export const OFFER = {
    price: formatPrice(UNLOCK_PRICE),
    priceParts: priceParts(UNLOCK_PRICE),
    priceAmount: UNLOCK_PRICE.amountCents / 100,
    currency: UNLOCK_PRICE.currency,
    chatHours: CHAT_LIMITS.hours,
    questions: QUIZ_LENGTH,
} as const;

/** Entry point of the purchase flow (cuestionario → pago → lectura). */
export const START_READING_HREF = "/lectura/amor";

/** Same entry point, carrying the day and month they already gave us. */
export function startReadingHref(birth?: {
    day: number;
    month: number;
}): string {
    return birth
        ? `${START_READING_HREF}?dia=${birth.day}&mes=${birth.month}`
        : START_READING_HREF;
}

export const NAV_LINKS = [
    { href: "/#experiencias", label: "Lecturas" },
    { href: "/#como-funciona", label: "Cómo funciona" },
    { href: "/#conversacion", label: "El chat" },
    { href: "/#precio", label: "Precio" },
    { href: "/#preguntas", label: "Preguntas" },
] as const;

export const HERO = {
    kicker: "Lectura de amor · hecha con tus respuestas",
    headline: ["Tu carta astral,", "ahora conversa", "contigo."],
    lede: `Responde ${OFFER.questions} preguntas. En minutos tienes una lectura de amor escrita para ti, no para tu signo. Y ${OFFER.chatHours} horas para seguir preguntando a una IA que la leyó antes que tú.`,
    birthPrompt: "¿Cuándo naciste?",
    birthHint:
        "Con el día y el mes ves tu signo. Nada se guarda hasta que pides tu lectura.",
    ctaDefault: `Empezar mi lectura · ${OFFER.price}`,
    ctaForSign: (signName: string) =>
        `Ver mi lectura de ${signName} · ${OFFER.price}`,
} as const;

export interface Experience {
    id: string;
    numeral: string;
    title: string;
    description: string;
    /** Astro detail that anchors the reading, shown as marginalia. */
    anchor: string;
    /** What it asks beyond the date, said before they start. */
    needs?: string;
    available: boolean;
}

/** Where each reading's questionnaire starts. */
export const readingHref = (id: string) => `/lectura/${id}`;

export const EXPERIENCES: Experience[] = [
    {
        id: "amor",
        numeral: "I",
        title: "Amor y relaciones",
        description:
            "Qué buscas cuando dices que no buscas nada. El patrón que repites desde la segunda relación. Y hacia dónde se mueve Venus en los próximos meses para ti.",
        anchor: "Venus · Marte · Luna",
        available: true,
    },
    {
        id: "compatibilidad",
        numeral: "II",
        title: "Compatibilidad",
        description:
            "Dos cartas, una sobre la otra. Dónde encajan sin esfuerzo y dónde van a chocar.",
        anchor: "Sinastría",
        needs: "Con su fecha de nacimiento",
        available: true,
    },
    {
        id: "personalidad",
        numeral: "III",
        title: "Personalidad",
        description:
            "Sol, Luna y Ascendente: cómo te ven, cómo te sientes y cómo te presentas.",
        anchor: "Sol · Luna · ASC",
        needs: "Con tu hora y ciudad de nacimiento",
        available: true,
    },
    {
        id: "camino",
        numeral: "IV",
        title: "Camino personal",
        description:
            "Los tránsitos que estás atravesando y qué capítulo te están abriendo.",
        anchor: "Tránsitos",
        available: true,
    },
];

export interface Step {
    numeral: string;
    title: string;
    description: string;
    /** Small mono note beside the step, almanac style. */
    note: string;
}

export const STEPS: Step[] = [
    {
        numeral: "01",
        title: "Elige tu lectura",
        description:
            "Amor, compatibilidad, personalidad o tu camino. Empieza por la pregunta que te trae hoy.",
        note: "1 min",
    },
    {
        numeral: "02",
        title: `Responde ${OFFER.questions} preguntas`,
        description:
            "Qué está pasando, qué te preocupa y tu fecha de nacimiento. Si sabes la hora, tu Luna queda exacta.",
        note: "3 min",
    },
    {
        numeral: "03",
        title: "Paga una sola vez",
        description: `${OFFER.price} con tarjeta de crédito o débito. Ves el precio antes, no después. Sin suscripción.`,
        note: OFFER.price,
    },
    {
        numeral: "04",
        title: "Recibe tu lectura",
        description:
            "Escrita con tus respuestas y tu carta: Venus, Marte, la Luna y lo que Venus trae en los próximos meses. No un horóscopo de signo.",
        note: "minutos",
    },
    {
        numeral: "05",
        title: `Conversa ${OFFER.chatHours} horas`,
        description:
            "Pregunta lo que la lectura te dejó pensando. La IA ya sabe lo que respondiste y lo que te escribió. Las horas empiezan con tu primera pregunta.",
        note: `${OFFER.chatHours} h`,
    },
];

export interface ChatMessage {
    from: "user" | "astramia";
    text: string;
}

/** What the assistant "remembers" from the demo user's questionnaire. */
export const DEMO_CONTEXT = {
    sun: "Sol en Escorpio",
    venus: "Venus 14°32′ ♏",
    answer: "«saliendo de una ruptura»",
} as const;

export const DEMO_CHAT: ChatMessage[] = [
    {
        from: "user",
        text: "En mi lectura dice que Venus en Escorpio me hace intensa. ¿Eso explica por qué me cuesta tanto soltar?",
    },
    {
        from: "astramia",
        text: "En parte. Venus en Escorpio no ama a medias: cuando se abre, lo hace entero, y por eso cerrar le cuesta el doble. Me contaste que estás saliendo de una ruptura, y tu Luna en Tauro quiere quedarse donde ya se sintió en casa. ¿Quieres que veamos qué te pide Marte para soltar?",
    },
    {
        from: "user",
        text: "Sí. Y también qué me trae este mes.",
    },
    {
        from: "astramia",
        text: "Vamos por partes. Cuando Venus pase por Capricornio, en buen aspecto con tu Luna, vas a tener menos ganas de salir y más de ordenar lo de adentro. No son semanas para forzar un cierre, sino para entender qué parte de ti sigue esperando una llamada.",
    },
];

export const PRICING_INCLUDES = [
    { item: "Una lectura completa", detail: "la que elijas, escrita para ti" },
    {
        item: "Tu carta natal interpretada",
        detail: "con datos astronómicos reales",
    },
    {
        item: `${OFFER.chatHours} horas de chat con tu Sol`,
        detail: "conoce tu carta y tu lectura",
    },
    { item: "Acceso a tu lectura", detail: "para siempre" },
    { item: "Suscripción", detail: "ninguna" },
] as const;

export interface FinePrintPoint {
    numeral: string;
    title: string;
    description: string;
}

/** Trust points written as "letra clara" rather than a feature grid. */
export const FINE_PRINT: FinePrintPoint[] = [
    {
        numeral: "§1",
        title: "El precio es ese",
        description: `${OFFER.price}, una vez. Lo ves antes de responder la primera pregunta y no hay un segundo cobro escondido en las ${OFFER.chatHours} horas de chat.`,
    },
    {
        numeral: "§2",
        title: "Tu tarjeta no pasa por nosotros",
        description:
            "El pago lo procesa una pasarela certificada. Astramia nunca ve ni guarda el número de tu tarjeta.",
    },
    {
        numeral: "§3",
        title: "Tus respuestas son tuyas",
        description:
            "Las usamos para escribir tu lectura y para que el chat te entienda. No las vendemos, no las compartimos, no entrenan nada.",
    },
    {
        numeral: "§4",
        title: "Es entretenimiento, y lo decimos",
        description:
            "Astramia es astrología para conocerte y pasarla bien. No reemplaza a un psicólogo, a un médico ni a un abogado, y no toma decisiones por ti.",
    },
];

export interface Faq {
    question: string;
    answer: string;
}

export const FAQS: Faq[] = [
    {
        question: `¿Qué recibo exactamente por ${OFFER.price}?`,
        answer: `Una lectura completa (de amor, compatibilidad, personalidad o tu camino) escrita a partir de tu carta y tus respuestas, más ${OFFER.chatHours} horas de conversación con tu Sol: una IA que conoce tu carta y tu lectura. La lectura queda guardada para siempre. Las ${OFFER.chatHours} horas de chat empiezan con tu primera pregunta, no al pagar.`,
    },
    {
        question: "¿Necesito saber mi hora exacta de nacimiento?",
        answer: "Para la mayoría, no. Con la fecha calculamos tu Sol, Venus, Marte y los demás planetas. La Luna cambia de signo cada dos días y medio: con la hora queda exacta, y sin ella te decimos con honestidad si quedó entre dos signos. Solo la lectura de personalidad necesita tu hora y tu ciudad: tu Ascendente cambia de signo cada dos horas.",
    },
    {
        question: `¿Qué pasa cuando terminan las ${OFFER.chatHours} horas?`,
        answer: "El chat se cierra y no se puede extender. Tu lectura completa sigue disponible para volver a leerla cuando quieras.",
    },
    {
        question: "¿Es una suscripción?",
        answer: "No. Es un pago único. No guardamos tu tarjeta y no hay cobros futuros.",
    },
    {
        question: "¿Y si no me convence?",
        answer: `Si es tu primera compra, tienes ${REFUND_POLICY.firstPurchaseDays} días para pedir el reembolso completo, sin explicar por qué. Si tu lectura no llegó o hubo una falla técnica, tienes ${REFUND_POLICY.technicalIssueDays} días. El pago lo procesa ${PAYMENT_PROCESSOR} y el dinero vuelve a tu misma tarjeta.`,
    },
    {
        question: "¿La lectura la escribe una persona o una IA?",
        answer: "Una IA, con reglas de interpretación astrológica y lo que tú nos cuentas. Por eso llega en minutos y por eso después puedes conversar con ella sobre lo que escribió.",
    },
    {
        question: "¿Funciona desde el celular?",
        answer: "Sí. Está pensado para hacerse desde el teléfono, del cuestionario al chat.",
    },
];

export const FINAL_CTA = {
    headline: "Venus ya está en algún lugar de tu carta.",
    sub: `Descubre dónde. Tu lectura de amor y ${OFFER.chatHours} horas de conversación por ${OFFER.price}.`,
} as const;
