import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="agency" navItems={[
      { label: 'Dashboard', href: '/dashboard/agency', iconName: 'BarChart3' },
      { label: 'Jobs', href: '/dashboard/agency/jobs', iconName: 'Briefcase' },
      { label: 'Candidates', href: '/dashboard/agency/candidates', iconName: 'Users' },
      { label: 'Managers', href: '/dashboard/agency/managers', iconName: 'Users' },
      { label: 'Placements', href: '/dashboard/agency/placements', iconName: 'Target' },
      { label: 'Analytics', href: '/dashboard/agency/analytics', iconName: 'BarChart3' },
    ]}>
      {children}
    </DashboardLayout>
  )
}
