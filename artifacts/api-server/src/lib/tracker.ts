import { asc, eq } from "drizzle-orm";
import { db, monthlySummariesTable, studiesTable, trackerSettingsTable } from "@workspace/db";

const CAIZ_LEVELS = [
  { name: "Viajante", threshold: 1500 },
  { name: "Conexão", threshold: 3000 },
  { name: "Negócios", threshold: 5000 },
  { name: "Acadêmico", threshold: 10000 },
  { name: "Maestria", threshold: 20000 },
] as const;

export function toMonth(date: string): string {
  return date.slice(0, 7);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getSettings() {
  const [existing] = await db.select().from(trackerSettingsTable).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(trackerSettingsTable)
    .values({
      language: "Inglês",
      dailyGoal: 12,
      vocabularyGoal: 6000,
      initialVocabulary: 4242,
      startDate: "2026-06-01",
      darkMode: false,
    })
    .returning();
  return created;
}

export function calculateStreaks(studies: Array<{ date: string }>): {
  current: number;
  best: number;
} {
  const uniqueDates = [...new Set(studies.map((study) => study.date))].sort();
  if (uniqueDates.length === 0) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = new Date(`${uniqueDates[index - 1]}T00:00:00Z`);
    const current = new Date(`${uniqueDates[index]}T00:00:00Z`);
    const gap = Math.round((current.getTime() - previous.getTime()) / 86_400_000);
    run = gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const today = toIsoDate(new Date());
  let current = 0;
  let cursor = uniqueDates.length - 1;
  if (uniqueDates[cursor] === today) {
    current = 1;
    while (cursor > 0) {
      const latest = new Date(`${uniqueDates[cursor]}T00:00:00Z`);
      const previous = new Date(`${uniqueDates[cursor - 1]}T00:00:00Z`);
      if (Math.round((latest.getTime() - previous.getTime()) / 86_400_000) !== 1) break;
      current += 1;
      cursor -= 1;
    }
  }

  return { current, best };
}

export async function getAllStudies() {
  return db.select().from(studiesTable).orderBy(asc(studiesTable.date), asc(studiesTable.id));
}

export async function buildDashboard() {
  const [settings, studies] = await Promise.all([getSettings(), getAllStudies()]);
  const totalWords = studies.reduce((sum, study) => sum + study.newWords, 0);
  const currentVocabulary = settings.initialVocabulary + totalWords;
  const studyDates = new Set(studies.map((study) => study.date));
  const today = toIsoDate(new Date());
  const wordsToday = studies.filter((study) => study.date === today).reduce((sum, study) => sum + study.newWords, 0);
  const minutesToday = studies.filter((study) => study.date === today).reduce((sum, study) => sum + study.studyMinutes, 0);
  const totalMinutes = studies.reduce((sum, study) => sum + study.studyMinutes, 0);
  const { current, best } = calculateStreaks(studies);
  const averageWords = studyDates.size > 0 ? Number((totalWords / studyDates.size).toFixed(1)) : 0;
  const remainingVocabulary = Math.max(settings.vocabularyGoal - currentVocabulary, 0);
  const progressPercent = Math.min(Number(((currentVocabulary / settings.vocabularyGoal) * 100).toFixed(1)), 100);
  const next = CAIZ_LEVELS.find((level) => level.threshold > currentVocabulary) ?? CAIZ_LEVELS[CAIZ_LEVELS.length - 1];
  const estimatedCompletionDate =
    averageWords > 0 && remainingVocabulary > 0
      ? toIsoDate(new Date(Date.now() + Math.ceil(remainingVocabulary / averageWords) * 86_400_000))
      : null;

  return {
    currentVocabulary,
    vocabularyGoal: settings.vocabularyGoal,
    remainingVocabulary,
    progressPercent,
    dailyGoal: settings.dailyGoal,
    wordsToday,
    minutesToday,
    totalMinutes,
    currentStreak: current,
    bestStreak: best,
    studyDays: studyDates.size,
    averageWords,
    estimatedCompletionDate,
    nextMilestone: next.threshold,
    nextMilestoneLabel: next.name,
    wordsToMilestone: Math.max(next.threshold - currentVocabulary, 0),
    dailyGoalReached: wordsToday >= settings.dailyGoal,
  };
}

export async function buildProgress(range: number) {
  const [settings, studies] = await Promise.all([getSettings(), getAllStudies()]);
  const byDate = new Map<string, { newWords: number; studyMinutes: number }>();
  for (const study of studies) {
    const previous = byDate.get(study.date) ?? { newWords: 0, studyMinutes: 0 };
    byDate.set(study.date, {
      newWords: previous.newWords + study.newWords,
      studyMinutes: previous.studyMinutes + study.studyMinutes,
    });
  }

  const daily: Array<{ date: string; newWords: number; studyMinutes: number; vocabulary: number }> = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - range + 1);
  let vocabulary = settings.initialVocabulary;
  for (const study of studies) {
    if (study.date < toIsoDate(start)) vocabulary += study.newWords;
  }
  for (let index = 0; index < range; index += 1) {
    const date = new Date(start.getTime() + index * 86_400_000);
    const dateString = toIsoDate(date);
    const entry = byDate.get(dateString) ?? { newWords: 0, studyMinutes: 0 };
    vocabulary += entry.newWords;
    daily.push({ date: dateString, ...entry, vocabulary });
  }

  const monthlyMap = new Map<string, { newWords: number; studyMinutes: number; dates: Set<string> }>();
  for (const study of studies) {
    const entry = monthlyMap.get(study.month) ?? { newWords: 0, studyMinutes: 0, dates: new Set<string>() };
    entry.newWords += study.newWords;
    entry.studyMinutes += study.studyMinutes;
    entry.dates.add(study.date);
    monthlyMap.set(study.month, entry);
  }
  const monthly = [...monthlyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({
    month,
    newWords: value.newWords,
    studyMinutes: value.studyMinutes,
    studyDays: value.dates.size,
  }));

  const currentVocabulary = settings.initialVocabulary + studies.reduce((sum, study) => sum + study.newWords, 0);
  const caiz = CAIZ_LEVELS.map((level, index) => ({
    name: level.name,
    threshold: level.threshold,
    status: (currentVocabulary >= level.threshold ? "completed" : index === CAIZ_LEVELS.findIndex((item) => item.threshold > currentVocabulary) ? "current" : "upcoming") as "completed" | "current" | "upcoming",
  }));
  return { daily, monthly, caiz };
}

export async function buildMonthlySummary(month: string) {
  const [studies, reflection] = await Promise.all([
    db.select().from(studiesTable).where(eq(studiesTable.month, month)),
    db.select().from(monthlySummariesTable).where(eq(monthlySummariesTable.month, month)).limit(1),
  ]);
  const dates = new Set(studies.map((study) => study.date));
  const totalWords = studies.reduce((sum, study) => sum + study.newWords, 0);
  const totalMinutes = studies.reduce((sum, study) => sum + study.studyMinutes, 0);
  const streaks = calculateStreaks(studies);
  return {
    month,
    totalWords,
    totalMinutes,
    studyDays: dates.size,
    averageWords: dates.size ? Number((totalWords / dates.size).toFixed(1)) : 0,
    averageMinutes: dates.size ? Number((totalMinutes / dates.size).toFixed(1)) : 0,
    bestStreak: streaks.best,
    reflectionGood: reflection[0]?.reflectionGood ?? "",
    reflectionImprove: reflection[0]?.reflectionImprove ?? "",
    updatedAt: reflection[0]?.updatedAt ?? new Date(),
  };
}