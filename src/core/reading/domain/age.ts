/** Whole years between a YYYY-MM-DD birth date and `today`. */
export function ageOn(birthDate: string, today: Date): number {
    const [year, month, day] = birthDate.split("-").map(Number);
    const beforeBirthday =
        today.getUTCMonth() + 1 < month ||
        (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
    return today.getUTCFullYear() - year - (beforeBirthday ? 1 : 0);
}
