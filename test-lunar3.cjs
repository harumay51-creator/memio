const KoreanLunarCalendar = require('korean-lunar-calendar');
const cal = new KoreanLunarCalendar();

console.log("2021 (No Leap):", cal.setLunarDate(2021, 4, 15, true));
const s1 = cal.getSolarCalendar();
console.log(s1);

console.log("2021 (Normal):", cal.setLunarDate(2021, 4, 15, false));
const s2 = cal.getSolarCalendar();
console.log(s2);
