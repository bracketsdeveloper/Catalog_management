export function splitDispatchOpenClosed(rawRows) {
    const open = rawRows.filter((r) => r.status !== "sent");
    const closed = rawRows.filter((r) => r.status === "sent");
    return { open, closed };
  }
  