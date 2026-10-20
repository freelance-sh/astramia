import Link from "next/link";
import { OFFER } from "@/core/landing/domain/content";
import {
    BUSINESS,
    formatList,
    PAYMENT_PROCESSOR,
    PROCESSOR_IS_MERCHANT_OF_RECORD,
    sellerLine,
    sellerName,
} from "../domain/business";
import {
    DATA_RETENTION,
    LEGAL_ROUTES,
    LEGAL_VERSIONS,
    PRIVACY_COMMITMENTS,
} from "../domain/policies";
import {
    Callout,
    ClauseList,
    LegalDocument,
    type LegalSection,
    LegalTable,
    SubClause,
} from "./legal-document";

const email = (
    <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
);

const SECTIONS: LegalSection[] = [
    {
        id: "responsable",
        title: "Responsable del tratamiento",
        content: (
            <ClauseList
                items={[
                    <>
                        Responsable: <strong>{sellerName()}</strong>
                    </>,
                    ...(BUSINESS.taxId ? [`RUC: ${BUSINESS.taxId}`] : []),
                    ...(BUSINESS.entityType === "company"
                        ? [`Domicilio: ${BUSINESS.registeredAddress}`]
                        : []),
                    <>Correo de privacidad: {email}</>,
                    "Oficial de protección de datos: no aplica.",
                ]}
            />
        ),
    },
    {
        id: "datos-recopilados",
        title: "Datos que recopilamos",
        content: (
            <>
                <SubClause title="Datos que nos das directamente">
                    <ClauseList
                        items={[
                            <>
                                <strong>Contacto:</strong> correo electrónico (y
                                nombre, si decides indicarlo).
                            </>,
                            <>
                                <strong>Cuenta (opcional):</strong> si guardas
                                tus lecturas en una cuenta, tu correo; si entras
                                con Google, Google nos comparte tu nombre, tu
                                correo y tu foto de perfil. No accedemos a nada
                                más de tu cuenta de Google.
                            </>,
                            <>
                                <strong>Datos de nacimiento:</strong> fecha y,
                                según la lectura, hora y lugar de nacimiento (si
                                eliges tu ciudad de la lista, también sus
                                coordenadas y su zona horaria), usados para
                                calcular tu carta astral.
                            </>,
                            <>
                                <strong>
                                    Datos de otra persona (solo en
                                    Compatibilidad):
                                </strong>{" "}
                                su fecha de nacimiento y, si la indicas, su
                                hora. No pedimos su nombre ni nada que la
                                identifique; los usamos solo para calcular su
                                carta junto a la tuya en esa lectura. Ingrésalos
                                solo si crees que esa persona no se opondría.
                            </>,
                            <>
                                <strong>Respuestas del cuestionario:</strong> lo
                                que nos cuentas sobre tu situación, tus
                                inquietudes y tus intereses.
                            </>,
                            <>
                                <strong>Conversaciones:</strong> los mensajes
                                que intercambias con el asistente durante tu
                                sesión de chat.
                            </>,
                            <>
                                <strong>Pago:</strong> monto, moneda, estado y
                                número de la transacción.{" "}
                                <strong>
                                    No recibimos ni almacenamos el número de tu
                                    tarjeta
                                </strong>
                                ; lo procesa {PAYMENT_PROCESSOR} (ver “Con quién
                                compartimos”).
                            </>,
                            <>
                                <strong>Soporte:</strong> los correos y
                                solicitudes que nos envías.
                            </>,
                        ]}
                    />
                </SubClause>
                <SubClause title="Datos que se recopilan automáticamente">
                    <ClauseList
                        items={[
                            "Dispositivo y red: dirección IP, tipo de dispositivo, sistema operativo, navegador y zona horaria.",
                            "Registros técnicos: fecha y hora de las solicitudes, errores y métricas de rendimiento.",
                            "Uso del sitio: páginas vistas, tiempo en pantalla, botones tocados, avance en el cuestionario y en la lectura, y de qué sitio o anuncio llegaste.",
                        ]}
                    />
                </SubClause>
                <Callout>
                    Tus respuestas y conversaciones pueden incluir información
                    íntima sobre tu vida afectiva. La tratamos como
                    confidencial: solo la usamos para generar tu lectura y
                    responderte en el chat. Te recomendamos no incluir datos de
                    salud, datos de terceros identificables ni información que
                    no quieras compartir.
                </Callout>
            </>
        ),
    },
    {
        id: "uso",
        title: "Para qué usamos tus datos",
        content: (
            <>
                <LegalTable
                    head={["Finalidad", "Base legal"]}
                    rows={[
                        [
                            "Generar tu lectura y operar la sesión de chat",
                            "Ejecución del contrato",
                        ],
                        [
                            "Procesar el pago y emitir comprobantes",
                            "Ejecución del contrato / obligación legal",
                        ],
                        [
                            "Atender soporte, reembolsos y reclamos",
                            "Ejecución del contrato / interés legítimo",
                        ],
                        [
                            "Enviarte avisos del servicio (acceso, pago, seguridad, cambios de políticas)",
                            "Interés legítimo",
                        ],
                        [
                            "Seguridad y prevención de fraude",
                            "Interés legítimo",
                        ],
                        [
                            "Mejorar el Servicio con datos agregados y anonimizados",
                            "Interés legítimo",
                        ],
                        [
                            "Cumplir obligaciones tributarias y legales",
                            "Obligación legal",
                        ],
                        [
                            "Comunicaciones de marketing (solo si las aceptas)",
                            "Tu consentimiento",
                        ],
                    ]}
                />
                <p>
                    <strong>
                        No usamos tus respuestas ni tus conversaciones para
                        entrenar modelos de inteligencia artificial
                    </strong>{" "}
                    sin tu consentimiento expreso. Los datos agregados o
                    anonimizados no permiten identificarte.
                </p>
            </>
        ),
    },
    {
        id: "cookies",
        title: "Cookies y tecnologías similares",
        content: (
            <>
                <LegalTable
                    head={["Tipo", "Para qué", "¿Se puede desactivar?"]}
                    rows={[
                        [
                            "Estrictamente necesarias",
                            "Mantener tu sesión y el acceso a tu lectura",
                            "No",
                        ],
                        [
                            "Funcionales",
                            "Recordar preferencias de visualización",
                            "Sí",
                        ],
                        [
                            "Medición propia",
                            "Saber cómo se usa el sitio para mejorarlo (queda en nuestros servidores)",
                            "Sí, borrando los datos del sitio en tu navegador",
                        ],
                        [
                            "Publicidad (píxel de Meta)",
                            "Medir qué anuncios en Facebook e Instagram traen visitas y compras",
                            "Sí, desde tu navegador o la configuración de anuncios de tu cuenta de Meta",
                        ],
                        [
                            "Analítica (PostHog)",
                            "Entender cómo se usa el sitio y por qué algunas personas no completan la compra; en las grabaciones se oculta lo que escribes y el texto de tu lectura",
                            "Sí, borrando los datos del sitio en tu navegador",
                        ],
                    ]}
                />
                <p>
                    Usamos el <strong>píxel de Meta</strong> (Meta Platforms)
                    para medir nuestros anuncios: registra las páginas que
                    visitas en el sitio y acciones como empezar una lectura, ver
                    el precio, iniciar un pago o completarlo, junto con tu signo
                    solar, y Meta las trata según su propia política de
                    privacidad. No le enviamos tus respuestas, tu fecha ni tu
                    hora de nacimiento, ni tus conversaciones. Si incorporamos
                    otra herramienta, actualizaremos esta política indicándola y
                    te pediremos consentimiento cuando corresponda. Puedes
                    gestionar las cookies desde la configuración de tu
                    navegador.
                </p>
                <p>
                    También usamos <strong>PostHog</strong> (PostHog, Inc.)
                    para analizar el uso del sitio: páginas vistas y acciones
                    como empezar el cuestionario, ver el precio o iniciar un
                    pago, junto con grabaciones de sesión. En las grabaciones
                    ocultamos lo que escribes en los formularios y el texto de
                    tu cuestionario, tu lectura y tu chat; no le enviamos tus
                    respuestas ni tus conversaciones. PostHog las trata según
                    su propia política de privacidad.
                </p>
            </>
        ),
    },
    {
        id: "compartir",
        title: "Con quién compartimos tus datos",
        content: (
            <>
                <p>
                    <strong>No vendemos tu información personal</strong>, ni
                    siquiera en los términos de leyes como la CCPA. Solo la
                    compartimos en estos casos:
                </p>
                <ClauseList
                    items={[
                        <>
                            <strong>Procesador de pagos:</strong>{" "}
                            {PAYMENT_PROCESSOR} procesa tu pago como{" "}
                            {PROCESSOR_IS_MERCHANT_OF_RECORD
                                ? "comerciante registrado (Merchant of Record) y procesador certificado PCI-DSS."
                                : "procesador certificado PCI-DSS."}{" "}
                            Los datos de tu tarjeta se ingresan directamente en{" "}
                            {PAYMENT_PROCESSOR} y no se almacenan en nuestros
                            servidores. {PAYMENT_PROCESSOR} trata los datos de
                            la transacción conforme a su propia política de
                            privacidad.
                        </>,
                        <>
                            <strong>Proveedores de IA:</strong> enviamos tus
                            respuestas, datos de nacimiento y mensajes a{" "}
                            {formatList(BUSINESS.aiProviders)} únicamente para
                            generar tu lectura y las respuestas del chat, bajo
                            condiciones que les impiden usarlos para entrenar
                            sus modelos.
                        </>,
                        <>
                            <strong>Búsqueda de ciudad:</strong> para ubicar tu
                            ciudad de nacimiento, enviamos el nombre que
                            escribes, sin ningún otro dato tuyo, a Open-Meteo
                            (un servicio de geocodificación).
                        </>,
                        <>
                            <strong>Infraestructura:</strong> proveedores de
                            alojamiento, base de datos y envío de correos,
                            obligados por contratos de confidencialidad.
                        </>,
                        <>
                            <strong>Publicidad:</strong> Meta Platforms recibe,
                            mediante su píxel, las páginas que visitas, si
                            empiezas una lectura o un pago y tu signo solar,
                            para medir nuestros anuncios. Nunca tus respuestas,
                            tu fecha u hora de nacimiento ni conversaciones.
                        </>,
                        <>
                            <strong>Analítica:</strong> PostHog, Inc. recibe
                            las páginas que visitas, los pasos del cuestionario
                            (sin tus respuestas) y grabaciones de sesión en las
                            que ocultamos lo que escribes y el texto de tu
                            lectura, para entender por qué algunas personas no
                            completan la compra.
                        </>,
                        <>
                            <strong>Requerimientos legales:</strong> cuando lo
                            exija la ley, una orden judicial o una autoridad
                            competente.
                        </>,
                        <>
                            <strong>Operaciones societarias:</strong> en caso de
                            fusión o adquisición, con aviso previo y manteniendo
                            estas protecciones.
                        </>,
                        <>
                            <strong>Con tu consentimiento:</strong> para
                            cualquier otro fin, solo con tu autorización expresa
                            y previa.
                        </>,
                    ]}
                />
            </>
        ),
    },
    {
        id: "seguridad",
        title: "Seguridad",
        content: (
            <>
                <ClauseList
                    items={[
                        "Cifrado en tránsito mediante HTTPS/TLS.",
                        "Contraseñas y datos sensibles almacenados cifrados o con hash.",
                        "Acceso restringido bajo el principio de mínimo privilegio y compromisos de confidencialidad.",
                        "Revisiones periódicas de seguridad y de vulnerabilidades.",
                    ]}
                />
                <p>
                    Si ocurre un incidente de seguridad que afecte tus derechos,
                    te notificaremos a ti y a la autoridad competente dentro de
                    las {PRIVACY_COMMITMENTS.breachNoticeHours} horas siguientes
                    a su detección, conforme exija la ley.
                </p>
            </>
        ),
    },
    {
        id: "conservacion",
        title: "Cuánto tiempo guardamos tus datos",
        content: (
            <LegalTable
                head={["Dato", "Plazo", "Al vencer"]}
                rows={[
                    [
                        "Lectura, respuestas y datos de nacimiento",
                        `Mientras tengas acceso; hasta ${DATA_RETENTION.readingMonthsAfterLastAccess} meses después de tu último acceso`,
                        "Eliminación o anonimización",
                    ],
                    [
                        "Transcripción del chat",
                        `${DATA_RETENTION.chatTranscriptDaysAfterSession} días después de cerrada la sesión de ${OFFER.chatHours} horas`,
                        "Eliminación",
                    ],
                    [
                        "Registros de transacciones",
                        `${DATA_RETENTION.transactionRecordYears} años (obligaciones tributarias)`,
                        "Eliminación o archivo",
                    ],
                    [
                        "Comunicaciones de soporte",
                        `${DATA_RETENTION.supportRecordYears} años`,
                        "Eliminación segura",
                    ],
                    [
                        "Registros de seguridad",
                        `${DATA_RETENTION.securityLogMonths} meses`,
                        "Eliminación segura",
                    ],
                ]}
            />
        ),
    },
    {
        id: "derechos",
        title: "Tus derechos",
        content: (
            <>
                <p>
                    Para ejercer cualquiera de estos derechos, escríbenos a{" "}
                    {email}. Respondemos en un máximo de{" "}
                    {PRIVACY_COMMITMENTS.rightsResponseBusinessDays} días
                    hábiles.
                </p>
                <LegalTable
                    head={["Derecho", "Qué significa"]}
                    rows={[
                        ["Información", "Saber qué datos tratamos y para qué"],
                        ["Acceso", "Obtener una copia de tus datos"],
                        [
                            "Rectificación",
                            "Corregir datos inexactos o incompletos",
                        ],
                        [
                            "Cancelación / supresión",
                            "Pedir que eliminemos tus datos",
                        ],
                        [
                            "Limitación",
                            "Suspender temporalmente el tratamiento en ciertos casos",
                        ],
                        [
                            "Portabilidad",
                            "Recibir tus datos en un formato legible por máquina",
                        ],
                        [
                            "Oposición",
                            "Oponerte al tratamiento basado en interés legítimo o con fines de marketing",
                        ],
                        [
                            "Retiro del consentimiento",
                            "Retirar en cualquier momento el consentimiento que nos hayas dado",
                        ],
                    ]}
                />
                <p>
                    También puedes presentar una reclamación ante la Autoridad
                    Nacional de Protección de Datos Personales del Perú
                    (Ministerio de Justicia y Derechos Humanos) o ante la
                    autoridad de protección de datos de tu país. Tratamos tus
                    datos conforme a la Ley N.º 29733, Ley de Protección de
                    Datos Personales, y su reglamento.
                </p>
            </>
        ),
    },
    {
        id: "marketing",
        title: "Marketing y cómo darte de baja",
        content: (
            <p>
                Solo te enviaremos comunicaciones promocionales (por ejemplo,
                nuevas lecturas) si lo aceptas expresamente. Puedes darte de
                baja en cualquier momento desde el enlace “Darme de baja” de
                cada correo o escribiéndonos a {email}. Darte de baja no afecta
                los avisos esenciales del servicio, como confirmaciones de pago
                o alertas de seguridad.
            </p>
        ),
    },
    {
        id: "transferencias",
        title: "Transferencias internacionales",
        content: (
            <p>
                Nuestros servidores y proveedores pueden ubicarse en{" "}
                {formatList(BUSINESS.processingRegions)}. Cuando tus datos se
                transfieren fuera de tu país, lo hacemos solo a proveedores que
                ofrecen un nivel de protección adecuado, mediante acuerdos de
                tratamiento de datos que incluyen cláusulas contractuales tipo u
                otras garantías reconocidas.
            </p>
        ),
    },
    {
        id: "menores",
        title: "Menores de edad",
        content: (
            <p>
                El Servicio está dirigido a personas de{" "}
                {PRIVACY_COMMITMENTS.minimumAge} años o más. No recopilamos a
                sabiendas datos de menores. Si crees que un menor nos dio
                información, escríbenos a {email} y la eliminaremos de
                inmediato.
            </p>
        ),
    },
    {
        id: "terceros",
        title: "Enlaces y servicios de terceros",
        content: (
            <p>
                El Servicio puede incluir enlaces o integraciones con servicios
                de terceros, como la página de pago de {PAYMENT_PROCESSOR}. Esta
                política solo cubre los datos que recopilamos directamente; te
                recomendamos revisar las políticas de esos terceros.
            </p>
        ),
    },
    {
        id: "cambios",
        title: "Cambios a esta política",
        content: (
            <p>
                Si hacemos cambios relevantes, te avisaremos por correo
                electrónico o con un aviso en el sitio al menos{" "}
                {PRIVACY_COMMITMENTS.policyChangeNoticeDays} días antes de su
                entrada en vigor, y actualizaremos la fecha de “Última
                actualización”. Esta política forma parte de nuestros{" "}
                <Link href={LEGAL_ROUTES.terms}>Términos y Condiciones</Link>.
            </p>
        ),
    },
    {
        id: "contacto",
        title: "Contacto",
        content: (
            <ClauseList
                items={[
                    <>Correo de privacidad y soporte: {email}</>,
                    `Titular: ${sellerLine()}`,
                    ...(BUSINESS.entityType === "company"
                        ? [`Domicilio: ${BUSINESS.registeredAddress}`]
                        : []),
                    `Horario de atención: ${BUSINESS.businessHours}`,
                ]}
            />
        ),
    },
];

export function PrivacyDocument() {
    const { version, updatedAt } = LEGAL_VERSIONS.privacy;
    return (
        <LegalDocument
            kicker={`${BUSINESS.brand} · Legal`}
            title="Política de Privacidad"
            version={version}
            updatedAt={updatedAt}
            intro={
                <p>
                    Te explicamos qué datos recopilamos cuando pides una
                    lectura, para qué los usamos, con quién los compartimos y
                    cómo puedes ejercer tus derechos. En corto: no vendemos tus
                    datos, no vemos tu tarjeta y no entrenamos modelos con lo
                    que nos cuentas.
                </p>
            }
            sections={SECTIONS}
        />
    );
}
