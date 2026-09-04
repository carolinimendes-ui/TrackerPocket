import { and, desc, gte, lte, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, studySessionsTable } from "@workspace/db";
import {
  CreateStudySessionBody,
  CreateStudySessionResponse,
  DeleteStudySessionParams,
  GetStudySessionSummaryQueryParams,
  GetStudySessionSummaryResponse,
  ListStudySessionsQueryParams,
  ListStudySessionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getRangeStart(range: number): string {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - range + 1);
  return toDateKey(start);
}

function getTodayKey(): string {
  return toDateKey(new Date());
}

router.get("/study-sessions", async (req, res): Promise<void> => {
  const parsed = ListStudySessionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rangeStart = getRangeStart(parsed.data.range);
  const sessions = await db
    .select()
    .from(studySessionsTable)
    .where(and(gte(studySessionsTable.date, rangeStart), lte(studySessionsTable.date, getTodayKey())))
    .orderBy(desc(studySessionsTable.startedAt));

  res.json(ListStudySessionsResponse.parse(sessions));
});

router.post("/study-sessions", async (req, res): Promise<void> => {
  const parsed = CreateStudySessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [session] = await db
    .insert(studySessionsTable)
    .values({
      date: data.date.toISOString().slice(0, 10),
      description: data.description.trim(),
      category: data.category.trim(),
      durationSeconds: Math.max(1, Math.round(data.durationSeconds)),
      startedAt: data.startedAt,
      endedAt: data.endedAt,
    })
    .returning();

  res.status(201).json(CreateStudySessionResponse.parse(session));
});

router.get("/study-sessions/summary", async (req, res): Promise<void> => {
  const parsed = GetStudySessionSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const range = parsed.data.range;
  const rangeStart = getRangeStart(range);
  const sessions = await db
    .select()
    .from(studySessionsTable)
    .where(and(gte(studySessionsTable.date, rangeStart), lte(studySessionsTable.date, getTodayKey())))
    .orderBy(desc(studySessionsTable.startedAt));

  const dailyMap = new Map<string, { seconds: number; sessions: number }>();
  const start = new Date(`${rangeStart}T00:00:00Z`);
  for (let index = 0; index < range; index += 1) {
    const date = new Date(start.getTime() + index * 86_400_000);
    dailyMap.set(toDateKey(date), { seconds: 0, sessions: 0 });
  }

  const categoryMap = new Map<string, { seconds: number; sessions: number }>();
  for (const session of sessions) {
    const day = dailyMap.get(session.date) ?? { seconds: 0, sessions: 0 };
    day.seconds += session.durationSeconds;
    day.sessions += 1;
    dailyMap.set(session.date, day);

    const category = categoryMap.get(session.category) ?? { seconds: 0, sessions: 0 };
    category.seconds += session.durationSeconds;
    category.sessions += 1;
    categoryMap.set(session.category, category);
  }

  const daily = [...dailyMap.entries()].map(([date, value]) => ({ date, ...value }));
  const byCategory = [...categoryMap.entries()]
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.seconds - a.seconds);
  const totalSeconds = sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const activeDays = daily.filter((day) => day.sessions > 0).length;

  res.json(GetStudySessionSummaryResponse.parse({
    totalSeconds,
    totalSessions: sessions.length,
    activeDays,
    averageSeconds: activeDays ? Math.round(totalSeconds / activeDays) : 0,
    daily,
    byCategory,
  }));
});

router.delete("/study-sessions/:id", async (req, res): Promise<void> => {
  const parsed = DeleteStudySessionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .delete(studySessionsTable)
    .where(eq(studySessionsTable.id, parsed.data.id))
    .returning();
  if (!session) {
    res.status(404).json({ error: "Study session not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;