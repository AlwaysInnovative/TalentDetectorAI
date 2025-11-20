import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="manager" navItems={[
      { label: 'Dashboard', href: '/dashboard/manager', iconName: 'BarChart3' },
      { label: 'Post Job', href: '/dashboard/manager/jobs/new', iconName: 'Briefcase' },
      { label: 'All Jobs', href: '/dashboard/manager/jobs/list', iconName: 'Briefcase' },
      { label: 'Candidates', href: '/dashboard/manager/candidates', iconName: 'Users' },
      { label: 'Interviews', href: '/dashboard/manager/interviews', iconName: 'Calendar' },
      { label: 'Agencies', href: '/dashboard/manager/agencies', iconName: 'Building' },
      { label: 'Analytics', href: '/dashboard/manager/analytics', iconName: 'BarChart3' },
      { label: 'Reports', href: '/dashboard/manager/reports', iconName: 'FileText' },
      { label: 'Profile', href: '/dashboard/manager/profile', iconName: 'User' },
    ]}>
      {children}
    </DashboardLayout>
  )
}
