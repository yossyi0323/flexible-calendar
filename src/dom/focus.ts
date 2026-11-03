/** Restore the same fragment where possible, then follow an event moved to another column. */
export function captureFocus(root: HTMLElement): () => void {
  const focused = root.contains(root.ownerDocument.activeElement)
    ? (root.ownerDocument.activeElement as HTMLElement)
    : null;
  const eventId = focused?.dataset.eventId,
    columnKey = focused?.dataset.columnKey;
  const fragmentDate = focused?.dataset.date;
  const resource =
    focused?.closest<HTMLElement>("[data-column-key]")?.dataset.resourceId;
  return () => {
    if (eventId) {
      const candidates = [
        ...root.querySelectorAll<HTMLElement>("[data-event-id]"),
      ].filter((node) => node.dataset.eventId === eventId);
      (
        candidates.find(
          (node) =>
            node.dataset.date === fragmentDate &&
            node.closest<HTMLElement>("[data-column-key]")?.dataset
              .resourceId === resource,
        ) ?? candidates[0]
      )?.focus({ preventScroll: true });
    } else if (columnKey)
      [...root.querySelectorAll<HTMLElement>("[data-column-key]")]
        .find(
          (node) =>
            node.dataset.columnKey === columnKey &&
            node.classList.contains("fc-time-column"),
        )
        ?.focus({ preventScroll: true });
  };
}
