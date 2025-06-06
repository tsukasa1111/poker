"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getAllUsers, type User } from "@/lib/firestore"
import { Search, AlertTriangle, UserPlus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { debounce } from "lodash"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChipManagementModal } from "./chip-management-modal"
import AddUserDialog from "./add-user-dialog"
import { Button } from "@/components/ui/button" // Button をインポート
import { Dialog, DialogTrigger } from "@/components/ui/dialog" // Dialog, DialogTrigger をインポート

interface UserSearchProps {
  onUserSelect?: (user: User) => void
}

export default function UserSearch({ onUserSelect }: UserSearchProps) {
  const { user: staffUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false) // 新規ユーザー追加モーダルの状態

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

  const filterUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(q) || (user.displayName && user.displayName.toLowerCase().includes(q)),
    )
  }, [query, users])

  const debouncedFilter = useMemo(() => debounce(() => setFilteredUsers(filterUsers), 300), [filterUsers])

  useEffect(() => {
    debouncedFilter()
    return () => debouncedFilter.cancel()
  }, [query, debouncedFilter])

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
    setIsAddUserModalOpen(false) // ユーザー追加後モーダルを閉じる
  }

  const goldButtonClass =
    "bg-[#fde047] text-black hover:bg-[#fcd34d] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#fde047]/50 focus-visible:ring-offset-bg rounded-md text-sm px-3 py-1.5 h-9 flex items-center gap-2 transition-colors duration-150"

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border border-zinc-800/70 rounded-xl shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3 sm:gap-4">
            <h3 className="text-lg font-semibold text-text1">ユーザー検索</h3>
            {/* 新規ユーザー追加ボタンの設置方法を変更 */}
            <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
              <DialogTrigger asChild>
                <Button className={goldButtonClass}>
                  <UserPlus className="h-4 w-4" />
                  新規ユーザー追加
                </Button>
              </DialogTrigger>
              {/* AddUserDialog は DialogContent を含む想定 */}
              <AddUserDialog onUserAdded={handleUserUpdate} />
            </Dialog>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-900 text-red-300">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative w-full">
            <Command className="rounded-lg border border-zinc-700 overflow-visible bg-zinc-950/70">
              <div className="flex items-center border-b border-zinc-700 px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 text-gray-400" />
                <CommandInput
                  placeholder="@ユーザー名 または 表示名で検索..."
                  className="flex h-10 w-full bg-transparent py-3 text-sm text-text1 outline-none placeholder:text-gray-500"
                  value={query}
                  onValueChange={setQuery}
                />
              </div>
              {query && (
                <CommandList className="max-h-60 overflow-auto">
                  {loading ? (
                    <CommandEmpty className="py-6 text-center text-sm text-gray-400">読み込み中...</CommandEmpty>
                  ) : filteredUsers.length > 0 ? (
                    <CommandGroup>
                      {filteredUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          onSelect={() => handleUserSelect(user)}
                          className="flex items-center px-4 py-2.5 hover:bg-zinc-800/60 cursor-pointer aria-selected:bg-zinc-800/60 aria-selected:text-text1"
                        >
                          <div className="flex-1">
                            <p className="text-text1 font-medium">{user.displayName || user.username}</p>
                            <p className="text-xs text-gray-400">@{user.username}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-accent font-mono text-sm">
                              {user.chips != null ? user.chips.toLocaleString() : "N/A"}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : (
                    <CommandEmpty className="py-6 text-center text-sm text-gray-400">
                      該当するユーザーが見つかりません
                    </CommandEmpty>
                  )}
                </CommandList>
              )}
            </Command>
          </div>
        </CardContent>
      </Card>

      <ChipManagementModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleUserUpdate}
      />
    </div>
  )
}
