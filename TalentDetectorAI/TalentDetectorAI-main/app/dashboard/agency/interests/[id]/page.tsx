'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Download,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Award,
  Zap,
  Clock,
  Send,
  DollarSign,
  TrendingUp,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import toast from 'react-hot-toast'

// Your Candidate Summary Card component, previously defined, is assumed imported here
import CandidateSummaryCard from '@/components/agency/CandidateSummaryCard'

export default function AgencyInterestDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [interest, setInterest] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingRTR, setGeneratingRTR] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [sendingToHM, setSendingToHM] = useState(false);

  const [candidateSummary, setCandidateSummary] = useState<any>(null);
  const [editedCommission, setEditedCommission] = useState<number>(0);
  const [editedSalaryMin, setEditedSalaryMin] = useState<number>(0);
  const [editedSalaryMax, setEditedSalaryMax] = useState<number>(0);
  const [summarySent, setSummarySent] = useState(false);
  const router = useRouter();

  useEffect(() => { loadInterest(); }, []);

  async function loadInterest() {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not logged in'); return; }

      const { data: interestData, error: interestError } = await supabase
        .from('candidate_interests')
        .select('*')
        .eq('id', params.id)
        .eq('agency_id', user.id)
        .single();

      if (interestError || !interestData) throw new Error('Interest not found');

      const candidateRes = await supabase.from('candidates').select('*').eq('id', interestData.candidate_id).single();
      const jobRes = await supabase.from('jobs').select('*').eq('id', interestData.job_id).single();
      const agencyRes = await supabase.from('profiles').select('*').eq('id', interestData.agency_id).single();

      setInterest({
        ...interestData,
        candidates: candidateRes.data,
        jobs: jobRes.data,
        profiles: agencyRes.data
      });

      // Load existing AI summary if present
      const { data: analytics } = await supabase
        .from('interest_analytics')
        .select('summary')
        .eq('interest_id', params.id)
        .single();

      if (analytics?.summary) {
        setCandidateSummary(analytics.summary);
        setEditedCommission(analytics.summary.commission.percentage);
        setEditedSalaryMin(analytics.summary.salary.proposedMin);
        setEditedSalaryMax(analytics.summary.salary.proposedMax);
        if (analytics?.sent_to_hiring_manager_at) setSummarySent(true);
      }

    } catch (err: any) {
      setError(err?.message || 'Failed to load interest details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateRTR() {
    if (!interest) return;
    setGeneratingRTR(true);
    try {
      const res = await fetch('/api/generate-rtr-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId: interest.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate RTR');
      toast.success('RTR generated and sent to candidate.');
      await loadInterest();
    } catch (e: any) {
      toast.error(e?.message || 'Error generating RTR.');
    } finally {
      setGeneratingRTR(false);
    }
  }

  async function handleGenerateSummary() {
    if (!interest) return;
    setGeneratingSummary(true);
    try {
      const res = await fetch('/api/generate-ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId: interest.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('AI candidate summary generated.');
      await loadInterest(); // Reload to fetch latest summary
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate AI summary.');
    } finally {
      setGeneratingSummary(false);
    }
  }

  async function handleSendToHiringManager() {
    if (!interest || !candidateSummary) return;
    setSendingToHM(true);
    try {
      const res = await fetch('/api/send-summary-to-hiring-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interestId: interest.id,
          editedCommissionPercentage: editedCommission,
          editedSalaryMin,
          editedSalaryMax
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Summary sent to hiring manager.');
      setSummarySent(true);
    } catch (err: any) {
      toast.error(err?.message || 'Error sending summary.');
    } finally {
      setSendingToHM(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-8 bg-white rounded-2xl shadow-lg max-w-lg text-center">
        <AlertCircle className="mx-auto mb-4 w-14 h-14 text-red-500" />
        <h2 className="text-xl font-bold mb-4 text-red-700">Error</h2>
        <p className="mb-4">{error}</p>
        <button onClick={loadInterest} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Try Again</button>
      </div>
    </div>
  );
  if (!interest || !interest.jobs) return null;

  const { jobs: job, candidates: candidate, profiles: agency } = interest;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Back Button */}
        <Link href="/dashboard/manager">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </Link>

        {/* Job details */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow">
          <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
          <div className="flex flex-wrap gap-4 mb-4 text-gray-600 text-sm">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {job.location}</div>
            {job.employment_type && <div className="uppercase">{job.employment_type}</div>}
            {job.salary_min && job.salary_max && (
              <div className="font-semibold">
                £{job.salary_min.toLocaleString()} – £{job.salary_max.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Signed RTR */}
        {interest.right_to_represent_signed && (
          <section className="p-4 bg-green-50 rounded-xl border border-green-300 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-10 h-10 text-green-600" />
              <div>
                <h3 className="font-semibold mb-1">Signed RTR Document Received</h3>
                <p className="text-sm text-gray-700">
                  Signed on {new Date(interest.right_to_represent_signed_at).toLocaleString()}
                </p>
              </div>
            </div>
            {(interest.right_to_represent_pdf_url || interest.right_to_represent_url) && (
              <a href={interest.right_to_represent_pdf_url || interest.right_to_represent_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                <Download className="w-4 h-4" /> Download Signed RTR
              </a>
            )}
          </section>
        )}

        {/* Generate/Refresh AI Summary */}
        {interest.right_to_represent_signed && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {generatingSummary ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Generate AI Summary
                </>
              )}
            </button>
            {/* Send summary to hiring manager */}
            {candidateSummary && !summarySent && (
              <button
                onClick={handleSendToHiringManager}
                disabled={sendingToHM}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sendingToHM ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send to Hiring Manager
                  </>
                )}
              </button>
            )}
            {summarySent && (
              <div className="px-3 py-2 bg-green-100 text-green-700 rounded font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Sent!
              </div>
            )}
          </div>
        )}

        {/* AI Candidate Summary Card */}
        {candidateSummary ? (
          <CandidateSummaryCard
            candidateName={candidate?.name}
            jobTitle={job?.title}
            summary={candidateSummary}
            onOpenFullReport={() => toast('Full report feature')}
          />
        ) : (
          <p className="text-gray-600">Click "Generate AI Summary" to analyze candidate.</p>
        )}

        {/* Additional details like signing, response buttons... */}
        {/* ... Optional: custom response accept/reject UI for manager ... */}

      </div>
    </div>
  )
}
