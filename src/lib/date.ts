export function formatDateBR(value: string) {
  const [year, month, day] = value.split('-')

  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}
