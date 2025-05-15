import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const timeZone = 'America/Bogota';

export function getColombiaDayRange(date: Date = new Date()) {
  // Convert the input date to Colombia timezone
  const zonedDate = toZonedTime(date, timeZone);

  // Get start and end of the day in Colombia timezone
  const startDay = startOfDay(zonedDate);
  const endDay = endOfDay(zonedDate);

  // These times are already in UTC internally, just with Colombia timezone representation
  // We just need to create new Date objects to get the UTC equivalents
  const startUtc = new Date(startDay);
  const endUtc = new Date(endDay);

  return { startUtc, endUtc };
}
