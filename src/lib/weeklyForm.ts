export function formatWeeklyFormRange(startDate: string, endDate: string): string {
  const format = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    return `${year}년 ${month}월 ${day}일`
  }

  return `${format(startDate)} ~ ${format(endDate)}`
}
