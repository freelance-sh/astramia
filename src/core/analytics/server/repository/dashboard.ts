import "server-only";
import { type SQL, sql } from "drizzle-orm";
import { db } from "@/server/drizzle/db";

/**
 * The panel's numbers, each one a single aggregate in Postgres: only
 * totals cross the wire, never the rows behind them, so a month of
 * thousands of visitors costs a few small queries.
 *
 * Dates: `events.at` has a time zone; the older tables keep UTC without
 * one. Days are counted in Lima.
 */

const ZONE = "America/Lima";
/** A slice of time on screen longer than this is a tab left open. */
const MAX_SLICE_SECONDS = 1800;

type Row = Record<string, unknown>;

async function rows<T extends Row>(query: SQL): Promise<T[]> {
    const result = await db.execute(query);
    return result.rows as T[];
}

const num = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};
const maybe = (value: unknown): number | null =>
    value === null || value === undefined ? null : num(value);

/** A local day ("YYYY-MM-DD") for a UTC timestamp column without a zone. */
const utcDay = (column: SQL) =>
    sql`((${column} at time zone 'UTC') at time zone ${ZONE})::date`;

export interface Overview {
    visitors: number;
    quizStarters: number;
    quizFinishers: number;
    readings: number;
    paidReadings: number;
    payments: number;
    revenueCents: number;
    currency: string | null;
    aiCostUsd: number;
}

export async function overview(since: Date): Promise<Overview> {
    const [r] = await rows(sql`
        select
            (select count(distinct visitor_id) from events
                where name = 'page_view' and at >= ${since}) as visitors,
            (select count(distinct visitor_id) from events
                where name = 'quiz_start' and at >= ${since}) as quiz_starters,
            (select count(distinct visitor_id) from events
                where name = 'quiz_submit' and at >= ${since}) as quiz_finishers,
            (select count(*) from readings where created_at >= ${since}) as readings,
            (select count(*) from readings
                where created_at >= ${since} and unlocked_at is not null) as paid_readings,
            (select count(*) from orders where paid_at >= ${since}) as payments,
            (select coalesce(sum(amount_cents), 0) from orders
                where paid_at >= ${since}) as revenue_cents,
            (select max(currency) from orders where paid_at >= ${since}) as currency,
            (select coalesce(sum(cost_usd), 0) from ai_usage
                where created_at >= ${since}) as ai_cost_usd
    `);
    return {
        visitors: num(r.visitors),
        quizStarters: num(r.quiz_starters),
        quizFinishers: num(r.quiz_finishers),
        readings: num(r.readings),
        paidReadings: num(r.paid_readings),
        payments: num(r.payments),
        revenueCents: num(r.revenue_cents),
        currency: (r.currency as string | null) ?? null,
        aiCostUsd: num(r.ai_cost_usd),
    };
}

export interface ReadingFunnel {
    created: number;
    viewed: number;
    reachedDoor: number;
    clickedPay: number;
    paid: number;
    finished: number;
    chatted: number;
}

/** What happened to the readings started in the range, step by step. */
export async function readingFunnel(since: Date): Promise<ReadingFunnel> {
    const [r] = await rows(sql`
        with r as (
            select id, unlocked_at from readings where created_at >= ${since}
        ),
        e as (
            select reading_id, name from events
            where reading_id in (select id from r)
                and name in ('reading_view', 'paywall_view', 'checkout_click', 'story_end')
        )
        select
            (select count(*) from r) as created,
            (select count(distinct reading_id) from e where name = 'reading_view') as viewed,
            (select count(distinct reading_id) from e where name = 'paywall_view') as reached_door,
            (select count(distinct reading_id) from e where name = 'checkout_click') as clicked_pay,
            (select count(*) from r where unlocked_at is not null) as paid,
            (select count(distinct reading_id) from e where name = 'story_end') as finished,
            (select count(distinct reading_id) from chat_messages
                where reading_id in (select id from r) and role = 'user') as chatted
    `);
    return {
        created: num(r.created),
        viewed: num(r.viewed),
        reachedDoor: num(r.reached_door),
        clickedPay: num(r.clicked_pay),
        paid: num(r.paid),
        finished: num(r.finished),
        chatted: num(r.chatted),
    };
}

