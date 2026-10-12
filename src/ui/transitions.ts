export function withViewTransition(update: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => void;
  };
  if (doc.startViewTransition) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}
