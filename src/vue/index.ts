import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
  Teleport,
  type PropType,
  type DefineComponent,
} from "vue";
import {
  createCalendar,
  type CalendarHandle,
  type CalendarOptions,
} from "../dom/index.js";
import type { CalendarEvent, Column, DateKey, View } from "../core/index.js";
type Mount = {
  node: HTMLElement;
  slot: "event" | "columnHeader";
  context: Record<string, unknown>;
};
/** Pass reactive CalendarOptions as `options`. Optional event / columnHeader slots use Teleport. */
export const Calendar = defineComponent({
  name: "FlexibleCalendar",
  props: {
    options: { type: Object as PropType<CalendarOptions>, required: true },
  },
  setup(props, { expose, slots, attrs }) {
    const host = shallowRef<HTMLElement>();
    let calendar: CalendarHandle | undefined;
    const mounts = shallowRef<Mount[]>([]);
    function adapterOptions(options: CalendarOptions): CalendarOptions {
      let pending: Mount[] = [];
      return {
        ...options,
        onBeforeRender: () => {
          pending = [];
          options.onBeforeRender?.();
        },
        onRender: () => {
          pending = pending.filter((mount) => host.value?.contains(mount.node));
          mounts.value = [...pending];
          options.onRender?.();
        },
        ...(slots.event
          ? {
              renderEvent: (
                event: CalendarEvent,
                context: { view: View; date: DateKey },
              ) => {
                const node = host.value!.ownerDocument.createElement("span");
                pending.push({
                  node,
                  slot: "event",
                  context: { event, ...context },
                });
                return node;
              },
            }
          : {}),
        ...(slots.columnHeader
          ? {
              renderColumnHeader: (column: Column) => {
                const node = host.value!.ownerDocument.createElement("span");
                pending.push({
                  node,
                  slot: "columnHeader",
                  context: { column },
                });
                return node;
              },
            }
          : {}),
      };
    }
    onMounted(() => {
      calendar = createCalendar(host.value!, adapterOptions(props.options));
    });
    watch(
      () => props.options,
      (value) =>
        calendar?.setOptions(
          adapterOptions({
            ...value,
            view: value.view ?? calendar.getOptions().view ?? "week",
          }),
        ),
      { deep: true },
    );
    onBeforeUnmount(() => calendar?.destroy());
    expose({
      scrollToTime: (minute: number) => calendar?.scrollToTime(minute),
      getCalendar: () => calendar,
    });
    return () => [
      h("div", { ...attrs, ref: host }),
      ...mounts.value.map((m) =>
        h(Teleport, { to: m.node }, slots[m.slot]?.(m.context) ?? []),
      ),
    ];
  },
  inheritAttrs: false,
}) as DefineComponent<{ options: CalendarOptions }>;
export type { CalendarOptions, CalendarHandle } from "../dom/index.js";
export type * from "../core/types.js";