export interface TimeStats {
    readings: number;
    medianSeconds: number | null;
    averageSeconds: number | null;
}

/**
 * Seconds a reading's page was on screen, all visits added: before paying
 * (the free part) or after.
 */
export async function readingTime(
    since: Date,
    part: "free" | "paid",
): Promise<TimeStats> {
    const when =
        part === "free"
            ? sql`(r.unlocked_at is null or e.at < r.unlocked_at)`
            : sql`(r.unlocked_at is not null and e.at >= r.unlocked_at)`;
    const [r] = await rows(sql`
        select count(*) as readings,
            percentile_cont(0.5) within group (order by seconds) as median,
            avg(seconds) as average
        from (
            select e.reading_id,
                sum(least((e.props ->> 'seconds')::int, ${MAX_SLICE_SECONDS})) as seconds
            from events e join readings r on r.id = e.reading_id
            where e.name = 'page_time' and r.created_at >= ${since} and ${when}
            group by e.reading_id
        ) t
    `);
    return {
        readings: num(r.readings),
        medianSeconds: maybe(r.median),
        averageSeconds: maybe(r.average),
    };
}

export interface ChatStats {
    paidReadings: number;
    chatted: number;
    averageQuestions: number | null;
    medianQuestions: number | null;
    /** How many readings asked that many questions: 0, 1, 2–3, 4–9, 10+. */
    buckets: { label: string; readings: number }[];
}

export async function chatStats(since: Date): Promise<ChatStats> {
    const [r] = await rows(sql`
        select count(*) as paid,
            count(*) filter (where n > 0) as chatted,
            avg(n) filter (where n > 0) as average,
            percentile_cont(0.5) within group (order by n) filter (where n > 0) as median,
            count(*) filter (where n = 0) as b0,
            count(*) filter (where n = 1) as b1,
            count(*) filter (where n between 2 and 3) as b2,
            count(*) filter (where n between 4 and 9) as b4,
            count(*) filter (where n >= 10) as b10
        from (
            select r.id, count(m.id) filter (where m.role = 'user') as n
            from readings r left join chat_messages m on m.reading_id = r.id
            where r.created_at >= ${since} and r.unlocked_at is not null
            group by r.id
        ) t
    `);
    return {
        paidReadings: num(r.paid),
        chatted: num(r.chatted),
        averageQuestions: maybe(r.average),
        medianQuestions: maybe(r.median),
        buckets: [
            { label: "Ninguna", readings: num(r.b0) },
            { label: "1", readings: num(r.b1) },
            { label: "2–3", readings: num(r.b2) },
            { label: "4–9", readings: num(r.b4) },
            { label: "10 o más", readings: num(r.b10) },
        ],
    };
}

export interface Latency {
    name: string;
    count: number;
    p50: number | null;
    p90: number | null;
}

/** How long the server took: the free part, the paid one, a chat reply. */
export async function latencies(since: Date): Promise<Latency[]> {
    const found = await rows(sql`
        select name, count(*) as count,
            percentile_cont(0.5) within group (order by (props ->> 'ms')::float) as p50,
            percentile_cont(0.9) within group (order by (props ->> 'ms')::float) as p90
        from events
        where name in ('reading_created', 'content_written', 'chat_reply')
            and at >= ${since}
        group by name
    `);
    return found.map((r) => ({
        name: String(r.name),
        count: num(r.count),
        p50: maybe(r.p50),
        p90: maybe(r.p90),
    }));
}

export interface Day {
    day: string;
    visitors: number;
    readings: number;
    payments: number;
}

