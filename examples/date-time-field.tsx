import { useState } from "react";
import { CalendarIcon, Clock2Icon } from "lucide-react";
import { Calendar } from "./ui/calendar.js";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover.js";
import { Button } from "./ui/button.js";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "./ui/input-group.js";
import { Label } from "./ui/label.js";

interface Props {
  id: string;
  label: string;
  value: string;
  allDay: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
}
export function DateTimeField({
  id,
  label,
  value,
  allDay,
  invalid,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [date = "", time = ""] = value.split("T");
  const updateDate = (next: string) =>
    onChange(allDay ? next : `${next}T${time}`);
  const parts = date.split("-").map(Number);
  // DayPicker receives a civil date, never the event instant in the device zone.
  const candidate = new Date(
    parts[0] ?? NaN,
    (parts[1] ?? 1) - 1,
    parts[2] ?? 1,
    12,
  );
  const selected =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    candidate.getMonth() === (parts[1] ?? 0) - 1 &&
    candidate.getDate() === parts[2]
      ? candidate
      : undefined;
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div
        className={
          allDay
            ? "grid"
            : "grid grid-cols-1 gap-2 min-[360px]:grid-cols-[max-content_max-content]"
        }
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              id={id}
              data-date={date}
              className="min-w-0 justify-start font-normal"
              aria-invalid={invalid}
              aria-label={`Choose ${label.toLowerCase()} date`}
            >
              <CalendarIcon className="text-muted-foreground" />
              <span className="truncate tabular-nums">
                {date.replaceAll("-", "/")}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={`${id}-popover`}
            align="start"
            className="w-auto max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-0"
            collisionPadding={8}
            aria-label={`${label} date picker`}
          >
            <Calendar
              mode="single"
              selected={selected}
              {...(selected ? { defaultMonth: selected } : {})}
              onSelect={(day) => {
                if (!day) return;
                updateDate(
                  `${String(day.getFullYear()).padStart(4, "0")}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
                );
                setOpen(false);
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        {!allDay && (
          <>
            <Label htmlFor={`${id}-time`} className="sr-only">
              {label} time
            </Label>
            <InputGroup className="w-auto">
              <InputGroupInput
                id={`${id}-time`}
                type="time"
                step={60}
                required
                value={time}
                onChange={(e) => onChange(`${date}T${e.target.value}`)}
                aria-invalid={invalid}
                aria-describedby={invalid ? "event-error" : undefined}
                className="w-[11ch] flex-none tabular-nums appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              />
              <InputGroupAddon>
                <Clock2Icon className="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
          </>
        )}
      </div>
    </fieldset>
  );
}
