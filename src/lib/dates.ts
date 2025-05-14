import { startOfDay, endOfDay } from "date-fns"
import { toZonedTime } from "date-fns-tz"

const timeZone = "America/Bogota"

export function getColombiaDayRange(date: Date = new Date()) {
    const zoned = toZonedTime(date, timeZone)

    const start = startOfDay(zoned)
    const end = endOfDay(zoned)

    // Convertimos la hora local de Colombia a UTC para que encaje con datos en la base
    const startUtc = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
    const endUtc = new Date(end.getTime() - end.getTimezoneOffset() * 60000)

    return { startUtc, endUtc }
}
