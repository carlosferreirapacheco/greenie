// Tiny in-process signal from the welcome screen to the root layout:
// consent was just accepted, so the layout can open its gate immediately
// instead of racing a profile refetch against the navigation away from
// /welcome.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onConsentAccepted(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitConsentAccepted(): void {
  listeners.forEach((listener) => listener());
}
