import type { NewsItem } from '../types'
import type { VisitedLinkInfo } from '../hooks/useVisitedLinks'
import { NewsCard } from './NewsCard'
import { LoadingState } from './LoadingState'
import { EmptyState } from './EmptyState'
import { ChevronDown } from 'lucide-react'
import { Analytics } from '../utils/analytics'
import { dateGroupKey, dateGroupLabel } from '../utils/formatDate'

interface NewsListProps {
  items: NewsItem[]
  loading: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  visitedLinks: Record<string, VisitedLinkInfo>
  onVisit: (url: string, title?: string) => void
  isFavorite?: (url: string) => boolean
  onToggleFavorite?: (url: string, title: string) => void
  /** 平铺模式：不按日期分组，直接顺序展示（如产品 tab 还原榜单顺序） */
  flat?: boolean
  /** 透传给 NewsCard：隐藏 AI Radar 评分与优先级标注 */
  hideRadarMeta?: boolean
}

export function NewsList({ items, loading, error, hasMore, onLoadMore, visitedLinks, onVisit, isFavorite, onToggleFavorite, flat = false, hideRadarMeta = false }: NewsListProps) {
  const isVisited = (url: string) => url in visitedLinks
  const visitedCount = Object.keys(visitedLinks).length

  if (loading && items.length === 0) {
    return <LoadingState />
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <div className="text-red-500 dark:text-red-400 mb-2">⚠️ 加载失败</div>
        <p className="text-slate-600 dark:text-slate-300">{error}</p>
      </div>
    )
  }

  if (items.length === 0) {
    return <EmptyState />
  }

  const visitedInList = items.filter(item => isVisited(item.url)).length

  // 按日期分组（items 已按时间倒序，分组后保持原顺序）；flat 模式下不分组
  const groups: Array<{ key: string; label: string; items: NewsItem[] }> = []
  if (flat) {
    groups.push({ key: '__flat__', label: '', items })
  } else {
    const groupIndex = new Map<string, number>()
    for (const item of items) {
      const key = dateGroupKey(item.published_at || item.first_seen_at)
      let idx = groupIndex.get(key)
      if (idx === undefined) {
        idx = groups.length
        groupIndex.set(key, idx)
        groups.push({ key, label: dateGroupLabel(item.published_at || item.first_seen_at), items: [] })
      }
      groups[idx].items.push(item)
    }
  }

  let globalIndex = 0

  return (
    <div className="space-y-6">
      {visitedCount > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>当前列表已读 {visitedInList}/{items.length} 条</span>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.key}>
          {/* 日期分组标题（平铺模式不展示） */}
          {!flat && (
            <div className="sticky top-16 z-10 flex items-center gap-2 mb-3 py-1">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-600 text-white dark:bg-primary-500 shadow-sm">
                {group.label}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{group.items.length} 条</span>
              <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          )}

          {/* 时间轴：左侧竖线 + 卡片；平铺模式去掉竖线与节点 */}
          <div className={flat ? 'space-y-3' : 'relative pl-5 space-y-3 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-slate-200 dark:before:bg-slate-700'}>
            {group.items.map((item) => {
              const node = (
                <div key={item.id} className="relative">
                  {!flat && (
                    <span className="absolute -left-[15px] top-5 w-2.5 h-2.5 rounded-full bg-primary-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                  <NewsCard
                    item={item}
                    index={globalIndex}
                    isVisited={isVisited(item.url)}
                    isFavorite={isFavorite?.(item.url)}
                    hideRadarMeta={hideRadarMeta}
                    onVisit={onVisit}
                    onToggleFavorite={onToggleFavorite}
                  />
                </div>
              )
              globalIndex++
              return node
            })}
          </div>
        </section>
      ))}
      
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => {
              Analytics.trackLoadMore()
              onLoadMore()
            }}
            className="btn btn-ghost flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
          >
            <span>加载更多</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
