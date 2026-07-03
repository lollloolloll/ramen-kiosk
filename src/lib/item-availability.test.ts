import test from "node:test";
import assert from "node:assert/strict";
import {
  BUSINESS_DAY_OPTIONS,
  BUSINESS_TIME_OPTIONS,
  isItemAutoHiddenNow,
  normalizeAutoHideSchedules,
} from "./item-availability.ts";

test("manual hidden state stays hidden regardless of automatic schedule", () => {
  const now = new Date("2026-07-07T03:00:00.000Z"); // Tue 12:00 KST

  assert.equal(
    isItemAutoHiddenNow(
      {
        isHidden: true,
        autoHideSchedules: [
          { dayOfWeek: 2, startTime: "12:00", endTime: "18:00" },
        ],
      },
      now
    ),
    true
  );
});

test("automatic schedule hides only inside selected day and time window", () => {
  const schedule = {
    isHidden: false,
    autoHideSchedules: [
      { dayOfWeek: 2, startTime: "12:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "14:00", endTime: "17:00" },
    ],
  };

  assert.equal(
    isItemAutoHiddenNow(schedule, new Date("2026-07-07T02:59:00.000Z")),
    false
  );
  assert.equal(
    isItemAutoHiddenNow(schedule, new Date("2026-07-07T03:00:00.000Z")),
    true
  );
  assert.equal(
    isItemAutoHiddenNow(schedule, new Date("2026-07-07T09:00:00.000Z")),
    false
  );
});

test("monday cannot be selected for automatic hide schedules", () => {
  assert.deepEqual(
    normalizeAutoHideSchedules([
      { dayOfWeek: 1, startTime: "12:00", endTime: "18:00" },
      { dayOfWeek: 2, startTime: "12:00", endTime: "18:00" },
      { dayOfWeek: 6, startTime: "12:00", endTime: "18:00" },
    ]).map((schedule) => schedule.dayOfWeek),
    [2, 6]
  );
  assert.equal(BUSINESS_DAY_OPTIONS.find((day) => day.value === 1)?.disabled, true);
});

test("different weekdays can use different hide windows", () => {
  const schedule = {
    isHidden: false,
    autoHideSchedules: [
      { dayOfWeek: 2, startTime: "12:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "14:00", endTime: "17:00" },
    ],
  };

  assert.equal(
    isItemAutoHiddenNow(schedule, new Date("2026-07-08T04:59:00.000Z")),
    false
  );
  assert.equal(
    isItemAutoHiddenNow(schedule, new Date("2026-07-08T05:00:00.000Z")),
    true
  );
});

test("same weekday can have multiple non-overlapping hide windows", () => {
  const schedules = normalizeAutoHideSchedules([
    { dayOfWeek: 2, startTime: "12:00", endTime: "13:00" },
    { dayOfWeek: 2, startTime: "15:00", endTime: "18:00" },
  ]);

  assert.deepEqual(schedules, [
    { dayOfWeek: 2, startTime: "12:00", endTime: "13:00" },
    { dayOfWeek: 2, startTime: "15:00", endTime: "18:00" },
  ]);
});

test("overlapping hide windows on the same weekday are ignored", () => {
  const schedules = normalizeAutoHideSchedules([
    { dayOfWeek: 2, startTime: "12:00", endTime: "15:00" },
    { dayOfWeek: 2, startTime: "14:00", endTime: "18:00" },
    { dayOfWeek: 2, startTime: "15:00", endTime: "18:00" },
  ]);

  assert.deepEqual(schedules, [
    { dayOfWeek: 2, startTime: "12:00", endTime: "15:00" },
    { dayOfWeek: 2, startTime: "15:00", endTime: "18:00" },
  ]);
});

test("time options are limited to 09:00 through 21:00", () => {
  assert.equal(BUSINESS_TIME_OPTIONS[0], "09:00");
  assert.equal(BUSINESS_TIME_OPTIONS.at(-1), "21:00");
});
