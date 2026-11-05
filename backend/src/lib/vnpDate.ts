// VNPay wants yyyyMMddHHmmss in GMT+7 whatever the server's time zone. The vnpay package's
// dateFormat() uses the server's local time, which is UTC on most hosts.
const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function formatVnpDate(date: Date): string {
  const p = Object.fromEntries(parts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second}`;
}
