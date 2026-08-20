const KoreanLunarCalendar = require('korean-lunar-calendar');
const cal = new KoreanLunarCalendar();
const testLeapMonth = (year, month, day, isLeap) => {
  cal.setLunarDate(year, month, day, isLeap);
  const solar = cal.getSolarCalendar();
  console.log(`Lunar: ${year}-${month}-${day} (Leap: ${isLeap}) => Solar: ${solar.year}-${solar.month}-${solar.day}`);
};

console.log('2020년 윤4월 (실제 윤달 있음):');
testLeapMonth(2020, 4, 15, true);

console.log('2021년 윤4월 (윤달 없음):');
testLeapMonth(2021, 4, 15, true);

console.log('2021년 평4월:');
testLeapMonth(2021, 4, 15, false);
