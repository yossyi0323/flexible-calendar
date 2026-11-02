"use client";
import {
  createElement,
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import {
  createCalendar,
  type CalendarHandle,
  type CalendarOptions,
} from "../dom/index.js";
import type { CalendarEvent, Column, DateKey, View } from "../core/index.js";
export interface CalendarProps<
  E extends CalendarEvent = CalendarEvent,
> extends CalendarOptions<E> {
  className?: string;
  style?: CSSProperties;
  renderReactEvent?: (
    event: E,
    context: { view: View; date: DateKey },
  ) => ReactNode;
  renderReactColumnHeader?: (column: Column) => ReactNode;
  /** Receives the imperative instance after mounting, and null on cleanup. */
  calendarRef?: (calendar: CalendarHandle<E> | null) => void;
}
type Mount = { node: HTMLElement; content: ReactNode; key: string };
/** SSR-safe host. Portals keep custom content in the caller's React context. */
export function Calendar<E extends CalendarEvent = CalendarEvent>(
  props: CalendarProps<E>,
): ReactElement {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<CalendarHandle<E> | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [mounts, setMounts] = useState<Mount[]>([]);
  function adapterOptions(p: CalendarProps<E>): CalendarOptions<E> {
    let pending: Mount[] = [];
    return {
      ...p,
      onBeforeRender: () => {
        pending = [];
        p.onBeforeRender?.();
      },
      onRender: () => {
        setMounts(pending);
        p.onRender?.();
      },
      ...(p.renderReactEvent
        ? {
            renderEvent: (event: E, context: { view: View; date: DateKey }) => {
              const node = host.current!.ownerDocument.createElement("span");
              pending.push({
                node,
                content: p.renderReactEvent!(event, context),
                key: `${event.id}/${context.date}/${pending.length}`,
              });
              return node;
            },
          }
        : {}),
      ...(p.renderReactColumnHeader
        ? {
            renderColumnHeader: (column: Column) => {
              const node = host.current!.ownerDocument.createElement("span");
              pending.push({
                node,
                content: p.renderReactColumnHeader!(column),
                key: column.key,
              });
              return node;
            },
          }
        : {}),
    };
  }
  useEffect(() => {
    const calendar = createCalendar(
      host.current!,
      adapterOptions(latest.current),
    );
    instance.current = calendar;
    return () => {
      calendar.destroy();
      instance.current = null;
    };
  }, []);
  useEffect(() => {
    instance.current?.setOptions(
      adapterOptions({
        ...props,
        view: props.view ?? instance.current.getOptions().view ?? "week",
      }),
    );
  }, [props]);
  useEffect(() => {
    props.calendarRef?.(instance.current);
    return () => props.calendarRef?.(null);
  }, [props.calendarRef]);
  return createElement(
    Fragment,
    null,
    createElement("div", {
      ref: host,
      className: props.className,
      style: props.style,
    }),
    ...mounts.map((mount) =>
      createPortal(mount.content, mount.node, mount.key),
    ),
  );
}
export type { CalendarOptions, CalendarHandle } from "../dom/index.js";
export type * from "../core/types.js";
