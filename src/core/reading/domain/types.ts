import type { z } from "zod";
import type {
    aspectNameSchema,
    aspectSchema,
    chatMessageSchema,
    chatTurnSchema,
    createReadingSchema,
    natalChartSchema,
    natalPlacementSchema,
    placeSchema,
    quizAnswerSchema,
    readingBlockSchema,
    readingProfileSchema,
    readingSchema,
    readingSummarySchema,
    readingTopicSchema,
    skyEventSchema,
    venusOutlookSchema,
} from "./schemas";

export type ReadingTopic = z.infer<typeof readingTopicSchema>;
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type CreateReading = z.infer<typeof createReadingSchema>;
export type Reading = z.infer<typeof readingSchema>;
export type ReadingSummary = z.infer<typeof readingSummarySchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatTurn = z.infer<typeof chatTurnSchema>;
export type ReadingProfile = z.infer<typeof readingProfileSchema>;
export type NatalPlacement = z.infer<typeof natalPlacementSchema>;
export type AspectName = z.infer<typeof aspectNameSchema>;
export type Aspect = z.infer<typeof aspectSchema>;
export type NatalChart = z.infer<typeof natalChartSchema>;
export type SkyEvent = z.infer<typeof skyEventSchema>;
export type VenusOutlook = z.infer<typeof venusOutlookSchema>;
export type ReadingBlock = z.infer<typeof readingBlockSchema>;
export type Place = z.infer<typeof placeSchema>;