/** One row per day in Lima, the last `days` of them, zeros included. */
export async function daily(days: number): Promise<Day[]> {
    const from = new Date(Date.now() - (days + 1) * 24 * 60 * 60 * 1000);
    const found = await rows(sql`
        with days as (
            select generate_series(
                (now() at time zone ${ZONE})::date - ${days - 1}::int,
                (now() at time zone ${ZONE})::date,
                interval '1 day'
            )::date as day
        ),
        v as (
            select (at at time zone ${ZONE})::date as day,
                count(distinct visitor_id) as n
            from events where name = 'page_view' and at >= ${from}
            group by 1
        ),
        r as (
            select ${utcDay(sql`created_at`)} as day, count(*) as n
            from readings where created_at >= ${from} group by 1
        ),
        p as (
            select ${utcDay(sql`paid_at`)} as day, count(*) as n
            from orders where paid_at >= ${from} group by 1
        )
        select to_char(days.day, 'YYYY-MM-DD') as day,
            coalesce(v.n, 0) as visitors,
            coalesce(r.n, 0) as readings,
            coalesce(p.n, 0) as payments
        from days
            left join v on v.day = days.day
            left join r on r.day = days.day
            left join p on p.day = days.day
        order by days.day
    `);
    return found.map((r) => ({
        day: String(r.day),
        visitors: num(r.visitors),
        readings: num(r.readings),
        payments: num(r.payments),
    }));
}

/** How often each option was picked, in readings started in the range. */
export async function choiceCounts(
    since: Date,
): Promise<{ question: string; option: string; count: number }[]> {
    const found = await rows(sql`
        select a ->> 'questionId' as question, a ->> 'optionId' as option,
            count(*) as count
        from readings r, jsonb_array_elements(r.answers) a
        where r.created_at >= ${since} and a ? 'optionId'
        group by 1, 2
    `);
    return found.map((r) => ({
        question: String(r.question),
        option: String(r.option),
        count: num(r.count),
    }));
}

/** For each ranking question: how often each option landed at each place. */
export async function rankCounts(
    since: Date,
): Promise<
    { question: string; option: string; place: number; count: number }[]
> {
    const found = await rows(sql`
        select a ->> 'questionId' as question, x.option, x.place,
            count(*) as count
        from readings r,
            jsonb_array_elements(r.answers) a,
            jsonb_array_elements_text(a -> 'ranking') with ordinality x(option, place)
        where r.created_at >= ${since} and a ? 'ranking'
        group by 1, 2, 3
    `);
    return found.map((r) => ({
        question: String(r.question),
        option: String(r.option),
        place: num(r.place),
        count: num(r.count),
    }));
}

/** Quiz steps: how many visitors answered each one, and who got to the end. */
export async function quizSteps(
    since: Date,
): Promise<{ step: number; visitors: number }[]> {
    const found = await rows(sql`
        select (props ->> 'step')::int as step,
            count(distinct visitor_id) as visitors
        from events
        -- The steps are the love quiz's; the others have their own.
        where name = 'quiz_answer' and at >= ${since}
            and coalesce(props ->> 'topic', 'amor') = 'amor'
        group by 1 order by 1
    `);
    return found.map((r) => ({
        step: num(r.step),
        visitors: num(r.visitors),
    }));
}

/**
 * How far each reading was read, as a share of its story (lengths differ):
 * for the free part and, once paid, the whole one.
 */
export async function storyReach(
    since: Date,
): Promise<{ paid: boolean; tenth: number; readings: number }[]> {
    const found = await rows(sql`
        select paid, ceil(reach * 10)::int as tenth, count(*) as readings
        from (
            select e.reading_id, coalesce((e.props ->> 'paid')::boolean, false) as paid,
                max((e.props ->> 'step')::float / nullif((e.props ->> 'of')::float, 0)) as reach
            from events e join readings r on r.id = e.reading_id
            where e.name = 'story_step' and r.created_at >= ${since}
            group by 1, 2
        ) t
        where reach is not null
        group by 1, 2
    `);
    return found.map((r) => ({
        paid: Boolean(r.paid),
        tenth: num(r.tenth),
        readings: num(r.readings),
    }));
}

