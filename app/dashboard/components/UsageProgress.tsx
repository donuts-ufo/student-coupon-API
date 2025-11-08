'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle } from 'lucide-react'

interface UsageProgressProps {
  currentUsage: number
  monthlyQuota: number
  tier: string
}

// API使用量プログレスバーコンポーネント
export function UsageProgress({ currentUsage, monthlyQuota, tier }: UsageProgressProps) {
  const usagePercentage = (currentUsage / monthlyQuota) * 100
  const isWarning = usagePercentage > 80

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">API使用量</CardTitle>
        {isWarning && (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            プラン: {tier}
          </span>
          <span className="text-sm font-medium">
            {currentUsage.toLocaleString()} / {monthlyQuota.toLocaleString()}
          </span>
        </div>
        
        <Progress 
          value={usagePercentage} 
          className={isWarning ? 'bg-yellow-100' : ''} 
        />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>今月の利用状況</span>
          <span>{usagePercentage.toFixed(1)}%</span>
        </div>

        {isWarning && (
          <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
            ⚠️ クォータの80%を超過しています。プランのアップグレードを検討してください。
          </div>
        )}
      </CardContent>
    </Card>
  )
}