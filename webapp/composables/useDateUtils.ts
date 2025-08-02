/**
 * 将 datetime-local 的值（视为本地时间）正确转换为 UTC 时间字符串
 * @param localTimeString - 格式为 "YYYY-MM-DDTHH:mm" 的本地时间字符串
 * @returns UTC 时间的 ISO 字符串
 */
export function convertLocalToUTC(localTimeString: string): string {
  // localTimeString 格式为 "YYYY-MM-DDTHH:mm"
  const [datePart, timePart] = localTimeString.split('T')

  if (!datePart || !timePart) {
    throw new Error('Invalid datetime format. Expected YYYY-MM-DDTHH:mm')
  }

  const [year, month, day] = datePart.split('-')
  const [hours, minutes] = timePart.split(':')

  if (!year || !month || !day || !hours || !minutes) {
    throw new Error('Invalid datetime format. Expected YYYY-MM-DDTHH:mm')
  }

  // 创建本地时间的 Date 对象
  const localDate = new Date(
    parseInt(year),
    parseInt(month) - 1, // 月份从0开始
    parseInt(day),
    parseInt(hours),
    parseInt(minutes)
  )

  // 转换为 ISO 字符串（UTC 时间）
  return localDate.toISOString()
}