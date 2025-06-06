"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getAllUsers, type User } from "@/lib/firestore"
import { RefreshCw, Search, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ChipManagementModal } from "./chip-management-modal"

interface UserListProps {
  onUserSelect?: (user: User) => void
}

export default function UserList({ onUserSelect }: UserListProps) {
  const { user: staffUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadUsers = async () => {
    if (!staffUser) {
      setError("認証されていません。再度ログインしてください。")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
      setFilteredUsers(allUsers)
    } catch (err: any) {
      console.error("ユーザー一覧の取得に失敗しました:", err)
      setError(err.message || "ユーザー一覧の取得に失敗しました。")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (staffUser) {
      loadUsers()
    }
  }, [staffUser])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      setFilteredUsers(filtered)
    }
  }, [searchTerm, users])

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setIsModalOpen(true)
    if (onUserSelect) onUserSelect(user)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  const handleUserUpdate = () => {
    loadUsers()
  }

  return (
    <Card className="bg-[#1a1a1a] border-[#333]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>ユーザー一覧</CardTitle>
        <Button onClick={loadUsers} disabled={loading} variant="ghost" size="sm" className="h-8 w-8 p-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-900 text-red-300">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="ユーザーを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0f0f0f] border-[#333] pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <p>読み込み中...</p>
          </div>
        ) : (
          <div className="rounded-md border border-[#333]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-[#222]">
                  <TableHead className="w-[180px]">ユーザー名</TableHead>
                  <TableHead>表示名</TableHead>
                  <TableHead className="text-right">チップ数</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-[#222]">
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.displayName || user.username}</TableCell>
                      <TableCell className="text-right">{user.chips.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleUserSelect(user)}>
                            選択
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {users.length === 0 && !error ? "ユーザーデータがありません" : "ユーザーが見つかりません"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* チップ管理モーダル */}
      <ChipManagementModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleUserUpdate}
      />
    </Card>
  )
}
