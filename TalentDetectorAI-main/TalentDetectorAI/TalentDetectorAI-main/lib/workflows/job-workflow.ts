export type JobStatus = 'draft' | 'pending_approval' | 'open' | 'closed' | 'filled' | 'cancelled'

export interface WorkflowTransition {
  from: JobStatus
  to: JobStatus
  requiresApproval?: boolean
  notifyUsers?: string[]
}

const WORKFLOW_RULES: WorkflowTransition[] = [
  { from: 'draft', to: 'pending_approval', requiresApproval: false },
  { from: 'draft', to: 'open', requiresApproval: false },
  { from: 'pending_approval', to: 'open', requiresApproval: true, notifyUsers: ['manager'] },
  { from: 'pending_approval', to: 'draft', requiresApproval: false },
  { from: 'open', to: 'closed', requiresApproval: false },
  { from: 'open', to: 'filled', requiresApproval: false },
  { from: 'closed', to: 'open', requiresApproval: false }
]

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return WORKFLOW_RULES.some(rule => rule.from === from && rule.to === to)
}

export function getAvailableTransitions(currentStatus: JobStatus): JobStatus[] {
  return WORKFLOW_RULES
    .filter(rule => rule.from === currentStatus)
    .map(rule => rule.to)
}

export function requiresApproval(from: JobStatus, to: JobStatus): boolean {
  const rule = WORKFLOW_RULES.find(r => r.from === from && r.to === to)
  return rule?.requiresApproval || false
}
