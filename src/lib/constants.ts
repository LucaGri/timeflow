// Working hours configuration
export const WORKING_HOURS = {
  START: 9, // 9 AM
  END: 18,  // 6 PM (18:00)
} as const

// Helper function to set working hours for a given date
export function setWorkingHours(date: Date, isStart: boolean): Date {
  const newDate = new Date(date)
  newDate.setHours(isStart ? WORKING_HOURS.START : WORKING_HOURS.END, 0, 0, 0)
  return newDate
}
