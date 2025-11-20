import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="admin" navItems={[
      { label: 'Dashboard', href: '/dashboard/admin', iconName: 'BarChart3' },
      { label: 'Users', href: '/dashboard/admin/users', iconName: 'Users' },
      { label: 'Settings', href: '/dashboard/admin/settings', iconName: 'Settings' },
    ]}>
      {children}
    </DashboardLayout>
  )
}