export interface Returning {
    visitors: number;
    returningVisitors: number;
    readers: number;
    repeatReaders: number;
    buyers: number;
    repeatBuyers: number;
}

/**
 * Who came back: visitors seen on more than one day, people with more than
 * one reading, buyers with more than one purchase (ever, for those active
 * in the range).
 */
export async function returning(since: Date): Promise<Returning> {
    const [r] = await rows(sql`
        with active as (
            select distinct visitor_id from events
            where name = 'page_view' and at >= ${since}
        ),
        v as (
            select e.visitor_id,
                count(distinct (e.at at time zone ${ZONE})::date) as days
            from events e join active a on a.visitor_id = e.visitor_id
            where e.name = 'page_view'
            group by 1
        ),
        u as (
            select user_id, count(*) as n from readings
            where user_id in (select user_id from readings where created_at >= ${since})
            group by 1
        ),
        b as (
            select user_id, count(*) as n from orders
            where paid_at is not null
                and user_id in (select user_id from orders where paid_at >= ${since})
            group by 1
        )
        select
            (select count(*) from v) as visitors,
            (select count(*) from v where days > 1) as returning_visitors,
            (select count(*) from u) as readers,
            (select count(*) from u where n > 1) as repeat_readers,
            (select count(*) from b) as buyers,
            (select count(*) from b where n > 1) as repeat_buyers
    `);
    return {
        visitors: num(r.visitors),
        returningVisitors: num(r.returning_visitors),
        readers: num(r.readers),
        repeatReaders: num(r.repeat_readers),
        buyers: num(r.buyers),
        repeatBuyers: num(r.repeat_buyers),
    };
}

/** Where visitors came from: the campaign in their link, or the site. */
export async function sources(
    since: Date,
): Promise<{ source: string; visitors: number }[]> {
    const found = await rows(sql`
        select coalesce(props ->> 'utm_source', props ->> 'ref', 'Directo') as source,
            count(distinct visitor_id) as visitors
        from events
        where name = 'page_view' and at >= ${since}
        group by 1 order by 2 desc limit 10
    `);
    return found.map((r) => ({
        source: String(r.source),
        visitors: num(r.visitors),
    }));
}

export interface CampaignFunnel {
    source: string;
    campaign: string;
    ad: string;
    visitors: number;
    started: number;
    dated: number;
    priced: number;
    checkout: number;
    paid: number;
}

/**
 * The funnel per ad, from the links' UTMs (utm_source, utm_campaign,
 * utm_content): each visitor counts for the first one they came by, and for
 * every step they reached afterwards, in this range.
 */
export async function campaigns(since: Date): Promise<CampaignFunnel[]> {
    const found = await rows(sql`
        with touch as (
            select distinct on (visitor_id) visitor_id,
                coalesce(props ->> 'utm_source', '') as source,
                coalesce(props ->> 'utm_campaign', '') as campaign,
                coalesce(props ->> 'utm_content', '') as ad
            from events
            where name = 'page_view' and at >= ${since}
                and coalesce(props ->> 'utm_source', props ->> 'utm_campaign') is not null
            order by visitor_id, at
        ),
        reached as (
            select e.visitor_id,
                bool_or(e.name = 'quiz_start') as started,
                bool_or(e.name = 'quiz_submit') as dated,
                bool_or(e.name = 'paywall_view') as priced,
                bool_or(e.name = 'checkout_click') as checkout,
                bool_or(r.unlocked_at is not null) as paid
            from events e
            left join readings r on r.id = e.reading_id
            where e.at >= ${since} and e.visitor_id in (select visitor_id from touch)
            group by e.visitor_id
        )
        select t.source, t.campaign, t.ad, count(*) as visitors,
            count(*) filter (where r.started) as started,
            count(*) filter (where r.dated) as dated,
            count(*) filter (where r.priced) as priced,
            count(*) filter (where r.checkout) as checkout,
            count(*) filter (where r.paid) as paid
        from touch t join reached r using (visitor_id)
        group by 1, 2, 3 order by visitors desc limit 20
    `);
    return found.map((r) => ({
        source: String(r.source),
        campaign: String(r.campaign),
        ad: String(r.ad),
        visitors: num(r.visitors),
        started: num(r.started),
        dated: num(r.dated),
        priced: num(r.priced),
        checkout: num(r.checkout),
        paid: num(r.paid),
    }));
}

