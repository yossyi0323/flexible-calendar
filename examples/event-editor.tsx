import { useState, type FormEvent } from "react";
import { Temporal } from "@js-temporal/polyfill";
import {
  addDays,
  atMinute,
  dateKey,
  zoned,
  type CalendarEvent,
  type Resource,
} from "../src/core/index.js";
import { DateTimePicker } from "./date-time-picker.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import { Label } from "./ui/label.js";
import { NativeSelect, NativeSelectOption } from "./ui/native-select.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog.js";

interface Props {
  event: CalendarEvent;
  timeZone: string;
  resources: readonly Resource[];
  isNew: boolean;
  onSave: (event: CalendarEvent) => void;
  onDelete: () => void;
  onClose: () => void;
  onRestoreFocus: () => void;
}
export function EventEditor({
  event,
  timeZone,
  resources,
  isNew,
  onSave,
  onDelete,
  onClose,
  onRestoreFocus,
}: Props) {
  const format = (date: Date) =>
    zoned(date, timeZone)
      .toPlainDateTime()
      .toString({ smallestUnit: "minute" });
  const [title, setTitle] = useState(event.title);
  const [allDay, setAllDay] = useState(!!event.allDay);
  const [start, setStart] = useState(
    event.allDay ? dateKey(event.start, timeZone) : format(event.start),
  );
  // Date-only end dates are inclusive in the editor; the public event end stays exclusive.
  const [end, setEnd] = useState(
    event.allDay
      ? dateKey(new Date(+event.end - 1), timeZone)
      : format(event.end),
  );
  const [resource, setResource] = useState(
    typeof event.resourceId === "string" ? event.resourceId : "",
  );
  const [error, setError] = useState("");
  function toggleAllDay(checked: boolean) {
    if (checked) {
      setStart(start.slice(0, 10));
      setEnd(end.slice(0, 10));
    } else {
      setStart(start + "T09:00");
      setEnd(end + "T10:00");
    }
    setAllDay(checked);
    setError("");
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Enter a title.");
      return;
    }
    try {
      const parse = (value: string, original: Date) =>
        value === format(original)
          ? original
          : new Date(
              Temporal.PlainDateTime.from(value).toZonedDateTime(timeZone, {
                disambiguation: "reject",
              }).epochMilliseconds,
            );
      const nextStart = allDay
        ? atMinute(start, 0, timeZone)
        : parse(start, event.start);
      const nextEnd = allDay
        ? atMinute(addDays(end, 1), 0, timeZone)
        : parse(end, event.end);
      if (+nextEnd <= +nextStart) {
        setError("End must be after start.");
        return;
      }
      const { resourceId: _, ...rest } = event;
      onSave({
        ...rest,
        title: title.trim(),
        start: nextStart,
        end: nextEnd,
        allDay,
        ...(Array.isArray(event.resourceId) && resource === ""
          ? { resourceId: event.resourceId }
          : resource
            ? { resourceId: resource }
            : {}),
      });
    } catch {
      setError("Enter valid dates and times in the displayed time zone.");
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        id="editor"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          onRestoreFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isNew ? "New event" : "Edit event"}</DialogTitle>
          <DialogDescription>
            Set the schedule in {timeZone}.{" "}
            {allDay
              ? "The end date is included."
              : "Times can be entered to the minute."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={160}
              autoComplete="off"
              autoFocus
            />
          </div>
          <Label className="flex items-center gap-2">
            <input
              id="event-all-day"
              type="checkbox"
              checked={allDay}
              onChange={(e) => toggleAllDay(e.target.checked)}
              className="size-4 accent-primary"
            />
            All day
          </Label>
          <DateTimePicker
            start={start}
            end={end}
            allDay={allDay}
            invalid={!!error}
            onChange={(nextStart, nextEnd) => {
              setStart(nextStart);
              setEnd(nextEnd);
              setError("");
            }}
          />
          {resources.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="event-resource">Column</Label>
              <NativeSelect
                id="event-resource"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
              >
                {Array.isArray(event.resourceId) && (
                  <NativeSelectOption value="">
                    Keep current columns
                  </NativeSelectOption>
                )}
                {!event.resourceId && (
                  <NativeSelectOption value="">Unassigned</NativeSelectOption>
                )}
                {resources.map((r) => (
                  <NativeSelectOption key={r.id} value={r.id}>
                    {r.title}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}
          {error && (
            <p
              id="event-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {!isNew && (
              <Button
                id="delete"
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                Delete
              </Button>
            )}
            <div className="flex justify-end gap-2 sm:ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button id="save" type="submit">
                Save
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
