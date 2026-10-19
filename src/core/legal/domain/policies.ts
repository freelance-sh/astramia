/**
 * Commercial policies shared by the legal pages and the landing, so the
 * refund window shown next to the price never drifts from the Terms.
 */

export const REFUND_POLICY = {
    /** No-questions-asked refund on a customer's first purchase. */
    firstPurchaseDays: 7,
    /** Non-delivery, technical failure or duplicate charge. */
    technicalIssueDays: 14,
    acknowledgeBusinessDays: 2,
    processingBusinessDays: "5–10",
} as const;

export const BILLING_DISPUTES = {
    responseBusinessDays: 2,
    resolutionBusinessDays: 5,
} as const;

export const DATA_RETENTION = {
    readingMonthsAfterLastAccess: 24,
    chatTranscriptDaysAfterSession: 90,
    transactionRecordYears: 5,
    supportRecordYears: 2,
    securityLogMonths: 12,
} as const;

export const PRIVACY_COMMITMENTS = {
    minimumAge: 18,
    breachNoticeHours: 72,
    rightsResponseBusinessDays: 20,
    policyChangeNoticeDays: 30,
} as const;

export const TERMS_CHANGE_NOTICE_DAYS = 30;

export const LEGAL_ROUTES = {
    terms: "/terminos",
    privacy: "/privacidad",
    refunds: "/terminos#reembolsos",
} as const;

/** Bump `version` and `updatedAt` together; keep old versions in git. */
export const LEGAL_VERSIONS = {
    terms: { version: "1.0", updatedAt: "13 de octubre de 2026" },
    privacy: { version: "1.3", updatedAt: "19 de octubre de 2026" },
} as const;