/** Visitors on a touch screen (phones, tablets) against the rest. */
export async function devices(
    since: Date,
): Promise<{ touch: number; other: number }> {
    const [r] = await rows(sql`
        select count(distinct visitor_id) filter (where (props ->> 'touch')::boolean) as touch,
            count(distinct visitor_id) filter (where not coalesce((props ->> 'touch')::boolean, false)) as other
        from events where name = 'page_view' and at >= ${since}
    `);
    return { touch: num(r.touch), other: num(r.other) };
}

/** A named event's most frequent value of one prop: buttons, errors. */
export async function topValues(
    since: Date,
    name: string,
    prop: string,
    limit = 12,
): Promise<{ value: string; count: number; visitors: number }[]> {
    const found = await rows(sql`
        select props ->> ${prop} as value, count(*) as count,
            count(distinct visitor_id) as visitors
        from events
        where name = ${name} and at >= ${since} and props ->> ${prop} <> ''
        group by 1 order by 2 desc limit ${limit}
    `);
    return found.map((r) => ({
        value: String(r.value),
        count: num(r.count),
        visitors: num(r.visitors),
    }));
}

export interface Costs {
    totalUsd: number;
    perReadingUsd: number | null;
    perPaidReadingUsd: number | null;
    byPurpose: { purpose: string; usd: number; calls: number }[];
}

/** What the AI cost: in all, per reading, per paid reading, per task. */
export async function costs(since: Date): Promise<Costs> {
    const [r] = await rows(sql`
        with c as (
            select u.reference_id, sum(u.cost_usd) as usd,
                bool_or(r.unlocked_at is not null) as paid
            from ai_usage u join readings r on r.id = u.reference_id
            where r.created_at >= ${since}
            group by 1
        )
        select (select coalesce(sum(cost_usd), 0) from ai_usage
                where created_at >= ${since}) as total,
            (select avg(usd) from c) as per_reading,
            (select avg(usd) from c where paid) as per_paid
    `);
    const purposes = await rows(sql`
        select purpose, coalesce(sum(cost_usd), 0) as usd, count(*) as calls
        from ai_usage where created_at >= ${since}
        group by 1 order by 2 desc
    `);
    return {
        totalUsd: num(r.total),
        perReadingUsd: maybe(r.per_reading),
        perPaidReadingUsd: maybe(r.per_paid),
        byPurpose: purposes.map((p) => ({
            purpose: String(p.purpose),
            usd: num(p.usd),
            calls: num(p.calls),
        })),
    };
}

export interface ConversationSummary {
    readingId: string;
    startedAt: string;
    lastAt: string;
    sunSign: string;
    questions: number;
    firstQuestion: string;
}

/** Readings with a chat, the latest conversation first. */
export async function conversations(
    since: Date,
    limit: number,
    offset: number,
): Promise<{ total: number; items: ConversationSummary[] }> {
    const found = await rows(sql`
        select r.id, r.sun_sign,
            min(m.created_at) as started_at, max(m.created_at) as last_at,
            count(*) filter (where m.role = 'user') as questions,
            (array_agg(m.content order by m.created_at) filter (where m.role = 'user'))[1] as first_question,
            count(*) over () as total
        from readings r join chat_messages m on m.reading_id = r.id
        group by r.id
        having max(m.created_at) >= ${since}
        order by last_at desc
        limit ${limit} offset ${offset}
    `);
    return {
        total: num(found[0]?.total),
        items: found.map((r) => ({
            readingId: String(r.id),
            startedAt: new Date(String(r.started_at)).toISOString(),
            lastAt: new Date(String(r.last_at)).toISOString(),
            sunSign: String(r.sun_sign),
            questions: num(r.questions),
            firstQuestion: String(r.first_question ?? ""),
        })),
    };
}

