import { useMemo } from 'react'
import { useAppStore } from '../store/AppStore'
import { calculateHolidays, HolidayInfo } from '../utils/holidays'

export interface MergedHoliday extends HolidayInfo {
  isCustom: boolean
  originalRuleName?: string // Used to identify rule if it's an auto-holiday
}

export function useMergedHolidays(year: number) {
  const { holidayConfig } = useAppStore()

  return useMemo(() => {
    const autoHolidays = calculateHolidays(year)
    const result: Record<string, MergedHoliday> = {}

    // 1. Load auto-calculated holidays
    for (const [date, info] of Object.entries(autoHolidays)) {
      // Check if this rule is globally hidden
      const ruleName = info.name
      if (holidayConfig.hiddenRules.includes(ruleName)) {
        continue
      }
      
      // Check if this specific date is hidden
      if (holidayConfig.hiddenDates.includes(date)) {
        continue
      }

      result[date] = {
        ...info,
        isCustom: false,
        originalRuleName: ruleName
      }
    }

    // 2. Overlay custom holidays
    // Only apply custom holidays for the requested year to avoid memory bloat
    const yearPrefix = `${year}-`
    for (const custom of holidayConfig.customHolidays) {
      if (custom.date.startsWith(yearPrefix)) {
        result[custom.date] = {
          id: custom.id,
          date: custom.date,
          name: custom.name,
          isRedDay: custom.isRedDay,
          isCustom: true
        }
      }
    }

    return result
  }, [year, holidayConfig])
}
