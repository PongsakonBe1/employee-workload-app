// Per-process pilot limits. They intentionally fail closed and are not a multi-instance quota.
export function createCalendarLimits({ now = Date.now, globalLimit = 60, userLimit = 12, concurrent = 2, maxUsers = 256 } = {}) {
  let windowStart = now(), total = 0, active = 0;
  const users = new Map();
  function roll() { if (now() - windowStart >= 60000) { windowStart = now();total = 0;users.clear(); } }
  return {
    request() { roll();if (total >= globalLimit) return false;total++;return true; },
    enter(uid) {
      roll();const count = users.get(uid) || 0;
      if (active >= concurrent || count >= userLimit || !users.has(uid) && users.size >= maxUsers) return null;
      users.set(uid, count + 1);active++;let released = false;
      return () => { if (!released) { released = true;active--; } };
    }
  };
}
