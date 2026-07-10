import type { LedgerEntry } from '../types'

export interface PaydayCycleResult {
  // 현금 지출 구간
  cashStart: Date;
  cashEnd: Date;
  
  // 기준이 되는 카드 결제일
  targetCardPaymentDate: Date;
  
  // 카드 청구 구간
  cardBillingStart: Date;
  cardBillingEnd: Date;
}

/**
 * 특정 "월급일"을 기준으로 이번 월급 사이클의 기간(현금, 카드)을 계산합니다.
 * @param baseYear 기준 연도 (예: 2026)
 * @param baseMonth 기준 월 (1-12)
 * @param payday 월급일 (1-31)
 * @param cardPaymentDay 카드 결제일 (1-31)
 * @param cardBillingStartDay 카드 사용기간 시작일 (1-31)
 * @param cardBillingEndDay 카드 사용기간 종료일 (1-31)
 */
export function calculatePaydayCycle(
  baseYear: number,
  baseMonth: number,
  payday: number,
  cardPaymentDay: number,
  cardBillingStartDay: number,
  cardBillingEndDay: number
): PaydayCycleResult {
  const month0 = baseMonth - 1;

  function getSafeDate(y: number, m: number, d: number) {
    const lastDay = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(d, lastDay));
  }

  const currentPayday = getSafeDate(baseYear, month0, payday);
  
  const nextPayday = getSafeDate(baseYear, month0 + 1, payday);
  const cashEnd = new Date(nextPayday.getTime() - 1); 

  const cashStart = new Date(currentPayday);
  cashStart.setHours(0, 0, 0, 0);

  let paymentYear = baseYear;
  let paymentMonth0 = month0;
  
  if (cardPaymentDay > payday) {
    paymentMonth0 = month0;
  } else {
    paymentMonth0 = month0 + 1;
  }

  const targetCardPaymentDate = getSafeDate(paymentYear, paymentMonth0, cardPaymentDay);
  targetCardPaymentDate.setHours(23, 59, 59, 999); 

  const cardBillingStart = getSafeDate(paymentYear, paymentMonth0 - 2, cardBillingStartDay);
  cardBillingStart.setHours(0, 0, 0, 0);

  const cardBillingEnd = getSafeDate(paymentYear, paymentMonth0 - 1, cardBillingEndDay);
  cardBillingEnd.setHours(23, 59, 59, 999);

  return {
    cashStart,
    cashEnd,
    targetCardPaymentDate,
    cardBillingStart,
    cardBillingEnd
  };
}

export function sumEntries(entries: LedgerEntry[], start: Date, end: Date, type: 'income' | 'expense' = 'expense'): number {
  return entries.filter(e => {
    if (e.type !== type) return false;
    const d = new Date(e.scheduledDate || e.createdAt);
    return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
  }).reduce((sum, e) => sum + e.amount, 0);
}
