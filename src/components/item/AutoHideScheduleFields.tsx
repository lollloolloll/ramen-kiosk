"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AutoHideSchedule } from "@/lib/item-availability";
import {
  BUSINESS_DAY_OPTIONS,
  BUSINESS_HOUR_OPTIONS,
  BUSINESS_MINUTE_OPTIONS,
  isValidHiddenScheduleRange,
} from "@/lib/item-availability";

interface AutoHideScheduleFieldsProps {
  enabled: boolean;
  schedules: AutoHideSchedule[];
  error?: string;
  onEnabledChange: (enabled: boolean) => void;
  onSchedulesChange: (schedules: AutoHideSchedule[]) => void;
}

export function AutoHideScheduleFields({
  enabled,
  schedules,
  error,
  onEnabledChange,
  onSchedulesChange,
}: AutoHideScheduleFieldsProps) {
  const [selectedDay, setSelectedDay] = useState(2);
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("18:00");

  const addSchedule = () => {
    if (!isValidHiddenScheduleRange(startTime, endTime)) return;

    onSchedulesChange(
      [...schedules, { dayOfWeek: selectedDay, startTime, endTime }].sort(
        compareSchedules
      )
    );
  };

  const removeScheduleAt = (indexToRemove: number) => {
    onSchedulesChange(
      schedules.filter((_, scheduleIndex) => scheduleIndex !== indexToRemove)
    );
  };

  const handleEnabledChange = (nextEnabled: boolean) => {
    onEnabledChange(nextEnabled);
    if (!nextEnabled) {
      onSchedulesChange([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">자동 숨김</Label>
          <p className="text-sm text-muted-foreground">
            선택한 요일과 시간에는 키오스크에서 숨깁니다
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleEnabledChange} />
      </div>

      {enabled && (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-[96px_1fr_1fr_auto] gap-2">
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
              value={selectedDay}
              onChange={(event) => setSelectedDay(Number(event.target.value))}
            >
              {BUSINESS_DAY_OPTIONS.map((day) => (
                <option
                  key={day.value}
                  value={day.value}
                  disabled={day.disabled}
                >
                  {day.label}
                </option>
              ))}
            </select>

            <TimeSelect value={startTime} onChange={setStartTime} />

            <TimeSelect value={endTime} onChange={setEndTime} />

            <Button type="button" size="icon" onClick={addSchedule}>
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                추가된 자동 숨김 구간이 없습니다
              </p>
            ) : (
              schedules.map((schedule, index) => (
                <Badge
                  key={`${schedule.dayOfWeek}-${schedule.startTime}-${schedule.endTime}-${index}`}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {formatSchedule(schedule)}
                  <button
                    type="button"
                    className="inline-flex size-5 items-center justify-center rounded-sm hover:bg-muted"
                    onClick={() => removeScheduleAt(index)}
                    aria-label={`${formatSchedule(schedule)} 삭제`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function TimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [selectedHour, selectedMinute] = splitTime(value);
  const minuteOptions = getMinuteOptions(selectedHour);

  const handleHourChange = (hour: string) => {
    const nextMinute = getMinuteOptions(hour).includes(selectedMinute)
      ? selectedMinute
      : "00";

    onChange(formatTime(hour, nextMinute));
  };

  const handleMinuteChange = (minute: string) => {
    onChange(formatTime(selectedHour, minute));
  };

  return (
    <div className="grid grid-cols-2 gap-1">
      <select
        className="border-input bg-background h-9 w-full rounded-md border px-2 py-1 text-sm shadow-xs"
        value={selectedHour}
        onChange={(event) => handleHourChange(event.target.value)}
      >
        {BUSINESS_HOUR_OPTIONS.map((hour) => (
          <option key={hour} value={hour}>
            {hour}시
          </option>
        ))}
      </select>

      <select
        className="border-input bg-background h-9 w-full rounded-md border px-2 py-1 text-sm shadow-xs"
        value={minuteOptions.includes(selectedMinute) ? selectedMinute : "00"}
        onChange={(event) => handleMinuteChange(event.target.value)}
      >
        {minuteOptions.map((minute) => (
          <option key={minute} value={minute}>
            {minute}분
          </option>
        ))}
      </select>
    </div>
  );
}

function formatSchedule(schedule: AutoHideSchedule) {
  return `${getDayLabel(schedule.dayOfWeek)} ${schedule.startTime}~${
    schedule.endTime
  }`;
}

function getDayLabel(dayOfWeek: number) {
  return (
    BUSINESS_DAY_OPTIONS.find((day) => day.value === dayOfWeek)?.label ??
    String(dayOfWeek)
  );
}

function compareSchedules(first: AutoHideSchedule, second: AutoHideSchedule) {
  if (first.dayOfWeek !== second.dayOfWeek) {
    return first.dayOfWeek - second.dayOfWeek;
  }

  return first.startTime.localeCompare(second.startTime);
}

function splitTime(time: string) {
  const [hour = "09", minute = "00"] = time.split(":");
  return [hour, minute] as const;
}

function formatTime(hour: string, minute: string) {
  return `${hour}:${minute}`;
}

function getMinuteOptions(hour: string) {
  if (hour === BUSINESS_HOUR_OPTIONS[BUSINESS_HOUR_OPTIONS.length - 1]) {
    return ["00"];
  }

  return BUSINESS_MINUTE_OPTIONS;
}
