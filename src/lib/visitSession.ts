const KEY = "folio:visited";

export const IS_REPEAT_VISIT: boolean = (() => {
  if (typeof window === "undefined") return false;
  try {
    const seen = sessionStorage.getItem(KEY) === "1";
    sessionStorage.setItem(KEY, "1");
    return seen;
  } catch {
    return false;
  }
})();
