import { addDays, differenceInDays } from "../src/core/index.js";
import { DateTimeField } from "./date-time-field.js";

interface Props {
  start: string;
  end: string;
  allDay: boolean;
  invalid: boolean;
  onChange: (start: string, end: string) => void;
}

export function DateTimePicker({
  start,
  end,
  allDay,
  invalid,
  onChange,
}: Props) {
  return (
    <div id="event-schedule" className="grid gap-4">
      <DateTimeField
        id="event-start"
        label="Start"
        value={start}
        allDay={allDay}
        invalid={invalid}
        onChange={(next) => {
          // Moving the start date carries the end date by the same number of days.
          const days = differenceInDays(start.slice(0, 10), next.slice(0, 10));
          onChange(
            next,
            days ? addDays(end.slice(0, 10), days) + end.slice(10) : end,
          );
        }}
      />
      <DateTimeField
        id="event-end"
        label="End"
        value={end}
        allDay={allDay}
        invalid={invalid}
        onChange={(next) => onChange(start, next)}
      />
    </div>
  );
}
