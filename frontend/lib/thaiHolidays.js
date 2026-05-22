// Thai public holidays — iApp Technology API (live)
// API docs: https://iapp.co.th/docs/data/holiday/thai
// API key stored in NEXT_PUBLIC_IAPP_HOLIDAY_API_KEY (.env.local)
// Falls back to hardcoded data when API is unavailable

// ─── Hardcoded fallback (2024–2026) ──────────────────────────────────────────
const FALLBACK_HOLIDAYS = {
  "2024-01-01": "วันขึ้นปีใหม่",
  "2024-02-24": "วันมาฆบูชา",
  "2024-04-06": "วันจักรี",
  "2024-04-08": "วันหยุดชดเชยวันจักรี",
  "2024-04-13": "วันสงกรานต์",
  "2024-04-14": "วันสงกรานต์",
  "2024-04-15": "วันสงกรานต์",
  "2024-05-01": "วันแรงงานแห่งชาติ",
  "2024-05-04": "วันฉัตรมงคล",
  "2024-05-06": "วันพืชมงคล",
  "2024-05-22": "วันวิสาขบูชา",
  "2024-06-03": "วันเฉลิมพระชนมพรรษา พระราชินี",
  "2024-07-21": "วันอาสาฬหบูชา",
  "2024-07-22": "วันเข้าพรรษา",
  "2024-07-28": "วันเฉลิมพระชนมพรรษา ร.10",
  "2024-07-29": "วันหยุดพิเศษ",
  "2024-08-12": "วันแม่แห่งชาติ",
  "2024-10-13": "วันนวมินทรมหาราช",
  "2024-10-14": "วันหยุดพิเศษ",
  "2024-10-23": "วันปิยมหาราช",
  "2024-12-05": "วันพ่อแห่งชาติ",
  "2024-12-10": "วันรัฐธรรมนูญ",
  "2024-12-31": "วันสิ้นปี",
  "2025-01-01": "วันขึ้นปีใหม่",
  "2025-02-12": "วันมาฆบูชา",
  "2025-04-06": "วันจักรี",
  "2025-04-07": "วันหยุดชดเชยวันจักรี",
  "2025-04-13": "วันสงกรานต์",
  "2025-04-14": "วันสงกรานต์",
  "2025-04-15": "วันสงกรานต์",
  "2025-04-16": "วันหยุดชดเชยวันสงกรานต์",
  "2025-05-01": "วันแรงงานแห่งชาติ",
  "2025-05-04": "วันฉัตรมงคล",
  "2025-05-05": "วันหยุดชดเชยวันฉัตรมงคล",
  "2025-05-09": "วันพืชมงคล",
  "2025-05-11": "วันวิสาขบูชา",
  "2025-05-12": "วันหยุดชดเชยวันวิสาขบูชา",
  "2025-06-02": "วันหยุดพิเศษ",
  "2025-06-03": "วันเฉลิมพระชนมพรรษา พระราชินี",
  "2025-07-10": "วันอาสาฬหบูชา",
  "2025-07-11": "วันเข้าพรรษา",
  "2025-07-28": "วันเฉลิมพระชนมพรรษา ร.10",
  "2025-08-11": "วันหยุดพิเศษ",
  "2025-08-12": "วันแม่แห่งชาติ",
  "2025-10-07": "วันออกพรรษา",
  "2025-10-13": "วันนวมินทรมหาราช",
  "2025-10-23": "วันปิยมหาราช",
  "2025-12-05": "วันพ่อแห่งชาติ",
  "2025-12-10": "วันรัฐธรรมนูญ",
  "2025-12-31": "วันสิ้นปี",
  "2026-01-01": "วันขึ้นปีใหม่",
  "2026-01-02": "วันหยุดพิเศษ",
  "2026-03-03": "วันมาฆบูชา",
  "2026-04-06": "วันจักรี",
  "2026-04-13": "วันสงกรานต์",
  "2026-04-14": "วันสงกรานต์",
  "2026-04-15": "วันสงกรานต์",
  "2026-05-01": "วันแรงงานแห่งชาติ",
  "2026-05-04": "วันฉัตรมงคล",
  "2026-05-11": "วันพืชมงคล",
  "2026-05-31": "วันวิสาขบูชา",
  "2026-06-01": "วันหยุดชดเชยวันวิสาขบูชา",
  "2026-06-03": "วันเฉลิมพระชนมพรรษา พระราชินี",
  "2026-07-28": "วันเฉลิมพระชนมพรรษา ร.10",
  "2026-07-29": "วันอาสาฬหบูชา",
  "2026-07-30": "วันเข้าพรรษา",
  "2026-08-12": "วันแม่แห่งชาติ",
  "2026-10-13": "วันนวมินทรมหาราช",
  "2026-10-23": "วันปิยมหาราช",
  "2026-10-26": "วันออกพรรษา",
  "2026-12-05": "วันพ่อแห่งชาติ",
  "2026-12-07": "วันหยุดชดเชยวันพ่อ",
  "2026-12-10": "วันรัฐธรรมนูญ",
  "2026-12-31": "วันสิ้นปี",
};

