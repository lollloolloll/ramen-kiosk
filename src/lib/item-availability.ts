const KOREA_TIME_ZONE = "Asia/Seoul";
const MONDAY = 1;
const MIN_BUSINESS_HOUR = 9;
const MAX_BUSINESS_HOUR = 21;

export const BUSINESS_DAY_OPTIONS = [
  { value: 1, label: "월", disabled: true },
  { value: 2, label: "화", disabled: false },
  { value: 3, label: "수", disabled: false },
  { value: 4, label: "목", disabled: false },
  { value: 5, label: "금", disabled: false },
  { value: 6, label: "토", disabled: false },
  { value: 0, label: "일", disabled: false },
] as const;

export const BUSINESS_TIME_OPTIONS = Array.from(
  { length: MAX_BUSINESS_HOUR - MIN_BUSINESS_HOUR + 1 },
  (_, index) => `${String(MIN_BUSINESS_HOUR + index).padStart(2, "0")}:00`
);

export interface HiddenSchedule {
  isHidden: boolean;
  autoHideSchedules?: AutoHideSchedule[] | null;
}

export interface AutoHideSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function isSelectableBusinessDay(day: unknown) {
  const numericDay = Number(day);
  return (
    Number.isInteger(numericDay) &&
    numericDay >= 0 &&
    numericDay <= 6 &&
    numericDay !== MONDAY
  );
}

export function normalizeAutoHideSchedules(
  schedules: Array<Partial<AutoHideSchedule>>
) {
  return schedules
    .reduce<AutoHideSchedule[]>((validSchedules, schedule) => {
      const dayOfWeek = Number(schedule.dayOfWeek);
      const startTime = schedule.startTime;
      const endTime = schedule.endTime;

      if (
        typeof startTime !== "string" ||
        typeof endTime !== "string" ||
        !isSelectableBusinessDay(dayOfWeek) ||
        !isValidHiddenScheduleRange(startTime, endTime)
      ) {
        return validSchedules;
      }

      const normalizedSchedule = { dayOfWeek, startTime, endTime };
      const isDuplicate = validSchedules.some(
        (currentSchedule) =>
          currentSchedule.dayOfWeek === normalizedSchedule.dayOfWeek &&
          currentSchedule.startTime === normalizedSchedule.startTime &&
          currentSchedule.endTime === normalizedSchedule.endTime
      );

      if (!isDuplicate) {
        validSchedules.push(normalizedSchedule);
      }

      return validSchedules;
    }, [])
    .sort(compareAutoHideSchedules)
    .reduce<AutoHideSchedule[]>((nonOverlappingSchedules, schedule) => {
      const overlaps = nonOverlappingSchedules.some((currentSchedule) =>
        doSchedulesOverlap(currentSchedule, schedule)
      );

      if (!overlaps) {
        nonOverlappingSchedules.push(schedule);
      }

      return nonOverlappingSchedules;
    }, []);
}

export function isValidBusinessTime(time?: string | null) {
  if (!time) return false;
  return BUSINESS_TIME_OPTIONS.includes(time);
}

export function isValidHiddenScheduleRange(
  startTime?: string | null,
  endTime?: string | null
) {
  if (
    !startTime ||
    !endTime ||
    !isValidBusinessTime(startTime) ||
    !isValidBusinessTime(endTime)
  ) {
    return false;
  }

  return timeToMinutes(startTime) < timeToMinutes(endTime);
}

export function isItemAutoHiddenNow(
  schedule: HiddenSchedule,
  now: Date = new Date()
) {
  if (schedule.isHidden) return true;
  const schedules = schedule.autoHideSchedules ?? [];
  if (schedules.length === 0) {
    return false;
  }

  const current = getKoreaDateParts(now);
  const currentMinutes = current.hour * 60 + current.minute;

  return schedules.some((currentSchedule) => {
    if (currentSchedule.dayOfWeek !== current.day) return false;
    if (
      !isValidHiddenScheduleRange(
        currentSchedule.startTime,
        currentSchedule.endTime
      )
    ) {
      return false;
    }

    return (
      currentMinutes >= timeToMinutes(currentSchedule.startTime) &&
      currentMinutes < timeToMinutes(currentSchedule.endTime)
    );
  });
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function compareAutoHideSchedules(
  first: AutoHideSchedule,
  second: AutoHideSchedule
) {
  if (first.dayOfWeek !== second.dayOfWeek) {
    return first.dayOfWeek - second.dayOfWeek;
  }

  return timeToMinutes(first.startTime) - timeToMinutes(second.startTime);
}

function doSchedulesOverlap(
  first: AutoHideSchedule,
  second: AutoHideSchedule
) {
  if (first.dayOfWeek !== second.dayOfWeek) return false;

  return (
    timeToMinutes(first.startTime) < timeToMinutes(second.endTime) &&
    timeToMinutes(second.startTime) < timeToMinutes(first.endTime)
  );
}

function getKoreaDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: KOREA_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  return {
    day: weekdayToNumber(weekday),
    hour,
    minute,
  };
}

function weekdayToNumber(weekday?: string) {
  switch (weekday) {
    case "Sun":
      return 0;
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    default:
      return MONDAY;
  }
}
