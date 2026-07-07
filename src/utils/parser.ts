import type { CategoryConfig } from '../types'

export type CaptureType = 'expense' | 'income'

export interface ParseResult {
  type:           CaptureType
  text:           string
  amount?:        number   // positive integer in 원; present for expense / income
  category?:      string   // expense/income category label
  scheduledDate?: string   // UTC ISO string (KST-aware); present for schedule (optional for fixed expense)
}

// ── Ledger category classification ───────────────────────────────────────────
export const DEFAULT_EXPENSE_CATS: CategoryConfig[] = [
  {
    name: '식비',
    keywords: ['점심','저녁','아침','식당','밥','국밥','치킨','피자','햄버거','식사','분식','마라탕','도시락','식비','떡볶이','라면','삼겹살','갈비','한식','중식','초밥','우동','냉면','파스타','샐러드','샌드위치','버거','순대','배달','배민','요기요'],
  },
  {
    name: '카페',
    keywords: ['스타벅스','카페','커피','아메리카노','라떼','디저트','빵','케이크','베이커리','투썸','이디야','폴바셋','블루보틀','공차','버블티','메가커피','컴포즈'],
  },
  {
    name: '교통',
    keywords: ['버스','지하철','택시','기차','ktx','srt','우버','카카오t','교통','주유','기름','톨게이트','주차','고속도로'],
  },
  {
    name: '쇼핑',
    keywords: ['쿠팡','네이버쇼핑','아마존','옷','신발','가방','의류','배송','쇼핑','다이소','이케아','올리브영','무신사','바지','티','셔츠','자켓','코트','지그재그','에이블리','유니클로'],
  },
  {
    name: '문화',
    keywords: ['영화','콘서트','전시','뮤지컬','책','게임','공연','넷플릭스','유튜브','스포티파이','멜론','넷플','웨이브','디즈니','왓챠','유튜브프리미엄'],
  },
  {
    name: '의료',
    keywords: ['병원','약국','치과','진료','의원','한의원','클리닉','약'],
  },
  {
    name: '통신',
    keywords: ['핸드폰','인터넷','통신','요금제','알뜰폰'],
  },
]

const INCOME_CATS: Array<{ name: string; keywords: string[] }> = [
  { name: '급여',     keywords: ['월급','급여','임금','알바비','페이','수당','보수','보너스'] },
  { name: '용돈',     keywords: ['용돈'] },
  { name: '이자/배당', keywords: ['이자','배당','수익'] },
  { name: '환급',     keywords: ['환급','환불','리펀드'] },
]

/**
 * Classify a ledger entry label into a Korean category name.
 * Exported so LedgerPage can reuse the same colour mapping.
 */
export function classifyLedgerCategory(text: string, type: 'income' | 'expense', customExpenseCats: CategoryConfig[] = DEFAULT_EXPENSE_CATS): string {
  const t = text.toLowerCase()
  if (type === 'income') {
    for (const { name, keywords } of INCOME_CATS) {
      if (keywords.some(k => t.includes(k))) return name
    }
    return '기타수입'
  }
  for (const { name, keywords } of customExpenseCats) {
    if (keywords.some(k => t.includes(k))) return name
  }
  return '기타'
}

// ── Korean number system ──────────────────────────────────────────────────────
const KOR_UNIT_VALUES = {
  '억': 100_000_000,
  '만': 10_000,
  '천': 1_000,
  '백': 100,
} as const

type KorUnit = keyof typeof KOR_UNIT_VALUES
const KOR_UNITS: KorUnit[] = ['억', '만', '천', '백']

function parseKorNum(expr: string): number {
  const s = expr.replace(/,/g, '').replace(/\s/g, '')
  if (/^[0-9]+$/.test(s)) return parseInt(s, 10)
  let total = 0
  let rest  = s
  for (const unit of KOR_UNITS) {
    const idx = rest.indexOf(unit)
    if (idx < 0) continue
    const coeffStr = rest.slice(0, idx)
    const coeff    = coeffStr === '' ? 1 : parseInt(coeffStr, 10)
    if (!isNaN(coeff)) total += coeff * KOR_UNIT_VALUES[unit]
    rest = rest.slice(idx + unit.length)
  }
  if (/^[0-9]+$/.test(rest) && rest !== '') total += parseInt(rest, 10)
  return total
}

const NON_AMOUNT_SUFFIX = /^\s*(?:시간|시|분|초|명|개|번|층|호|등|위|살|박|일|주|달|년|회|번째)/

