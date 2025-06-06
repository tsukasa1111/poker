"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import ChipManagement from "./chip-management"
import type { User } from "@/lib/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserProfileTab } from "./user-profile-tab"
import { motion } from "framer-motion"
import { Coins, UserIcon } from "lucide-react"

interface ChipManagementModalProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

export function ChipManagementModal({ user, isOpen, onClose, onUpdate }: ChipManagementModalProps) {
  const [activeTab, setActiveTab] = useState<string>("chips")

  /*
  const handleChipUpdate = async () => {
    if (onUpdate) {
      await onUpdate()
    }
  }
  */

  const handleUserUpdate = () => {
    if (onUpdate) onUpdate()
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] w-[95vw] min-h-[580px] max-h-[90vh] overflow-hidden bg-surface1 border-surface2 rounded-lg shadow-lg flex flex-col p-0">
        {" "}
        {/* min-h を調整, overflow-hidden に変更 */}
        <DialogHeader className="space-y-3 pt-6 px-6 pb-4 border-b border-surface2 shrink-0">
          {" "}
          {/* shrink-0 を追加 */}
          <DialogTitle className="text-xl md:text-2xl flex items-center gap-2 text-text1">
            <span className="text-accent">ユーザー管理:</span> {user.displayName || user.username}
          </DialogTitle>
          {user.username && (
            <DialogDescription asChild>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-surface2/50 p-3 rounded-md flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center shadow-sm">
                    <UserIcon className="h-5 w-5 text-text2" />
                  </div>
                  <div>
                    <div className="text-sm text-text2 tabular-nums">ユーザーID: {user.username}</div>
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-gold" />
                      <span className="font-mono text-gold font-bold text-lg tabular-nums">
                        {user.chips.toLocaleString()}
                      </span>
                      <span className="text-xs text-text2">チップ</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-grow flex flex-col overflow-hidden">
          <Tabs defaultValue="chips" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid grid-cols-2 bg-surface2 p-1 rounded-lg mx-6 mt-4 sticky top-0 z-10 shrink-0">
              <TabsTrigger
                value="chips"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md transition-all duration-200 py-2 text-sm"
              >
                <Coins className="h-4 w-4 mr-2" />
                チップ管理
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md transition-all duration-200 py-2 text-sm"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                プロフィール
              </TabsTrigger>
            </TabsList>

            <div className="tab-content-container flex-grow overflow-y-auto px-6 py-4">
              <TabsContent value="chips" className="h-full mt-0 border-0 p-0 outline-none w-full">
                <ChipManagement
                  user={user}
                  onUpdate={onUpdate} // 親コンポーネントのデータ更新用 (例: リスト再取得)
                  onSuccessAndCloseModal={onClose} // モーダルを閉じるためのコールバックを直接渡す
                  inModal={true}
                />
              </TabsContent>
              <TabsContent value="profile" className="h-full mt-0 border-0 p-0 outline-none w-full">
                <UserProfileTab user={user} onUserUpdated={handleUserUpdate} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
