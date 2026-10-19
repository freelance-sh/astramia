import { LOVE_QUIZ, type QuizQuestion, type When } from "./quiz";
import type { ReadingTopic } from "./types";

/**
 * The questionnaires of the readings past love. Same rules as the love one
 * (`quiz.ts`): one tap each, facts and behaviours over wishes, and nothing
 * that assumes what the reader didn't say. Question ids are unique across
 * readings (the panel counts answers by id); only `trato` is shared.
 */

const [TRATO] = LOVE_QUIZ;

/** Compatibility: whoever "that person" is now, or was. */
const EX: When = { vinculo: ["ex"] };
const CRUSH: When = { vinculo: ["gusta"] };
const TOGETHER = [{ vinculo: ["pareja", "sin_nombre"] }] as const;
const NOT_CRUSH = [{ vinculo: ["pareja", "sin_nombre", "ex"] }] as const;
const CLASHES = ["discutir", "tiempos", "confianza", "futuro", "mostrar"];

export const COMPATIBILITY_QUIZ: readonly QuizQuestion[] = [
    TRATO,
    {
        id: "vinculo",
        question: "¿Quién es esa persona para ti?",
        options: [
            { id: "pareja", label: "Mi pareja" },
            { id: "gusta", label: "Alguien que me gusta" },
            { id: "sin_nombre", label: "Estamos en algo sin nombre" },
            { id: "ex", label: "Mi ex" },
        ],
    },
    {
        id: "conocen",
        question: "¿Hace cuánto se conocen?",
        options: [
            { id: "poco", label: "Hace poco" },
            { id: "meses", label: "Unos meses" },
            { id: "anio", label: "Más de un año" },
            { id: "anios", label: "Años" },
        ],
    },
    {
        id: "fluye",
        question: "¿Qué sale solo entre ustedes?",
        reword: [
            { when: EX, question: "¿Qué salía solo entre ustedes?" },
            { when: CRUSH, question: "¿Qué sale solo cuando hablan o se ven?" },
        ],
        options: [
            { id: "hablar", label: "Hablar por horas" },
            { id: "quimica", label: "La química" },
            { id: "risa", label: "Reírnos" },
            { id: "calma", label: "Estar en calma, sin decir nada" },
        ],
    },
    {
        id: "choca",
        question: "¿Dónde chocan?",
        reword: [
            { when: EX, question: "¿Dónde chocaban?" },
            { when: CRUSH, question: "¿Dónde sientes que podrían chocar?" },
        ],
        options: [
            { id: "discutir", label: "Al discutir" },
            { id: "tiempos", label: "En los tiempos de cada quien" },
            { id: "confianza", label: "En la confianza o los celos" },
            { id: "futuro", label: "En lo que cada quien quiere a futuro" },
            {
                id: "mostrar",
                label: "En cómo muestra cada quien lo que siente",
            },
            {
                id: "casi_no",
                label: "Casi no chocamos",
                relabel: [{ when: EX, label: "Casi no chocábamos" }],
                showIf: NOT_CRUSH,
            },
            {
                id: "aun_no",
                label: "Todavía no lo sé",
                showIf: [CRUSH],
            },
        ],
    },
    {
        id: "c_pregunta",
        question: "¿Qué quieres saber primero?",
        options: [
            { id: "compatibles", label: "Si de verdad somos compatibles" },
            {
                id: "chocamos",
                label: "Por qué chocamos en lo mismo",
                relabel: [
                    { when: EX, label: "Por qué chocábamos en lo mismo" },
                ],
                // Only whoever said where they clash.
                showIf: [{ ...NOT_CRUSH[0], choca: CLASHES }],
            },
            {
                id: "necesita",
                label: "Qué necesita esa persona de mí",
                relabel: [
                    { when: EX, label: "Qué necesitaba esa persona de mí" },
                ],
            },
            {
                id: "hacia_donde",
                label: "Hacia dónde puede ir esto",
                showIf: [CRUSH, ...TOGETHER],
            },
            { id: "no_funciono", label: "Por qué no funcionó", showIf: [EX] },
            {
                id: "intentarlo",
                label: "Si tiene sentido intentarlo de nuevo",
                showIf: [EX],
            },
        ],
    },
];