function hasPlusBeforeIndex(text: string, index: number): boolean {
  for (let i = index - 1; i >= 0; i--) {
    if (text[i] === '+') return true;
    if (text[i] !== ' ' && text[i] !== '\t') return false;
  }
  return false;
}

function extractAmount(text: string): { amount: number, hasPlusPrefix: boolean } | null {
  const decM = text.match(/([0-9]+\.[0-9]+)\s*만\s*원/)
  if (decM) return { amount: Math.round(parseFloat(decM[1]) * 10_000), hasPlusPrefix: hasPlusBeforeIndex(text, decM.index!) }

  const korWithWon = /((?:[0-9]*\s*(?:억|만|천|백)\s*)+[0-9,]*|[0-9][0-9,]*)\s*원/
  const kwM = text.match(korWithWon)
  if (kwM) return { amount: parseKorNum(kwM[1]), hasPlusPrefix: hasPlusBeforeIndex(text, kwM.index!) }

  const korNoWon = /([0-9]+(?:\s*(?:억|만|천|백))+\s*[0-9,]*)/
  const knwM = text.match(korNoWon)
  if (knwM) return { amount: parseKorNum(knwM[1]), hasPlusPrefix: hasPlusBeforeIndex(text, knwM.index!) }

  const numRe = /([0-9][0-9,]*)/g
  let m: RegExpExecArray | null
  while ((m = numRe.exec(text)) !== null) {
    const after = text.slice(m.index + m[0].length)
    if (NON_AMOUNT_SUFFIX.test(after)) continue
    const n = parseInt(m[1].replace(/,/g, ''), 10)
    if (n >= 100) return { amount: n, hasPlusPrefix: hasPlusBeforeIndex(text, m.index) }
  }
  return null
}

// ── KST date/time utilities ───────────────────────────────────────────────────

/** Snapshot of the current wall-clock date in Korea Standard Time (UTC+9). */
interface KSTDate {
  year:    number
  month0:  number   // 0-indexed (January = 0)
  date:    number
  weekday: number   // 0 = Sunday … 6 = Saturday
  hour:    number
  minute:  number
}

/** Returns the current date components in KST regardless of system timezone. */
function kstNow(): KSTDate {
  const now   = new Date()
  const kstMs = now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60000
  const kst   = new Date(kstMs)
    year:    kst.getFullYear(),
    month0:  kst.getMonth(),
    date:    kst.getDate(),
    weekday: kst.getDay(),
    hour:    kst.getHours(),
    minute:  kst.getMinutes(),
  }
}

/** Add `days` to a KSTDate and return the resulting KSTDate. */
function addDaysKST(base: KSTDate, days: number): KSTDate {
  const d = new Date(Date.UTC(base.year, base.month0, base.date + days))
    year:    d.getUTCFullYear(),
    month0:  d.getUTCMonth(),
    date:    d.getUTCDate(),
    weekday: d.getUTCDay(),
    hour:    base.hour,
    minute:  base.minute,
  }
}

/**
 * Build a UTC ISO string for a date/time expressed in KST.
 * KST = UTC+9, so utcHour = kstHour - 9 (JavaScript Date handles negative rollover).
 */
function kstToIso(year: number, month0: number, date: number, hour: number, minute: number): string {
  return new Date(Date.UTC(year, month0, date, hour - 9, minute)).toISOString()
}

// ── Weekday parsing ───────────────────────────────────────────────────────────

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Full Korean weekday names in priority order (longer names first to avoid partial matches). */
const KOR_WEEKDAY_FULL: Array<[string, Weekday]> = [
  ['일요일', 0], ['월요일', 1], ['화요일', 2], ['수요일', 3],
  ['목요일', 4], ['금요일', 5], ['토요일', 6],
]

/**
 * Short (single-char) weekday names, matched ONLY when bounded by whitespace or
 * string start/end — prevents "\uae08\uc561"(amount), "\uc218\uc785"(income), "\ubaa9\ud45c"(goal), etc.
 * Only used inside a "\uc774\ubc88\uc8fc / \uc800\ubc88\uc8fc / \ub2e4\uc74c\uc8fc" context for safety.
 */
const KOR_WEEKDAY_SHORT: Array<[RegExp, Weekday]> = [
  [/(^|\s)\uc77c(\s|$)/, 0],
  [/(^|\s)\uc6d4(\s|$)/, 1],
  [/(^|\s)\ud654(\s|$)/, 2],
  [/(^|\s)\uc218(\s|$)/, 3],
  [/(^|\s)\ubaa9(\s|$)/, 4],
  [/(^|\s)\uae08(\s|$)/, 5],
  [/(^|\s)\ud1a0(\s|$)/, 6],
]

