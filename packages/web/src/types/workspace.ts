// Local Workspace type with Date flexibility for API responses
export type Workspace = {
  id: string
  name: string
  slug: string
  personal: boolean
  createdAt: string | Date
}
