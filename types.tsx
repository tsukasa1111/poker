export type User = {
  id: string
  username: string
  displayName: string
  chips: number
  totalEarnings: number
  totalLosses: number
  lastUpdated: Date
  createdAt: Date
  notes: string
  role: string
  passwordHash?: string
  monthlyTotals?: Record<string, number> // 追加: 月次サマリー { "2025-04": 2340, "2025-05": 1200 }
}
