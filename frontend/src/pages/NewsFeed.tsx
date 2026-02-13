import { useEffect, useState } from 'react'
import { RefreshCw, Filter, TrendingUp, Clock } from 'lucide-react'
import { getNews, getBreakingNews } from '../services/api'
import type { NewsItem, PaginatedResponse } from '../types'
import { formatDistanceToNow } from 'date-fns'

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [breakingNews, setBreakingNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const categories = ['all', 'Politics', 'Business', 'Technology', 'Sports', 'Entertainment', 'Health']

  useEffect(() => {
    loadNews()
    loadBreakingNews()
  }, [selectedCategory, page])

  const loadNews = async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 20 }
      if (selectedCategory !== 'all') params.category = selectedCategory

      const response: PaginatedResponse<NewsItem> = await getNews(params)
      setNews(response.data)
      setTotalPages(response.pagination.pages)
    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBreakingNews = async () => {
    try {
      const response = await getBreakingNews()
      setBreakingNews(response.data || [])
    } catch (error) {
      console.error('Failed to load breaking news:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">News Feed</h1>
          <p className="text-gray-600 mt-1">All published articles from autonomous newsroom</p>
        </div>
        <button onClick={loadNews} className="btn btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Breaking News Banner */}
      {breakingNews.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start">
            <TrendingUp className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">Breaking News</h3>
              <div className="space-y-2">
                {breakingNews.slice(0, 3).map((item) => (
                  <div key={item.id} className="text-sm text-red-800">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-red-600 ml-2">
                      {item.publishedAt && formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => {
              setSelectedCategory(category)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* News Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface NewsCardProps {
  news: NewsItem
}

function NewsCard({ news }: NewsCardProps) {
  return (
    <article className="card hover:shadow-lg transition-shadow">
      {news.imageUrl && (
        <img
          src={news.imageUrl}
          alt={news.title}
          className="w-full h-48 object-cover rounded-t-lg -mx-6 -mt-6 mb-4"
        />
      )}

      <div className="space-y-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {news.breaking && (
            <span className="badge badge-danger">BREAKING</span>
          )}
          {news.category && (
            <span className="badge badge-info">{news.category}</span>
          )}
          <span className={`badge ${
            news.credibilityScore && news.credibilityScore >= 80
              ? 'badge-success'
              : news.credibilityScore && news.credibilityScore >= 60
              ? 'badge-warning'
              : 'badge-danger'
          }`}>
            {news.credibilityScore || 0}% Credible
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
          {news.title}
        </h3>

        {/* Summary */}
        {news.summary && (
          <p className="text-sm text-gray-600 line-clamp-3">
            {news.summary}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {news.publishedAt && formatDistanceToNow(new Date(news.publishedAt), { addSuffix: true })}
          </div>
          {news.sourceName && (
            <span className="font-medium">{news.sourceName}</span>
          )}
        </div>

        {/* Scores */}
        <div className="flex items-center gap-4 text-xs">
          {news.importanceScore !== undefined && (
            <div>
              <span className="text-gray-500">Importance:</span>
              <span className="font-medium ml-1">{news.importanceScore}/100</span>
            </div>
          )}
          {news.engagementScore !== undefined && (
            <div>
              <span className="text-gray-500">Engagement:</span>
              <span className="font-medium ml-1">{news.engagementScore}/100</span>
            </div>
          )}
        </div>

        {/* Trending Indicator */}
        {news.isTrending && (
          <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
            <TrendingUp className="w-3 h-3" />
            Trending Now
          </div>
        )}
      </div>
    </article>
  )
}
