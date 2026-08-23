export const rootScrollLock = {
  active: false,
  y: 0,
};

const listeners = new Set<() => void>();

function notifyRootScrollLock() {
  for (const listener of listeners) listener();
}

export function lockRootScroll(y: number) {
  rootScrollLock.active = true;
  rootScrollLock.y = y;
  notifyRootScrollLock();
}

export function releaseRootScroll() {
  rootScrollLock.active = false;
  notifyRootScrollLock();
}

export function subscribeRootScrollLock(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