/** Returns the Weekday matched by a short single-char pattern, or null if none. */
function findShortWeekday(text: string): Weekday | null {
  for (const [re, wday] of KOR_WEEKDAY_SHORT) {
    if (re.test(text)) return wday
  }
  return null
}

/**
 * Returns this week's occurrence of `wday`, or the next one if `wday`
 * already passed this week.  If today IS `wday`, returns today.
 */
function thisOrNextWeekday(today: KSTDate, wday: Weekday): KSTDate {
  const daysToAdd = (wday - today.weekday + 7) % 7
  return addDaysKST(today, daysToAdd)
}

/**
 * Returns the occurrence of `wday` in the NEXT calendar week
 * (where weeks run Monday → Sunday per Korean convention).
 */
function nextWeekWeekday(today: KSTDate, wday: Weekday): KSTDate {
  // How far is this week's Monday from today (0 = today is Monday, 6 = today is Sunday)
  const todayOffsetFromMon = today.weekday === 0 ? 6 : today.weekday - 1
  const daysToNextMon      = 7 - todayOffsetFromMon   // 7 if Monday, 1 if Sunday
  // Offset of the target weekday within the week (0 = Monday … 6 = Sunday)
  const targetOffsetFromMon = wday === 0 ? 6 : wday - 1
  return addDaysKST(today, daysToNextMon + targetOffsetFromMon)
}

/**
 * Returns THIS week's `wday` (Mon-based week), even if it has already passed.
 * "이번주 목요일" on a Friday → last Thursday of this week.
 */
function thisWeekWeekday(today: KSTDate, wday: Weekday): KSTDate {
  const todayOffsetFromMon  = today.weekday === 0 ? 6 : today.weekday - 1
  const targetOffsetFromMon = wday === 0 ? 6 : wday - 1
  return addDaysKST(today, targetOffsetFromMon - todayOffsetFromMon)
}

/**
 * Returns LAST week's `wday` — always 7 days before this week's occurrence.
 * "저번주 월요일" / "지난주 월요일".
 */
function lastWeekWeekday(today: KSTDate, wday: Weekday): KSTDate {
  return addDaysKST(thisWeekWeekday(today, wday), -7)
}

// ── Time parsing ──────────────────────────────────────────────────────────────

interface TimeResult { hour: number; minute: number }

/**
 * Extract hour (24h) and minute from text.
 *
 * Rules:
 *   "오후 3시"    → 15   "오전 9시"  → 9   "12시" → 12
 *   bare "3시"   → 15   bare "10시" → 10
 *   Hours 1–8 with no AM/PM prefix are assumed to be PM.
 *   Default (no time found): 09:00 KST.
 */
function parseTime(text: string): TimeResult | null {
  // 오후 N시 (M분)?
  const pmM = text.match(/오후\s*([0-9]+)\s*시(?:\s*([0-9]+)\s*분)?/)
  if (pmM) {
    const h = parseInt(pmM[1])
    return { hour: h < 12 ? h + 12 : h, minute: pmM[2] ? parseInt(pmM[2]) : 0 }
  }

  // 오전 N시 (M분)?
  const amM = text.match(/오전\s*([0-9]+)\s*시(?:\s*([0-9]+)\s*분)?/)
  if (amM) {
    return { hour: parseInt(amM[1]), minute: amM[2] ? parseInt(amM[2]) : 0 }
  }

  // bare N시 (M분)?  — 1~8 → PM
  const bareM = text.match(/([0-9]+)\s*시(?:\s*([0-9]+)\s*분)?/)
  if (bareM) {
    const h = parseInt(bareM[1])
    return { hour: h >= 1 && h <= 8 ? h + 12 : h, minute: bareM[2] ? parseInt(bareM[2]) : 0 }
  }

  return null
}

// ── Date parsing ──────────────────────────────────────────────────────────────

/**
 * Extract the calendar date from free-form Korean schedule text.
 *
 * Priority:
 *   1. 오늘 / 내일 / 모레
 *   2. 이번주 + weekday  → this week's day (may be past)
 *   3. 저번주 / 지난주 + weekday → last week's day (always past)
 *   4. 다음주 + weekday  → next week's day
 *   5. "N월 N일" specific date
 *   6. Bare weekday     → this week's day, or next occurrence if past
 *   7. Fallback         → today
 */
