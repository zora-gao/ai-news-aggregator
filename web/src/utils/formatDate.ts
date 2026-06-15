import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '未知时间'
  
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '未知时间'
    
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: zhCN 
    })
  } catch {
    return '未知时间'
  }
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '未知时间'
  
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '未知时间'
    
    return format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN })
  } catch {
    return '未知时间'
  }
}

export function formatTime(dateString: string | null): string {
  if (!dateString) return ''
  
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return ''
    
    return format(date, 'HH:mm', { locale: zhCN })
  } catch {
    return ''
  }
}

/** 用于分组的稳定日期键，如 "2026-06-15"。无效时间归入 "unknown"。 */
export function dateGroupKey(dateString: string | null): string {
  if (!dateString) return 'unknown'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return 'unknown'
    return format(date, 'yyyy-MM-dd')
  } catch {
    return 'unknown'
  }
}

/** 日期分组的展示标签：今天/昨天/M月D日 周X。 */
export function dateGroupLabel(dateString: string | null): string {
  if (!dateString) return '未知日期'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '未知日期'

    const today = new Date()
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const diffDays = Math.round((startOfDay(today) - startOfDay(date)) / 86400000)

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    return format(date, 'M月d日 EEEE', { locale: zhCN })
  } catch {
    return '未知日期'
  }
}
