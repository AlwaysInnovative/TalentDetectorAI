import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import summaryGenerationService from '../services/summaryGenerationService';

interface SummaryCardProps {
  interestId: string;
  candidateId?: string;
  jobId?: string;
  agencyId?: string;
  onSent?: (summaryId: string) => void;
  onError?: (error: string) => void;
}

interface Summary {
  id: string;
  interest_id: string;
  candidate_id: string;
  job_id: string;
  agency_id: string;
  executive_summary: string;
  skills_match: {
    matched_skills: string[];
    missing_skills: string[];
    additional_skills: string[];
    match_percentage: number;
  };
  key_strengths: string[];
  recommendations: string;
  heat_map: {
    technical_skills: number;
    cultural_fit: number;
    experience_level: number;
    communication_skills: number;
    leadership_potential: number;
  };
  ai_match_score: number;
  status: 'draft' | 'ready' | 'sent' | 'reviewed';
  created_at: string;
  sent_to_hm_at?: string;
  hm_feedback?: string;
}

interface HiringManager {
  id: string;
  email: string;
  full_name: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export const SummaryCard: React.FC<SummaryCardProps> = ({
  interestId,
  candidateId,
  jobId,
  agencyId,
  onSent,
  onError,
}) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [hiringManagers, setHiringManagers] = useState<HiringManager[]>([]);
  const [selectedHM, setSelectedHM] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      try {
        const existingSummary = await summaryGenerationService.getSummary(
          interestId
        );

        if (existingSummary) {
          setSummary(existingSummary as Summary);
        }
      } catch (err) {
        console.error('Error loading summary:', err);
        setError('Failed to load summary');
        onError?.('Failed to load summary');
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [interestId, onError]);

  useEffect(() => {
    const loadHiringManagers = async () => {
      if (!agencyId) return;

      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('agency_id', agencyId)
          .eq('role', 'hiring_manager');

        if (data) {
          setHiringManagers(data);
          if (data.length > 0) {
            setSelectedHM(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading hiring managers:', err);
      }
    };

    loadHiringManagers();
  }, [agencyId]);

  const handleGenerateSummary = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const newSummary = await summaryGenerationService.generateCandidateSummary(
        interestId
      );

      if (newSummary) {
        setSummary(newSummary as Summary);
        setSuccess('Summary generated successfully');
      } else {
        setError('Failed to generate summary');
        onError?.('Failed to generate summary');
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setError('An error occurred while generating the summary');
      onError?.('Error generating summary');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendSummary = async () => {
    if (!summary || !selectedHM) {
      setError('Please select a hiring manager');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/summaries/send-to-hm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaryId: summary.id,
          hiringManagerId: selectedHM,
          agencyId: agencyId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Summary sent to hiring manager successfully');
        setSummary({ ...summary, status: 'sent', sent_to_hm_at: data.sentAt });
        onSent?.(summary.id);
      } else {
        setError(data.message || 'Failed to send summary');
        onError?.(data.message);
      }
    } catch (err) {
      console.error('Error sending summary:', err);
      setError('An error occurred while sending the summary');
      onError?.('Error sending summary');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-100 rounded-lg text-center">
        <div className="animate-spin inline-block w-6 h-6 border-4 border-gray-300 border-t-blue-500 rounded-full"></div>
        <p className="mt-2 text-gray-600">Loading summary...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">
            No Summary Available
          </h3>
          <p className="text-gray-600 mb-4">
            Generate a summary to send to the hiring manager
          </p>
          <button
            onClick={handleGenerateSummary}
            disabled={generating}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Summary'}
          </button>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Candidate Summary</h2>
        <p className="text-blue-100 text-sm">
          Match: {summary.ai_match_score}%
        </p>
      </div>

      {/* Status */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              summary.status === 'sent' 
                ? 'bg-green-100 text-green-800'
                : summary.status === 'ready'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="px-6 py-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">
          Executive Summary
        </h3>
        <div className="bg-blue-50 p-4 rounded border border-blue-200 whitespace-pre-wrap text-sm text-gray-700">
          {summary.executive_summary}
        </div>
      </div>

      {/* Skills Match */}
      <div className="px-6 py-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">
          Skills Match - {summary.skills_match.match_percentage}%
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-green-700 mb-2">Matched ({summary.skills_match.matched_skills.length})</h4>
            <ul className="text-sm space-y-1">
              {summary.skills_match.matched_skills.map((skill, idx) => (
                <li key={idx} className="text-green-600">✓ {skill}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-700 mb-2">Missing ({summary.skills_match.missing_skills.length})</h4>
            <ul className="text-sm space-y-1">
              {summary.skills_match.missing_skills.slice(0, 3).map((skill, idx) => (
                <li key={idx} className="text-red-600">✗ {skill}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-700 mb-2">Additional ({summary.skills_match.additional_skills.length})</h4>
            <ul className="text-sm space-y-1">
              {summary.skills_match.additional_skills.slice(0, 3).map((skill, idx) => (
                <li key={idx} className="text-blue-600">+ {skill}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Heat Map */}
      <div className="px-6 py-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Assessment Heat Map</h3>
        <div className="space-y-3">
          {Object.entries(summary.heat_map).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium capitalize text-gray-700">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-bold text-gray-900">{value}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full"
                  style={{ width: `${value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Strengths */}
      <div className="px-6 py-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Key Strengths</h3>
        <div className="flex flex-wrap gap-2">
          {summary.key_strengths.map((strength, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
            >
              ★ {strength}
            </span>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="px-6 py-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Recommendations</h3>
        <div className="bg-gray-50 p-4 rounded text-sm text-gray-700 whitespace-pre-wrap">
          • {summary.recommendations.split('\n• ').join('\n• ')}
        </div>
      </div>

      {/* Send to Hiring Manager */}
      {summary.status !== 'sent' && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            Send to Hiring Manager
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Hiring Manager
            </label>
            <select
              value={selectedHM}
              onChange={(e) => setSelectedHM(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a hiring manager --</option>
              {hiringManagers.map((hm) => (
                <option key={hm.id} value={hm.id}>
                  {hm.full_name} ({hm.email})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSendSummary}
            disabled={sending || !selectedHM}
            className="w-full px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
          >
            {sending ? 'Sending...' : 'Send Summary'}
          </button>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="px-6 py-3 bg-green-50 border-t border-green-200 text-green-700 text-sm">
          {success}
        </div>
      )}
    </div>
  );
};

export default SummaryCard;
