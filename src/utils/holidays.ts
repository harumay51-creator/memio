import KoreanLunarCalendar from 'korean-lunar-calendar'

export interface HolidayInfo {
  id: string
  date: string
  name: string
  isRedDay: boolean
}

function getSolarFromLunar(year: number, month: number, day: number, isLeapMonth = false): Date {
  const calendar = new KoreanLunarCalendar()
  calendar.setLunarDate(year, month, day, isLeapMonth)
  const solar = calendar.getSolarCalendar()
  return new Date(solar.year, solar.month - 1, solar.day)
}

function formatYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getNextWeekday(date: Date, holidays: Set<string>): Date {
  let current = addDays(date, 1)
  while (true) {
    const dayOfWeek = current.getDay()
    const dateStr = formatYMD(current)
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
      return current
    }
    current = addDays(current, 1)
  }
}

export function calculateHolidays(year: number): Record<string, HolidayInfo> {
  const holidays: Record<string, HolidayInfo> = {}
  const redDays = new Set<string>()

  const addHoliday = (date: Date, name: string, isRedDay: boolean, id: string) => {
    const dateStr = formatYMD(date)
    holidays[dateStr] = { id, date: dateStr, name, isRedDay }
    if (isRedDay) {
      redDays.add(dateStr)
    }
  }

  // 1. 고정 양력 공휴일
  addHoliday(new Date(year, 0, 1), '신정', true, `auto-solar-1-1`)
  addHoliday(new Date(year, 2, 1), '3·1절', true, `auto-solar-3-1`)
  addHoliday(new Date(year, 4, 5), '어린이날', true, `auto-solar-5-5`)
  addHoliday(new Date(year, 5, 6), '현충일', true, `auto-solar-6-6`)
  addHoliday(new Date(year, 6, 17), '제헌절', year >= 2026, `auto-solar-7-17`)
  addHoliday(new Date(year, 7, 15), '광복절', true, `auto-solar-8-15`)
  addHoliday(new Date(year, 9, 3), '개천절', true, `auto-solar-10-3`)
  addHoliday(new Date(year, 9, 9), '한글날', true, `auto-solar-10-9`)
  addHoliday(new Date(year, 11, 25), '성탄절', true, `auto-solar-12-25`)

  // 2. 음력 공휴일 계산
  // 설날 (음력 1월 1일)
  const seollal = getSolarFromLunar(year, 1, 1)
  const seollalPrev = addDays(seollal, -1)
  const seollalNext = addDays(seollal, 1)
  addHoliday(seollalPrev, '설날 연휴', true, `auto-lunar-seollal-prev`)
  addHoliday(seollal, '설날', true, `auto-lunar-seollal`)
  addHoliday(seollalNext, '설날 연휴', true, `auto-lunar-seollal-next`)

  // 부처님오신날 (음력 4월 8일)
  const buddha = getSolarFromLunar(year, 4, 8)
  addHoliday(buddha, '부처님 오신 날', true, `auto-lunar-buddha`)

  // 추석 (음력 8월 15일)
  const chuseok = getSolarFromLunar(year, 8, 15)
  const chuseokPrev = addDays(chuseok, -1)
  const chuseokNext = addDays(chuseok, 1)
  addHoliday(chuseokPrev, '추석 연휴', true, `auto-lunar-chuseok-prev`)
  addHoliday(chuseok, '추석', true, `auto-lunar-chuseok`)
  addHoliday(chuseokNext, '추석 연휴', true, `auto-lunar-chuseok-next`)

  // 3. 대체공휴일 로직
  const subGroup1 = [
    { date: new Date(year, 2, 1), name: '3·1절', enabled: true, originalId: 'auto-solar-3-1' },
    { date: new Date(year, 4, 5), name: '어린이날', enabled: true, originalId: 'auto-solar-5-5' },
    { date: new Date(year, 6, 17), name: '제헌절', enabled: year >= 2026, originalId: 'auto-solar-7-17' },
    { date: new Date(year, 7, 15), name: '광복절', enabled: true, originalId: 'auto-solar-8-15' },
    { date: new Date(year, 9, 3), name: '개천절', enabled: true, originalId: 'auto-solar-10-3' },
    { date: new Date(year, 9, 9), name: '한글날', enabled: true, originalId: 'auto-solar-10-9' },
    { date: new Date(year, 11, 25), name: '성탄절', enabled: true, originalId: 'auto-solar-12-25' },
    { date: buddha, name: '부처님 오신 날', enabled: true, originalId: 'auto-lunar-buddha' },
  ]

  for (const item of subGroup1) {
    if (!item.enabled) continue
    const dayOfWeek = item.date.getDay()
    const otherHolidays = new Set(Array.from(redDays))
    otherHolidays.delete(formatYMD(item.date))
    
    if (dayOfWeek === 0 || dayOfWeek === 6 || otherHolidays.has(formatYMD(item.date))) {
      const subDate = getNextWeekday(item.date, redDays)
      addHoliday(subDate, '대체공휴일', true, `auto-substitute-${item.originalId}`)
    }
  }

  // 설날/추석 대체
  const checkSubGroup2 = (holidaysArr: Date[], prefix: string) => {
    let shouldSubstitute = false
    let lastDate = holidaysArr[2]
    
    for (const d of holidaysArr) {
      const dayOfWeek = d.getDay()
      const otherHolidays = new Set(Array.from(redDays))
      for (const hd of holidaysArr) otherHolidays.delete(formatYMD(hd))
      
      if (dayOfWeek === 0 || otherHolidays.has(formatYMD(d))) {
        shouldSubstitute = true
        break
      }
    }
    
    if (shouldSubstitute) {
      const subDate = getNextWeekday(lastDate, redDays)
      addHoliday(subDate, '대체공휴일', true, `auto-substitute-${prefix}`)
    }
  }

  checkSubGroup2([seollalPrev, seollal, seollalNext], 'seollal')
  checkSubGroup2([chuseokPrev, chuseok, chuseokNext], 'chuseok')

  return holidays
}