function parseDate(text: string, today: KSTDate): KSTDate {
  // 1. Relative days
  if (text.includes('오늘')) return today
  if (text.includes('내일')) return addDaysKST(today, 1)
  if (text.includes('모레')) return addDaysKST(today, 2)

  // 2. 이번주 + weekday  (explicitly this calendar week, even if the day is past)
  if (/이번\s*주/.test(text)) {
    for (const [name, wday] of KOR_WEEKDAY_FULL) {
      if (text.includes(name)) return thisWeekWeekday(today, wday)
    }
    const sw = findShortWeekday(text)
    if (sw !== null) return thisWeekWeekday(today, sw)
    return today  // "이번주" alone → today
  }

  // 3. 저번주 / 지난주 + weekday  (last week — always a past date)
  if (/(?:저번|지난)\s*주/.test(text)) {
    for (const [name, wday] of KOR_WEEKDAY_FULL) {
      if (text.includes(name)) return lastWeekWeekday(today, wday)
    }
    const sw = findShortWeekday(text)
    if (sw !== null) return lastWeekWeekday(today, sw)
    return addDaysKST(today, -7)  // "저번주" alone → 7 days ago
  }

  // 4. 다음주 + weekday
  if (/다음\s*주/.test(text)) {
    for (const [name, wday] of KOR_WEEKDAY_FULL) {
      if (text.includes(name)) return nextWeekWeekday(today, wday)
    }
    const sw = findShortWeekday(text)
    if (sw !== null) return nextWeekWeekday(today, sw)
    return addDaysKST(today, 7)  // "다음주" alone → 7 days from now
  }

  // 5. "N월 N일" or "N/N" specific date
  const specM = text.match(/(?:([0-9]{1,2})\s*월\s*([0-9]{1,2})\s*일)|(?:([0-9]{1,2})\/([0-9]{1,2}))/)
  if (specM) {
    const month0 = parseInt(specM[1] || specM[3]) - 1
    const date   = parseInt(specM[2] || specM[4])
    const candidateMs = Date.UTC(today.year, month0, date)
    const todayMs     = Date.UTC(today.year, today.month0, today.date)
    // For general quick capture, assume current year unless it's more than 3 months in the past
    // But since users often log old expenses, let's just use current year by default.
    // (If they really mean next year, they'd have to specify, but our UI doesn't support year input yet)
    let year = today.year
    // If it's way in the past (e.g. > 10 months ago), they probably mean next year
    if (todayMs - candidateMs > 10 * 30 * 24 * 60 * 60 * 1000) {
      year = today.year + 1
    }
    const d = new Date(Date.UTC(year, month0, date))
    return { year: d.getUTCFullYear(), month0: d.getUTCMonth(), date: d.getUTCDate(), weekday: d.getUTCDay(), hour: 9, minute: 0 }
  }

  // 6. Bare weekday ("목요일", "월요일", …) → next occurrence (≥ today)
  for (const [name, wday] of KOR_WEEKDAY_FULL) {
    if (text.includes(name)) return thisOrNextWeekday(today, wday)
  }

  // 7. Fallback → today
  return today
}

// ── Schedule date builder ─────────────────────────────────────────────────────

/** Returns a UTC ISO string representing the KST schedule date/time parsed from `text`. */
function parseScheduledDate(text: string): string {
  const today              = kstNow()
  const time               = parseTime(text)
  const { year, month0, date } = parseDate(text, today)
  
  let hour = 9
  let minute = 0
  
  if (time) {
    hour = time.hour
    minute = time.minute
  } else if (year === today.year && month0 === today.month0 && date === today.date) {
    hour = today.hour
    minute = today.minute
  }
  
  return kstToIso(year, month0, date, hour, minute)
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseCapture(raw: string, customExpenseCats: CategoryConfig[] = DEFAULT_EXPENSE_CATS): ParseResult {
  const text   = raw.trim()
  const amountObj = extractAmount(text)

  if (amountObj && amountObj.hasPlusPrefix) {
    return { type: 'income', text, amount: amountObj.amount, category: classifyLedgerCategory(text, 'income', customExpenseCats), scheduledDate: parseScheduledDate(text) }
  }

  const finalAmount = amountObj ? amountObj.amount : 0
  return { type: 'expense', text, amount: finalAmount, category: classifyLedgerCategory(text, 'expense', customExpenseCats), scheduledDate: parseScheduledDate(text) }
}
