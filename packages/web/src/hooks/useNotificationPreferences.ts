import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { UpdateNotificationPreferencesInput } from '@kyte/server/src/modules/users/users.model'

export function useUpdateNotificationPreferences(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (preferences: UpdateNotificationPreferencesInput) => {
      const { data, error } = await api.v1.users({ id: userId })['notification-preferences'].patch(preferences)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] })
    },
  })
}
