// Tiny in-process signal from the Alerts screen to the tabs layout:
// notifications were just marked read, so the layout can clear the
// tab badge immediately instead of waiting for the next unrelated
// navigation to trigger its own refetch. Same shape as consentEvents.ts.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onNotificationsRead(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitNotificationsRead(): void {
  listeners.forEach((listener) => listener());
}
