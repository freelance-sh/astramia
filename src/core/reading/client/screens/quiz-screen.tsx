import { QUIZZES } from "@/core/reading/domain/quizzes";
import type { ReadingTopic } from "@/core/reading/domain/types";
import { QuizFlow } from "../components/quiz-flow";
import { ReadingShell } from "./reading-shell";

export function QuizScreen({
    topic,
    knownBirthDay,
}: {
    topic: ReadingTopic;
    knownBirthDay?: { day: number; month: number };
}) {
    return (
        <ReadingShell>
            <QuizFlow
                topic={topic}
                questions={QUIZZES[topic]}
                knownBirthDay={knownBirthDay}
            />
        </ReadingShell>
    );
}
