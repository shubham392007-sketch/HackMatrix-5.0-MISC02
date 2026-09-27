'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import GlobalHeader from '@/components/layout/GlobalHeader'
import GlobalFooter from '@/components/layout/GlobalFooter'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import TrendBadge from '@/components/ui/TrendBadge'
import ConfidenceBadge from '@/components/ui/ConfidenceBadge'
import { trajectory } from '@/lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function SkillDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const skillId = params.skill as string
  const learnerId = searchParams.get('learner') || searchParams.get('learnerId') || ''
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!learnerId || !skillId) return
    
    setLoading(true)
    trajectory.retention(learnerId, skillId).then(res => {
      setData(res)
    }).catch(err => {
      setError(err.message || 'Failed to load competency data')
    }).finally(() => {
      setLoading(false)
    })
  }, [learnerId, skillId])

  if (!learnerId) {
    return <div className="p-8">Missing learner ID</div>
  }

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen bg-gradient-to-b from-[#FBF1CF] via-[#F6C8D6] to-[#F3A878] text-[#1C1C1C] font-poppins">
        <GlobalHeader />
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        
        {loading && (
          <div className="text-center py-12">
            <p className="font-bold tracking-widest text-sm">GATHERING YOUR EVIDENCE <span className="animate-pulse">···</span></p>
          </div>
        )}

        {error && (
          <div className="bg-[#FBF6DF] border border-[#C85A54] text-[#C85A54] rounded-3xl p-6 mb-8 font-bold">
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-4xl font-bold">{data.competency_name || 'Skill Details'}</h1>
                {data.trend && <TrendBadge trend={data.trend} />}
              </div>
              <div className="flex gap-8">
                <div>
                  <div className="text-5xl font-extrabold">{data.score || 0}</div>
                  <div className="text-sm font-bold opacity-70 uppercase tracking-wide">Current Score</div>
                </div>
                <div>
                  <div className="mt-3">
                    {data.confidence && <ConfidenceBadge value={data.confidence} />}
                  </div>
                  <div className="text-sm font-bold opacity-70 uppercase tracking-wide mt-1">Confidence</div>
                </div>
              </div>
            </div>

            <div className="bg-[#FBF6DF] border border-[#1C1C1C] rounded-[32px] p-6 mb-8">
              <h3 className="font-bold text-xl mb-4">Trajectory</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.evidence_timeline || []}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#1C1C1C', borderRadius: '12px', color: '#FBF1CF', fontWeight: 'bold'}}
                      itemStyle={{color: '#FBF1CF'}}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="var(--color-ink, #1C1C1C)" 
                      strokeWidth={3} 
                      dot={{ fill: '#1C1C1C', r: 4 }} 
                      activeDot={{ r: 6 }} 
                    />
                    {data.survival_curve && (
                      <Line 
                        type="monotone" 
                        dataKey="survival_score" 
                        stroke="var(--color-ink, #1C1C1C)" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false} 
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#FBF6DF] border border-[#1C1C1C] rounded-[32px] p-6">
                <h3 className="font-bold text-xl mb-4">Risk Assessment</h3>
                <div className="text-2xl font-bold mb-2">{data.risk_level || 'Unknown Risk'}</div>
                <div className="space-y-2 mt-4">
                  {data.decay_probabilities && Object.entries(data.decay_probabilities).map(([days, prob]) => (
                    <div key={days} className="flex justify-between items-center text-sm font-semibold">
                      <span>In {days} days:</span>
                      <span className="opacity-70">{(Number(prob) * 100).toFixed(0)}% decay chance</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#FBF6DF] border border-[#1C1C1C] rounded-[32px] p-6">
                <h3 className="font-bold text-xl mb-4">Recommendations</h3>
                <ul className="list-disc pl-5 text-sm space-y-3 font-semibold opacity-90">
                  {data.recommendations?.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                  {(!data.recommendations || data.recommendations.length === 0) && (
                    <li>Keep up the good work! No specific recommendations at this time.</li>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="bg-[#FBF6DF] border border-[#1C1C1C] rounded-[32px] p-6">
              <h3 className="font-bold text-xl mb-4">Evidence Timeline</h3>
              <div className="space-y-4">
                {data.evidence_timeline?.map((ev: any, i: number) => (
                  <div key={i} className="flex gap-4 border-b border-[#1C1C1C]/10 pb-4 last:border-0 last:pb-0">
                    <div className="text-sm font-bold opacity-70 shrink-0 w-24">{ev.date}</div>
                    <div>
                      <div className="font-bold mb-1">{ev.title || 'Evidence Update'}</div>
                      {ev.source && (
                        <span className="text-xs font-bold px-2 py-1 bg-[#1C1C1C] text-[#FBF1CF] rounded-full">
                          {ev.source}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
      <GlobalFooter />
    </div>
    </ProtectedRoute>
  )
}

export default function SkillDetail() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-bold tracking-widest text-sm text-[#1C1C1C]">
          LOADING SKILL DETAILS...
        </div>
      }
    >
      <SkillDetailContent />
    </Suspense>
  )
}
