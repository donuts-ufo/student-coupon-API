'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, MousePointer, TrendingUp } from 'lucide-react'

interface KPICardsProps {
  totalViews: number
  totalRedeems: number
  cvr: number
}

// KPI表示カードコンポーネント
export function KPICards({ totalViews, totalRedeems, cvr }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総表示数</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            クーポンの表示回数
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総利用数</CardTitle>
          <MousePointer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalRedeems.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            クーポンの利用回数
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CVR</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{cvr}%</div>
          <p className="text-xs text-muted-foreground">
            コンバージョン率
          </p>
        </CardContent>
      </Card>
    </div>
  )
}