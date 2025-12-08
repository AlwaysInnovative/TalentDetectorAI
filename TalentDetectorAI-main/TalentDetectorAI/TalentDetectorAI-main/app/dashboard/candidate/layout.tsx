import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="candidate" navItems={[
      { label: 'Dashboard', href: '/dashboard/candidate', iconName: 'BarChart3' },
      { label: 'My Profile', href: '/dashboard/candidate/profile', iconName: 'User' },
      { label: 'Browse Jobs', href: '/dashboard/candidate/jobs', iconName: 'Briefcase' },
      { label: 'My Applications', href: '/dashboard/candidate/applications', iconName: 'Send' },
      { label: 'RTR Requests', href: '/dashboard/candidate/rtr', iconName: 'FileText' },
      { label: 'Interviews', href: '/dashboard/candidate/interviews', iconName: 'Calendar' },
      { label: 'AI Tools', href: '/dashboard/candidate/ai-tools', iconName: 'Sparkles' },
      { label: 'Documents', href: '/dashboard/candidate/documents', iconName: 'FolderOpen' },
    ]}>
      {children}
    </DashboardLayout>
  )
}
