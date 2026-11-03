import { useState } from "react";
import { Clock2Icon } from "lucide-react";
import { addDays, differenceInDays } from "../src/core/index.js";
import { Calendar } from "./ui/calendar.js";
import { Card, CardContent, CardFooter } from "./ui/card.js";
import { Field, FieldGroup, FieldLabel } from "./ui/field.js";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "./ui/input-group.js";
import { DateTimeField } from "./date-time-field.js";
import { Label } from "./ui/label.js";

interface Props {
  start: string;
  end: string;
  allDay: boolean;
  invalid: boolean;
  onChange: (start: string, end: string) => void;
}

// Based on shadcn/ui's CalendarWithTime example. Native time inputs retain
// browser time-segment editing; civil dates are converted in EventEditor.
export function DateTimePicker({
  start,
  end,
  allDay,
  invalid,
  onChange,
}: Props) {
  const [startDate = "", startTime = ""] = start.split("T");
  const [endDate = "", endTime = ""] = end.split("T");
  const [showEndDate, setShowEndDate] = useState(startDate !== endDate);
  const parts = startDate.split("-").map(Number);
  const selected = new Date(parts[0]!, parts[1]! - 1, parts[2]!, 12);
  const join = (date: string, time: string) =>
    allDay ? date : `${date}T${time}`;
  return (
    <Card
      className="mx-auto w-fit max-w-full gap-0 overflow-hidden py-0"
      id="event-schedule"
    >
      <CardContent className="p-3">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          className="p-0"
          onSelect={(day) => {
            if (!day) return;
            const date = `${String(day.getFullYear()).padStart(4, "0")}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
            let days = 0;
            try {
              days = differenceInDays(startDate, endDate);
            } catch {
              /* An incomplete end date is replaced when selecting a new date. */
            }
            onChange(join(date, startTime), join(addDays(date, days), endTime));
          }}
        />
      </CardContent>
      <CardFooter className="border-t bg-card p-4">
        <FieldGroup className="gap-4">
          {!allDay &&
            (["Start", "End"] as const).map((label) => {
              const isStart = label === "Start";
              const id = `event-${label.toLowerCase()}-time`;
              return (
                <Field key={label}>
                  <FieldLabel htmlFor={id}>{label} Time</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={id}
                      type="time"
                      step={60}
                      required
                      value={isStart ? startTime : endTime}
                      onChange={(e) =>
                        onChange(
                          isStart ? join(startDate, e.target.value) : start,
                          isStart ? end : join(endDate, e.target.value),
                        )
                      }
                      aria-invalid={invalid}
                      aria-describedby={invalid ? "event-error" : undefined}
                      className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                    <InputGroupAddon>
                      <Clock2Icon className="text-muted-foreground" />
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              );
            })}
          <Label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="event-different-end"
              className="size-4 accent-primary"
              checked={showEndDate || startDate !== endDate}
              onChange={(e) => {
                setShowEndDate(e.target.checked);
                if (!e.target.checked)
                  onChange(start, join(startDate, endTime));
              }}
            />
            Ends on another day
          </Label>
          {(showEndDate || startDate !== endDate) && (
            <DateTimeField
              id="event-end"
              label="End"
              value={endDate}
              allDay
              invalid={invalid}
              onChange={(date) => onChange(start, join(date, endTime))}
            />
          )}
        </FieldGroup>
      </CardFooter>
    </Card>
  );
}