export const PERSONALITY_QUIZ: readonly QuizQuestion[] = [
    TRATO,
    {
        id: "notan",
        question: "¿Qué es lo primero que la gente nota de ti?",
        options: [
            { id: "energia", label: "Mi energía" },
            { id: "calma", label: "Mi calma" },
            { id: "humor", label: "Mi humor" },
            {
                id: "seriedad",
                label: {
                    femenino: "Que parezco seria",
                    masculino: "Que parezco serio",
                    neutro: "Que parezco una persona seria",
                },
            },
            { id: "misterio", label: "Que no se me lee fácil" },
        ],
    },
    {
        id: "llegar",
        question: "Cuando llegas a un lugar donde no conoces a nadie, tú…",
        options: [
            { id: "observo", label: "Observo antes de hablar" },
            { id: "saludo", label: "Saludo y me presento" },
            { id: "busco", label: "Busco a alguien que conozca" },
            { id: "espero", label: "Espero a que se acerquen" },
        ],
    },
    {
        id: "cuesta",
        question: "¿Qué te cuesta más?",
        options: [
            { id: "ayuda", label: "Pedir ayuda" },
            { id: "decir_no", label: "Decir que no" },
            {
                id: "quieto",
                label: {
                    femenino: "Quedarme quieta",
                    masculino: "Quedarme quieto",
                    neutro: "Quedarme sin hacer nada",
                },
            },
            { id: "mostrar", label: "Mostrar lo que siento" },
            { id: "empezar", label: "Empezar lo que planeo" },
        ],
    },
    {
        id: "oculto",
        question: "¿Qué parte de ti casi nadie ve?",
        options: [
            { id: "pienso", label: "Lo mucho que pienso las cosas" },
            { id: "sensible", label: "Lo sensible que soy" },
            {
                id: "ganar",
                label: {
                    femenino: "Lo competitiva que soy",
                    masculino: "Lo competitivo que soy",
                    neutro: "Las ganas que tengo de ganar",
                },
            },
            {
                id: "dudas",
                label: {
                    femenino: "Lo insegura que me siento a veces",
                    masculino: "Lo inseguro que me siento a veces",
                    neutro: "Las dudas que tengo de mí",
                },
            },
            {
                id: "espacio",
                label: {
                    femenino: "Lo mucho que necesito estar sola",
                    masculino: "Lo mucho que necesito estar solo",
                    neutro: "Lo mucho que necesito mi espacio",
                },
            },
        ],
    },
    {
        id: "p_pregunta",
        question: "¿Qué quieres entender primero?",
        options: [
            {
                id: "me_ven",
                label: "Por qué la gente me ve distinto a como soy",
            },
            { id: "paz", label: "Qué me hace sentir en paz" },
            { id: "fuerza", label: "Cuál es mi mayor fuerza" },
            { id: "tropiezo", label: "Por qué tropiezo con lo mismo" },
            { id: "rumbo", label: "Qué camino va conmigo" },
        ],
    },
];

export const PATH_QUIZ: readonly QuizQuestion[] = [
    TRATO,
    {
        id: "momento",
        question: "¿Cómo describirías el momento que vives?",
        options: [
            { id: "cambio", label: "Un cambio grande" },
            { id: "no_avanzo", label: "Siento que no avanzo" },
            { id: "empezando", label: "Empezando algo" },
            { id: "cerrando", label: "Cerrando algo" },
            { id: "perdida", label: "No sé hacia dónde voy" },
        ],
    },
    {
        id: "area",
        question: "¿Dónde sientes más movimiento?",
        options: [
            { id: "trabajo", label: "En el trabajo o los estudios" },
            { id: "amor", label: "En el amor" },
            { id: "familia", label: "En mi familia" },
            { id: "casa", label: "En dónde vivo" },
            { id: "yo", label: "En mí: en quién soy" },
        ],
    },
    {
        id: "pesa",
        question: "¿Qué te pesa más hoy?",
        options: [
            { id: "incertidumbre", label: "No saber qué viene" },
            { id: "cansancio", label: "El cansancio" },
            { id: "decision", label: "Una decisión pendiente" },
            { id: "atras", label: "Sentir que me quedo atrás" },
            { id: "nada", label: "Nada en especial" },
        ],
    },
    {
        id: "busco_etapa",
        question: "De esta etapa, lo que más quieres es…",
        options: [
            { id: "claridad", label: "Claridad" },
            { id: "estabilidad", label: "Estabilidad" },
            { id: "cambio_real", label: "Un cambio de verdad" },
            { id: "tiempo", label: "Tiempo para mí" },
            { id: "se_mueva", label: "Que algo por fin se mueva" },
        ],
    },
    {
        id: "k_pregunta",
        question: "¿Qué quieres saber primero?",
        options: [
            { id: "capitulo", label: "Qué capítulo estoy viviendo" },
            { id: "se_mueve", label: "Cuándo se mueve lo que está quieto" },
            { id: "me_pide", label: "Qué me está pidiendo este momento" },
            { id: "viene", label: "Qué viene en los próximos meses" },
            {
                id: "decision_grande",
                label: "Si es momento de una decisión grande",
            },
        ],
    },
];

export const QUIZZES: Record<ReadingTopic, readonly QuizQuestion[]> = {
    amor: LOVE_QUIZ,
    compatibilidad: COMPATIBILITY_QUIZ,
    personalidad: PERSONALITY_QUIZ,
    camino: PATH_QUIZ,
};

/** The question each reading's "what do you want to know first" is. */
export const FIRST_QUESTION: Record<ReadingTopic, string> = {
    amor: "pregunta",
    compatibilidad: "c_pregunta",
    personalidad: "p_pregunta",
    camino: "k_pregunta",
};
