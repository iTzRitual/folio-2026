export const rootScrollLock = {
  active: false,
  preventNativeScroll: false,
  y: 0,
};

export type RootScrollLockLease = {
  update: (y: number) => void;
  release: () => void;
};

type RootScrollLockOptions = {
  preventNativeScroll?: boolean;
};

const listeners = new Set<() => void>();
const leases = new Map<
  symbol,
  { y: number; preventNativeScroll: boolean }
>();

function notifyRootScrollLock() {
  for (const listener of listeners) listener();
}

function syncRootScrollLock() {
  const previousActive = rootScrollLock.active;
  const previousNative = rootScrollLock.preventNativeScroll;
  const previousY = rootScrollLock.y;
  const activeLease = [...leases.values()].at(-1);

  rootScrollLock.active = activeLease !== undefined;
  rootScrollLock.preventNativeScroll = [...leases.values()].some(
    (lease) => lease.preventNativeScroll,
  );
  if (activeLease) rootScrollLock.y = activeLease.y;

  if (
    previousActive !== rootScrollLock.active ||
    previousNative !== rootScrollLock.preventNativeScroll ||
    previousY !== rootScrollLock.y
  ) {
    notifyRootScrollLock();
  }
}

export function acquireRootScrollLock(
  y: number,
  options: RootScrollLockOptions = {},
): RootScrollLockLease {
  const id = Symbol();
  leases.set(id, {
    y,
    preventNativeScroll: options.preventNativeScroll ?? false,
  });
  syncRootScrollLock();

  return {
    update(nextY) {
      const lease = leases.get(id);
      if (!lease || lease.y === nextY) return;
      lease.y = nextY;
      syncRootScrollLock();
    },
    release() {
      if (!leases.delete(id)) return;
      syncRootScrollLock();
    },
  };
}

export function subscribeRootScrollLock(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
