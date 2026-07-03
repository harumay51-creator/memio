export interface HolidayInfo {
  name: string
  isRedDay: boolean
}

export const HOLIDAYS: Record<string, HolidayInfo> = {
  // 2026
  '2026-01-01': { name: '신정', isRedDay: true },
  '2026-02-16': { name: '설날 연휴', isRedDay: true },
  '2026-02-17': { name: '설날', isRedDay: true },
  '2026-02-18': { name: '설날 연휴', isRedDay: true },
  '2026-03-01': { name: '3·1절', isRedDay: true },
  '2026-03-02': { name: '대체공휴일', isRedDay: true },
  '2026-05-05': { name: '어린이날', isRedDay: true },
  '2026-05-24': { name: '부처님 오신 날', isRedDay: true },
  '2026-05-25': { name: '대체공휴일', isRedDay: true },
  '2026-06-03': { name: '전국동시지방선거', isRedDay: true },
  '2026-06-06': { name: '현충일', isRedDay: true },
  '2026-07-17': { name: '제헌절', isRedDay: false },
  '2026-08-15': { name: '광복절', isRedDay: true },
  '2026-08-17': { name: '대체공휴일', isRedDay: true },
  '2026-09-24': { name: '추석 연휴', isRedDay: true },
  '2026-09-25': { name: '추석', isRedDay: true },
  '2026-09-26': { name: '추석 연휴', isRedDay: true },
  '2026-10-03': { name: '개천절', isRedDay: true },
  '2026-10-05': { name: '대체공휴일', isRedDay: true },
  '2026-10-09': { name: '한글날', isRedDay: true },
  '2026-12-25': { name: '성탄절', isRedDay: true },

  // 2027
  '2027-01-01': { name: '신정', isRedDay: true },
  '2027-02-06': { name: '설날 연휴', isRedDay: true },
  '2027-02-07': { name: '설날', isRedDay: true },
  '2027-02-08': { name: '설날 연휴', isRedDay: true },
  '2027-02-09': { name: '대체공휴일', isRedDay: true },
  '2027-03-01': { name: '3·1절', isRedDay: true },
  '2027-03-03': { name: '대통령선거', isRedDay: true },
  '2027-05-05': { name: '어린이날', isRedDay: true },
  '2027-05-13': { name: '부처님 오신 날', isRedDay: true },
  '2027-06-06': { name: '현충일', isRedDay: true },
  '2027-07-17': { name: '제헌절', isRedDay: false },
  '2027-08-15': { name: '광복절', isRedDay: true },
  '2027-08-16': { name: '대체공휴일', isRedDay: true },
  '2027-09-14': { name: '추석 연휴', isRedDay: true },
  '2027-09-15': { name: '추석', isRedDay: true },
  '2027-09-16': { name: '추석 연휴', isRedDay: true },
  '2027-10-03': { name: '개천절', isRedDay: true },
  '2027-10-04': { name: '대체공휴일', isRedDay: true },
  '2027-10-09': { name: '한글날', isRedDay: true },
  '2027-10-11': { name: '대체공휴일', isRedDay: true },
  '2027-12-25': { name: '성탄절', isRedDay: true },
  '2027-12-27': { name: '대체공휴일', isRedDay: true },
}
