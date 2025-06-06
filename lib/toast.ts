import { toast } from "react-hot-toast"

// トースト通知のラッパー関数
export const showToast = {
  success: (message: string) => {
    toast.success(message)
  },
  error: (message: string) => {
    toast.error(message)
  },
  loading: (message: string) => {
    return toast.loading(message)
  },
  dismiss: (id: string) => {
    toast.dismiss(id)
  },
  // infoメソッドを追加
  info: (message: string) => {
    toast(message, {
      icon: "🔔",
      style: {
        background: "#3b82f6",
        color: "#ffffff",
      },
    })
  },
}
