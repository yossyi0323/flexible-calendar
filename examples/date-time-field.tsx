import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "./ui/calendar.js";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
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
      <Label htmlFor={id} className="sr-only">
        {label} date
      </Label>
      <div className="flex gap-1">
        <Input
          id={id}
          type="text"
          value={date}
          onChange={(e) => updateDate(e.target.value)}
          placeholder="YYYY-MM-DD"
          pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
          maxLength={10}
          required
          aria-invalid={invalid}
          aria-describedby={invalid ? "event-error" : undefined}
          className="min-w-0 tabular-nums"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Choose ${label.toLowerCase()} date`}
            >
              <CalendarIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={`${id}-popover`}
            align="start"
            className="w-auto p-0"
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
      </div>
      {!allDay && (
        <>
          <Label htmlFor={`${id}-time`} className="sr-only">
            {label} time
          </Label>
          <Input
            id={`${id}-time`}
            type="text"
            inputMode="numeric"
            value={time}
            onChange={(e) => onChange(`${date}T${e.target.value}`)}
            placeholder="HH:mm"
            pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
            maxLength={5}
            required
            aria-invalid={invalid}
            aria-describedby={invalid ? "event-error" : undefined}
            className="tabular-nums"
          />
        </>
      )}
    </fieldset>
  );
}
