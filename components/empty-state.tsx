import type React from "react"
interface EmptyStateProps {
  text: string
  icon?: React.ReactNode
}

export function EmptyState({ text, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-text2">
      {icon || (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mb-2 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 12H4M8 16l-4-4 4-4M16 16l4-4-4-4"
          />
        </svg>
      )}
      <p className="text-sm">{text}</p>
    </div>
  )
}