// ─── Cache layer ─────────────────────────────────────────────────────────────
// L1: in-memory (per page session)
// L2: localStorage with 30-day TTL (survives page reloads, costs 0 IC)
const _memCache = {};
const _fetchedYears = new Set();
const _pendingFetches = {};

const API_KEY = process.env.NEXT_PUBLIC_IAPP_HOLIDAY_API_KEY;
const BASE_URL = "https://api.iapp.co.th/v3/store/data/thai-holiday";
const LS_PREFIX = "thai_holidays_";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function lsKey(year) { return `${LS_PREFIX}${year}`; }

/** Read from localStorage, returns map or null if missing/expired */
function lsRead(year) {
  try {
    const raw = localStorage.getItem(lsKey(year));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > TTL_MS) { localStorage.removeItem(lsKey(year)); return null; }
    return data;
  } catch { return null; }
}

/** Write to localStorage */
function lsWrite(year, map) {
  try { localStorage.setItem(lsKey(year), JSON.stringify({ ts: Date.now(), data: map })); }
  catch { /* storage full — ignore */ }
}

/**
 * Fetch holidays for a year. Uses localStorage cache first (0 IC),
 * only hits API when cache is missing or expired.
 */
async function fetchYearHolidays(year) {
  if (!API_KEY) return null;
  // L1 hit
  if (_fetchedYears.has(year)) return _memCache[year] || null;
  // L2 hit — localStorage (costs 0 IC)
  if (typeof window !== "undefined") {
    const stored = lsRead(year);
    if (stored) {
      _memCache[year] = stored;
      _fetchedYears.add(year);
      return stored;
    }
  }
  // deduplicate concurrent fetches
  if (_pendingFetches[year]) return _pendingFetches[year];

  _pendingFetches[year] = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/year/${year}?holiday_type=both`, {
        headers: { apikey: API_KEY },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const map = {};
      (json.holidays || []).forEach((h) => {
        if (h.date && h.name) map[h.date] = h.name;
      });
      _memCache[year] = map;
      _fetchedYears.add(year);
      if (typeof window !== "undefined") lsWrite(year, map);
      return map;
    } catch {
      _fetchedYears.add(year);
      return null;
    } finally {
      delete _pendingFetches[year];
    }
  })();

  return _pendingFetches[year];
}

// Pre-warm current year only on module load (1 IC per browser, not per reload)
if (typeof window !== "undefined" && API_KEY) {
  fetchYearHolidays(new Date().getFullYear());
}

/**
 * Synchronous lookup — uses cached API data when available, falls back to hardcoded.
 * @param {string} dateStr  "YYYY-MM-DD"
 * @returns {string|null}
 */
export function getThaiHoliday(dateStr) {
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (_memCache[year]) return _memCache[year][dateStr] || null;
  return FALLBACK_HOLIDAYS[dateStr] || null;
}

/**
 * Async version — ensures API data is loaded for the year before returning.
 * Use this if you need guaranteed accuracy (e.g., on calendar month change).
 * @param {string} dateStr  "YYYY-MM-DD"
 * @returns {Promise<string|null>}
 */
export async function getThaiHolidayAsync(dateStr) {
  const year = parseInt(dateStr.slice(0, 4), 10);
  await fetchYearHolidays(year);
  return getThaiHoliday(dateStr);
}

/**
 * Pre-fetch all holidays for a given year into cache.
 * Call this when navigating to a new month to warm the cache.
 * @param {number} year
 */
export async function prefetchHolidaysForYear(year) {
  await fetchYearHolidays(year);
}
