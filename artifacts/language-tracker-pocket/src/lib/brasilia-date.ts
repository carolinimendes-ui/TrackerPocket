import { useEffect, useState } from 'react';

export const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

function partsFor(value: Date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: BRASILIA_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(value).map(({ type, value: partValue }) => [type, partValue]),
  );
}

export function getBrasiliaDateKey(value = new Date()) {
  const parts = partsFor(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getBrasiliaMonthKey(value = new Date()) {
  return getBrasiliaDateKey(value).slice(0, 7);
}

export function getBrasiliaGreeting(value = new Date()) {
  const hour = Number(partsFor(value).hour);
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function formatBrasiliaLongDate(value = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRASILIA_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value);
}

export function formatBrasiliaDayStamp(value = new Date()) {
  const parts = partsFor(value);
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRASILIA_TIME_ZONE,
    weekday: 'long',
  }).format(value).toUpperCase();
  return `${weekday} · ${parts.day}.${parts.month}.${parts.year}`;
}

export function formatBrasiliaDate(value: string | Date) {
  const date = typeof value === 'string' && !value.includes('T')
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRASILIA_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date).replace('.', '');
}

export function formatBrasiliaTime(value: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRASILIA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function useBrasiliaNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}