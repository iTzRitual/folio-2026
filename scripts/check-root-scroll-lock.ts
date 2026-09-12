import assert from "node:assert/strict";
import {
  acquireRootScrollLock,
  rootScrollLock,
  subscribeRootScrollLock,
} from "../src/lib/rootScrollLock";

let notifications = 0;
const unsubscribe = subscribeRootScrollLock(() => {
  notifications += 1;
});

const workstation = acquireRootScrollLock(120);
assert.deepEqual(rootScrollLock, {
  active: true,
  preventNativeScroll: false,
  y: 120,
});

const study = acquireRootScrollLock(240, { preventNativeScroll: true });
assert.deepEqual(rootScrollLock, {
  active: true,
  preventNativeScroll: true,
  y: 240,
});

workstation.update(180);
assert.equal(rootScrollLock.y, 240);
study.release();
assert.deepEqual(rootScrollLock, {
  active: true,
  preventNativeScroll: false,
  y: 180,
});

study.release();
workstation.release();
assert.deepEqual(rootScrollLock, {
  active: false,
  preventNativeScroll: false,
  y: 180,
});
assert.equal(notifications, 4);
unsubscribe();

console.log("PASS: root scroll locks preserve independent ownership.");

