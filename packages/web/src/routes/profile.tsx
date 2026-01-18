import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Settings, Shield, Save, Key, UserCircle } from 'lucide-react'
import { api } from '../api/client'
import { useSession, changePassword } from '../api/auth'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { SearchableSelect } from '../components/ui/SearchableSelect'

export const Route = createFileRoute('/profile')({
  component: ProfileRouteComponent,
})

function ProfileRouteComponent() {
  return (
    <DashboardLayout>
      <ProfilePage />
    </DashboardLayout>
  )
}

type Theme = 'light' | 'dark' | 'system'
type EmailDigest = 'instant' | 'daily' | 'weekly' | 'none'

function ProfilePage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userId = session?.user?.id

  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  const [theme, setTheme] = useState<Theme>('system')
  const [locale, setLocale] = useState('en')
  const [timezone, setTimezone] = useState('UTC')
  const [emailDigest, setEmailDigest] = useState<EmailDigest>('daily')
  const [prefsStatus, setPrefsStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securityStatus, setSecurityStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [securityError, setSecurityError] = useState('')

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const { data, error } = await api.v1.config.get()
      if (error) throw error
      return data
    }
  })

  const { data: user, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await api.v1.users({ id: userId }).get()
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })

  useEffect(() => {
    if (user) {
      setName(user.name)
      setImageUrl(user.image || '')
      setTheme(user.theme)
      setLocale(user.locale)
      setTimezone(user.timezone)
      setEmailDigest(user.emailDigest)
    }
  }, [user])

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!userId) return
      setProfileStatus('saving')
      const { error } = await api.v1.users({ id: userId }).patch({
        name,
        image: imageUrl || undefined,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setProfileStatus('success')
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] })
      queryClient.invalidateQueries({ queryKey: ['session'] })
      setTimeout(() => setProfileStatus('idle'), 3000)
    },
    onError: () => setProfileStatus('error'),
  })

  const updatePreferences = useMutation({
    mutationFn: async () => {
      if (!userId) return
      setPrefsStatus('saving')
      const { error } = await api.v1.users({ id: userId }).preferences.patch({
        theme,
        locale,
        timezone,
        emailDigest,
      } as any)
      if (error) throw error
    },
    onSuccess: () => {
      setPrefsStatus('success')
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] })
      setTimeout(() => setPrefsStatus('idle'), 3000)
    },
    onError: () => setPrefsStatus('error'),
  })

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSecurityError('')
    
    if (newPassword !== confirmPassword) {
      setSecurityError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setSecurityError('Password must be at least 8 characters')
      return
    }

    setSecurityStatus('saving')
    const { error } = await changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true
    })
    
    if (error) {
      setSecurityError(error.message || 'Failed to change password')
      setSecurityStatus('error')
    } else {
      setSecurityStatus('success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSecurityStatus('idle'), 3000)
    }
  }

  if (isLoading) return null

  return (
    <div className="p-12 lg:px-16">
      <header className="mb-10">
        <h1 className="font-heading m-0 text-[32px] font-bold tracking-tight text-black uppercase">
          Account Settings
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500 uppercase">
          Manage your personal profile and preferences
        </p>
      </header>

      <div className="flex max-w-2xl flex-col gap-12 pb-20">
        <section className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6 flex items-center gap-3 border-b border-black/10 pb-4">
            <UserCircle size={20} />
            <h2 className="font-heading text-lg font-bold tracking-wider text-black uppercase">Profile</h2>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-black uppercase">Email Address</label>
              <div className="font-body border border-black bg-black/5 px-3 py-2.5 text-[13px] font-semibold text-black/50">
                {user?.email}
              </div>
              <p className="text-[9px] font-medium text-gray-400 uppercase">Email cannot be changed at this time</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-black uppercase">Full Name</label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Your Name"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-black uppercase">Avatar URL</label>
              <Input 
                value={imageUrl} 
                onChange={(e) => setImageUrl(e.target.value)} 
                placeholder="https://example.com/avatar.png"
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase">
                {profileStatus === 'success' && <span className="text-green-600">Profile updated!</span>}
                {profileStatus === 'error' && <span className="text-red-600">Failed to update profile</span>}
              </div>
              <button
                onClick={() => updateProfile.mutate()}
                disabled={updateProfile.isPending || (name === user?.name && imageUrl === (user?.image || ''))}
                className="hover:bg-accent hover:shadow-brutal-sm flex items-center gap-2 border border-black bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase transition-all hover:-translate-y-0.5 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </section>

        <section className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6 flex items-center gap-3 border-b border-black/10 pb-4">
            <Settings size={20} />
            <h2 className="font-heading text-lg font-bold tracking-wider text-black uppercase">Preferences</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-black uppercase">Theme</label>
              <Select 
                value={theme} 
                onChange={(v) => setTheme(v as Theme)} 
                options={[
                  { id: 'light', name: 'Light' },
                  { id: 'dark', name: 'Dark' },
                  { id: 'system', name: 'System' }
                ]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-black uppercase">Language</label>
              <Select 
                value={locale} 
                onChange={setLocale} 
                options={config?.languages || [
                  { id: 'en', name: 'English' },
                  { id: 'vi', name: 'Vietnamese' }
                ]}
              />
            </div>

            <div className="col-span-full flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-black uppercase">Timezone</label>
              <SearchableSelect 
                value={timezone} 
                onChange={setTimezone} 
                options={config?.timezones.map((tz: any) => ({
                  id: tz.id,
                  name: tz.label,
                  badge: tz.offset
                })) || []}
                placeholder="Select timezone"
                searchPlaceholder="Search timezone..."
              />
            </div>

            <div className="col-span-full flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-black uppercase">Email Notifications</label>
              <Select 
                value={emailDigest} 
                onChange={(v) => setEmailDigest(v as EmailDigest)} 
                options={[
                  { id: 'instant', name: 'Instant' },
                  { id: 'daily', name: 'Daily Digest' },
                  { id: 'weekly', name: 'Weekly Digest' },
                  { id: 'none', name: 'None' }
                ]}
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase">
              {prefsStatus === 'success' && <span className="text-green-600">Preferences saved!</span>}
              {prefsStatus === 'error' && <span className="text-red-600">Failed to save preferences</span>}
            </div>
            <button
              onClick={() => updatePreferences.mutate()}
              disabled={updatePreferences.isPending}
              className="hover:bg-accent hover:shadow-brutal-sm flex items-center gap-2 border border-black bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase transition-all hover:-translate-y-0.5 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />
              {updatePreferences.isPending ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </section>

        <section className="border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6 flex items-center gap-3 border-b border-black/10 pb-4">
            <Shield size={20} />
            <h2 className="font-heading text-lg font-bold tracking-wider text-black uppercase">Security</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-black uppercase">Current Password</label>
              <Input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="••••••••"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold tracking-widest text-black uppercase">New Password</label>
                <Input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold tracking-widest text-black uppercase">Confirm New Password</label>
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase">
                {securityStatus === 'success' && <span className="text-green-600">Password changed!</span>}
                {securityError && <span className="text-red-600">{securityError}</span>}
              </div>
              <button
                type="submit"
                disabled={securityStatus === 'saving' || !currentPassword || !newPassword}
                className="hover:bg-accent hover:shadow-brutal-sm flex items-center gap-2 border border-black bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase transition-all hover:-translate-y-0.5 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Key size={16} />
                {securityStatus === 'saving' ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}