export interface ReadingDetail {
    id: string;
    createdAt: string;
    unlockedAt: string | null;
    topic: string;
    sunSign: string;
    birthDate: string;
    birthTime: string | null;
    birthPlace: string | null;
    answers: unknown;
    /** What the reading said: the free scenes, and the paid ones once written. */
    teaser: string;
    content: string | null;
    anonymous: boolean;
    messages: { role: string; content: string; at: string }[];
    timeline: { name: string; at: string; props: unknown }[];
}

/** One reading as the team needs it: answers, the chat, and its events. */
export async function readingDetail(id: string): Promise<ReadingDetail | null> {
    const [r] = await rows(sql`
        select r.id, r.created_at, r.unlocked_at, r.topic, r.sun_sign,
            r.birth_date, r.birth_time, r.birth_place, r.answers,
            r.teaser, r.content, coalesce(u.is_anonymous, true) as anonymous
        from readings r left join "user" u on u.id = r.user_id
        where r.id = ${id}
    `);
    if (!r) return null;
    const [messages, timeline] = await Promise.all([
        rows(sql`
            select role, content, created_at from chat_messages
            where reading_id = ${id} order by created_at
        `),
        rows(sql`
            select name, at, props from events
            where reading_id = ${id} order by at limit 500
        `),
    ]);
    const iso = (value: unknown) => new Date(String(value)).toISOString();
    return {
        id: String(r.id),
        createdAt: iso(r.created_at),
        unlockedAt: r.unlocked_at ? iso(r.unlocked_at) : null,
        topic: String(r.topic),
        sunSign: String(r.sun_sign),
        birthDate: String(r.birth_date),
        birthTime: (r.birth_time as string | null) ?? null,
        birthPlace: (r.birth_place as string | null) ?? null,
        answers: r.answers,
        teaser: String(r.teaser ?? ""),
        content: (r.content as string | null) ?? null,
        anonymous: Boolean(r.anonymous),
        messages: messages.map((m) => ({
            role: String(m.role),
            content: String(m.content),
            at: iso(m.created_at),
        })),
        timeline: timeline.map((e) => ({
            name: String(e.name),
            at: iso(e.at),
            props: e.props,
        })),
    };
}

/**
 * Every conversation active since `since`, one object per reading with its
 * answers and messages, a page at a time (oldest reading first).
 */
export async function conversationsPage(
    since: Date,
    after: string | null,
    limit: number,
): Promise<Record<string, unknown>[]> {
    return rows(sql`
        select r.id as reading_id, r.created_at, r.unlocked_at, r.topic,
            r.sun_sign, r.birth_date, r.birth_time, r.birth_place, r.answers,
            r.teaser, r.content,
            json_agg(json_build_object('role', m.role, 'content', m.content,
                'at', m.created_at) order by m.created_at) as messages
        from readings r join chat_messages m on m.reading_id = r.id
        where (${after}::text is null or r.id > ${after})
        group by r.id
        having max(m.created_at) >= ${since}
        order by r.id
        limit ${limit}
    `);
}

/** Raw events since `since`, a page at a time, by id. */
export async function eventsPage(
    since: Date,
    afterId: number,
    limit: number,
): Promise<Record<string, unknown>[]> {
    return rows(sql`
        select id, at, name, visitor_id, session_id, user_id, reading_id,
            path, props
        from events
        where at >= ${since} and id > ${afterId}
        order by id
        limit ${limit}
    `);
}
