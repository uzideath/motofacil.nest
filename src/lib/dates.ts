import { startOfDay, endOfDay } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

const timeZone = 'America/Bogota';

export function toColombiaMidnightUtc(dateStr: string): Date {
  const localDate = new Date(dateStr);
  localDate.setHours(0, 0, 0, 0);
  return zonedTimeToUtc(localDate, timeZone);
}



export function getColombiaDayRange(date: Date = new Date()) {
  const startDayCol = startOfDay(date);
  const endDayCol = endOfDay(date);
  const startUtc = zonedTimeToUtc(startDayCol, timeZone);
  const endUtc = zonedTimeToUtc(endDayCol, timeZone);
  return { startUtc, endUtc };
}