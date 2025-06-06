export interface User {
  id: string
  username: string
  displayName?: string
  chips: number
  createdAt?: number // Optional: Unix timestamp in milliseconds
  updatedAt?: number // Optional: Unix timestamp in milliseconds
}
