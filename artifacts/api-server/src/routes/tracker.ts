import { and, asc, eq, gte, lte } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, monthlySummariesTable, studiesTable, trackerSettingsTable } from "@workspace/db";
import {
  CreateStudyBody,
  CreateStudyResponse,
  DeleteStudyParams,
  GetDashboardResponse,
  GetMonthlySummaryParams,
  GetMonthlySummaryResponse,
  GetProgressQueryParams,
  GetProgressResponse,
  GetSettingsResponse,
  ListMonthlySummariesResponse,
  ListStudiesQueryParams,
  ListStudiesResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
  UpdateStudyBody,
  UpdateStudyParams,
  UpdateStudyResponse,
  UpsertMonthlySummaryBody,
  UpsertMonthlySummaryParams,
  UpsertMonthlySummaryResponse,
} from "@workspace/api-zod";
import { buildDashboard, buildMonthlySummary, buildProgress, getSettings, toMonth } from "../lib/tracker";

const router: IRouter = Router();

router.get("/studies", async (req, res): Promise<void> => {
  const parsed = ListStudiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const filters = [];
  const query = parsed.data;
  if (query.month) filters.push(eq(studiesTable.month, query.month));
  if (query.from) filters.push(gte(studiesTable.date, query.from.toISOString().slice(0, 10)));
  if (query.to) filters.push(lte(studiesTable.date, query.to.toISOString().slice(0, 10)));
  if (query.minWords !== undefined) filters.push(gte(studiesTable.newWords, query.minWords));
  if (query.maxWords !== undefined) filters.push(lte(studiesTable.newWords, query.maxWords));
  if (query.minMinutes !== undefined) filters.push(gte(studiesTable.studyMinutes, query.minMinutes));
  if (query.maxMinutes !== undefined) filters.push(lte(studiesTable.studyMinutes, query.maxMinutes));
  const studies = await db.select().from(studiesTable).where(filters.length ? and(...filters) : undefined).orderBy(asc(studiesTable.date), asc(studiesTable.id));
  res.json(ListStudiesResponse.parse(studies));
});

router.post("/studies", async (req, res): Promise<void> => {
  const parsed = CreateStudyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [study] = await db.insert(studiesTable).values({
    date: data.date.toISOString().slice(0, 10),
    month: toMonth(data.date.toISOString().slice(0, 10)),
    description: data.description,
    newWords: data.newWords,
    studyMinutes: data.studyMinutes,
  }).returning();
  res.status(201).json(CreateStudyResponse.parse(study));
});

router.patch("/studies/:id", async (req, res): Promise<void> => {
  const params = UpdateStudyParams.safeParse(req.params);
  const body = UpdateStudyBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const values = {
    ...(body.data.date ? { date: body.data.date.toISOString().slice(0, 10), month: toMonth(body.data.date.toISOString().slice(0, 10)) } : {}),
    ...(body.data.description !== undefined ? { description: body.data.description } : {}),
    ...(body.data.newWords !== undefined ? { newWords: body.data.newWords } : {}),
    ...(body.data.studyMinutes !== undefined ? { studyMinutes: body.data.studyMinutes } : {}),
    updatedAt: new Date(),
  };
  const [study] = await db.update(studiesTable).set(values).where(eq(studiesTable.id, params.data.id)).returning();
  if (!study) {
    res.status(404).json({ error: "Study not found" });
    return;
  }
  res.json(UpdateStudyResponse.parse(study));
});

router.delete("/studies/:id", async (req, res): Promise<void> => {
  const params = DeleteStudyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [study] = await db.delete(studiesTable).where(eq(studiesTable.id, params.data.id)).returning();
  if (!study) {
    res.status(404).json({ error: "Study not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  res.json(GetDashboardResponse.parse(await buildDashboard()));
});

router.get("/progress", async (req, res): Promise<void> => {
  const parsed = GetProgressQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(GetProgressResponse.parse(await buildProgress(parsed.data.range)));
});

router.get("/settings", async (_req, res): Promise<void> => {
  res.json(GetSettingsResponse.parse(await getSettings()));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const settings = await getSettings();
  const [updated] = await db.update(trackerSettingsTable).set({
    ...parsed.data,
    startDate: parsed.data.startDate.toISOString().slice(0, 10),
    updatedAt: new Date(),
  }).where(eq(trackerSettingsTable.id, settings.id)).returning();
  res.json(UpdateSettingsResponse.parse(updated));
});

router.get("/monthly-summaries", async (_req, res): Promise<void> => {
  const rows = await db.select({ month: monthlySummariesTable.month }).from(monthlySummariesTable).orderBy(asc(monthlySummariesTable.month));
  const summaries = await Promise.all(rows.map((row) => buildMonthlySummary(row.month)));
  res.json(ListMonthlySummariesResponse.parse(summaries));
});

router.get("/monthly-summaries/:month", async (req, res): Promise<void> => {
  const parsed = GetMonthlySummaryParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(GetMonthlySummaryResponse.parse(await buildMonthlySummary(parsed.data.month)));
});

router.put("/monthly-summaries/:month", async (req, res): Promise<void> => {
  const params = UpsertMonthlySummaryParams.safeParse(req.params);
  const body = UpsertMonthlySummaryBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await db.insert(monthlySummariesTable).values({
    month: params.data.month,
    reflectionGood: body.data.reflectionGood,
    reflectionImprove: body.data.reflectionImprove,
  }).onConflictDoUpdate({
    target: monthlySummariesTable.month,
    set: {
      reflectionGood: body.data.reflectionGood,
      reflectionImprove: body.data.reflectionImprove,
      updatedAt: new Date(),
    },
  });
  res.json(UpsertMonthlySummaryResponse.parse(await buildMonthlySummary(params.data.month)));
});

export default router;