'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GlobalHeader from '@/components/layout/GlobalHeader';
import GlobalFooter from '@/components/layout/GlobalFooter';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building,
  Briefcase,
  GitBranch,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  User,
  Check,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Step = 1 | 2 | 3 | 4;

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isConfirmed = searchParams.get('confirmed') === 'true';
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1: Personal & Role Information
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('Core Engineering');

  // Step 2: GitHub Integration
  const [githubToken, setGithubToken] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [testingGithub, setTestingGithub] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    tested: boolean;
    valid: boolean;
    message?: string;
    username?: string;
  }>({ tested: false, valid: false });

  // Step 3: Jira Integration
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [showJiraToken, setShowJiraToken] = useState(false);
  const [testingJira, setTestingJira] = useState(false);
  const [jiraStatus, setJiraStatus] = useState<{
    tested: boolean;
    valid: boolean;
    message?: string;
    displayName?: string;
  }>({ tested: false, valid: false });

  // Submission & Global Status
  const [saving, setSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/onboarding');
    }
    if (profile?.onboarding_completed) {
      router.replace(profile.role === 'MANAGER' ? '/manager/dashboard' : '/employee/dashboard');
    }
    if (!fullName) {
      if (profile?.full_name) {
        setFullName(profile.full_name);
      } else if (user?.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
    }
  }, [user, profile, authLoading, router, fullName]);

  // Test GitHub Connection
  const handleTestGithub = async () => {
    if (!githubToken.trim()) {
      setGithubStatus({
        tested: true,
        valid: false,
        message: 'Please provide a GitHub Personal Access Token first.',
      });
      return;
    }
    setTestingGithub(true);
    setGithubStatus({ tested: false, valid: false });

    try {
      const res = await fetch('/api/profile/validate/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken.trim(),
          repository_owner: githubOwner.trim() || undefined,
          repository_name: githubRepo.trim() || undefined,
        }),
      });
      const data = await res.json();
      setGithubStatus({
        tested: true,
        valid: data.valid,
        message: data.message,
        username: data.username,
      });
      if (data.username && !githubUsername) {
        setGithubUsername(data.username);
      }
    } catch {
      setGithubStatus({
        tested: true,
        valid: false,
        message: 'Could not connect to validation server. Please try again.',
      });
    } finally {
      setTestingGithub(false);
    }
  };

  // Test Jira Connection
  const handleTestJira = async () => {
    if (!jiraBaseUrl.trim() || !jiraEmail.trim() || !jiraToken.trim()) {
      setJiraStatus({
        tested: true,
        valid: false,
        message: 'Base URL, Email, and API Token are all required to test Jira.',
      });
      return;
    }
    setTestingJira(true);
    setJiraStatus({ tested: false, valid: false });

    try {
      const res = await fetch('/api/profile/validate/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: jiraBaseUrl.trim(),
          email: jiraEmail.trim(),
          api_token: jiraToken.trim(),
          project_key: jiraProjectKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      setJiraStatus({
        tested: true,
        valid: data.valid,
        message: data.message,
        displayName: data.display_name,
      });
    } catch {
      setJiraStatus({
        tested: true,
        valid: false,
        message: 'Could not connect to validation server. Please try again.',
      });
    } finally {
      setTestingJira(false);
    }
  };

  // Final Onboarding Completion
  const handleCompleteOnboarding = async () => {
    setSaving(true);
    setGeneralError(null);

    try {
      const { data: { session } } = await import('@/lib/supabase').then((m) =>
        m.supabase.auth.getSession()
      );
      const token = session?.access_token || '';

      const payload = {
        full_name: fullName.trim() || undefined,
        job_title: jobTitle.trim(),
        department: department.trim(),
        github: githubToken.trim()
          ? {
              token: githubToken.trim(),
              username: githubUsername.trim() || undefined,
              repository_owner: githubOwner.trim() || undefined,
              repository_name: githubRepo.trim() || undefined,
            }
          : undefined,
        jira: jiraToken.trim()
          ? {
              base_url: jiraBaseUrl.trim(),
              email: jiraEmail.trim(),
              api_token: jiraToken.trim(),
              project_key: jiraProjectKey.trim() || undefined,
            }
          : undefined,
      };

      const res = await fetch('/api/profile/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to complete profile onboarding.');
      }

      await refreshProfile();
      router.push(profile?.role === 'MANAGER' ? '/manager/dashboard' : '/employee/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setGeneralError(msg);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-[#1C1C1C]">
      <GlobalHeader />

      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="max-w-2xl w-full mx-auto space-y-6">
          {/* Top Progress Tracker */}
          <div className="flex items-center justify-between px-2">
            {[
              { num: 1, label: 'Role & Profile' },
              { num: 2, label: 'GitHub' },
              { num: 3, label: 'Jira' },
              { num: 4, label: 'Review' },
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (step.num < currentStep) setCurrentStep(step.num as Step);
                  }}
                  className={`w-8 h-8 rounded-full border border-[#1C1C1C] flex items-center justify-center text-xs font-black transition-all ${
                    currentStep === step.num
                      ? 'bg-[#DFE968] shadow-[2px_2px_0_0_#1C1C1C] scale-105'
                      : currentStep > step.num
                      ? 'bg-[#D3E8D5] text-[#1C1C1C]'
                      : 'bg-[#FBF1CF] opacity-60'
                  }`}
                >
                  {currentStep > step.num ? <Check className="w-4 h-4 stroke-[3]" /> : step.num}
                </button>
                <span className="hidden sm:inline text-xs font-extrabold uppercase tracking-wider text-gray-800">
                  {step.label}
                </span>
                {idx < 3 && <div className="w-6 md:w-12 h-0.5 bg-[#1C1C1C]/20 mx-1" />}
              </div>
            ))}
          </div>

          {/* Main Card */}
          <div className="gl-card p-8 md:p-10 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] rounded-3xl shadow-[4px_4px_0_0_#1C1C1C] space-y-6">
            {/* Header Badge */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> GrowthLens Profile Setup · Step {currentStep} of 4
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {currentStep === 1 && 'Role & Profile Calibration'}
                {currentStep === 2 && 'GitHub Evidence Source'}
                {currentStep === 3 && 'Jira Cloud Evidence Source'}
                {currentStep === 4 && 'Confirm & Encrypt Credentials'}
              </h1>
              <p className="text-sm font-medium text-gray-700 leading-relaxed">
                {currentStep === 1 &&
                  'Configure your engineering specialization. GrowthLens uses this to calibrate longitudinal competency benchmarks.'}
                {currentStep === 2 &&
                  'Feature 1 ingests pull requests, commits, and code review activity. Provide credentials once; they are encrypted at rest.'}
                {currentStep === 3 &&
                  'Feature 1 ingests sprint velocity, technical milestone delivery, and issue history directly from Jira.'}
                {currentStep === 4 &&
                  'Review your configured integration credentials. All keys are encrypted with AES-256 and will never be requested again upon login.'}
              </p>
            </div>

            {isConfirmed && (
              <div className="p-4 rounded-2xl bg-[#D3E8D5] border-[1.5px] border-[#1C1C1C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
                <CheckCircle2 className="w-5 h-5 text-green-800 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed space-y-0.5">
                  <p className="font-extrabold uppercase tracking-wide text-green-950">
                    Email Confirmed Successfully!
                  </p>
                  <p className="font-medium text-green-900">
                    Welcome to GrowthLens. Please configure your profile information and connect your GitHub & Jira credentials below. All features will be unlocked once onboarding is saved.
                  </p>
                </div>
              </div>
            )}

            {generalError && (
              <div className="p-4 rounded-2xl bg-[#F6C8D6] border-[1.5px] border-[#1C1C1C] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold leading-relaxed">{generalError}</p>
              </div>
            )}

            {/* STEP 1: Personal & Role Information */}
            {currentStep === 1 && (
              <div className="space-y-5 pt-2">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ml-4">
                    <User className="w-3.5 h-3.5" /> Full Name
                  </label>
                  <input
                    type="text"
                    required
                    className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium"
                    placeholder="e.g. Priya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ml-4">
                    <Briefcase className="w-3.5 h-3.5" /> Job Title / Specialization
                  </label>
                  <input
                    type="text"
                    required
                    className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium"
                    placeholder="e.g. Senior Backend Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                  <p className="text-[10px] text-gray-500 font-bold ml-4">
                    Determines role-aligned competency matrices and growth paths.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ml-4">
                    <Building className="w-3.5 h-3.5" /> Department / Team
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium cursor-pointer"
                  >
                    <option value="Core Engineering">Core Engineering</option>
                    <option value="AI / Machine Learning">AI / Machine Learning</option>
                    <option value="Platform & Infrastructure">Platform & Infrastructure</option>
                    <option value="Product Architecture">Product Architecture</option>
                    <option value="Security Operations">Security Operations</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={!jobTitle.trim() || !fullName.trim()}
                    onClick={() => setCurrentStep(2)}
                    className="pill-btn pill-btn-primary flex items-center gap-2 text-xs font-black uppercase tracking-wider py-3.5 px-6 disabled:opacity-50"
                  >
                    CONTINUE TO GITHUB <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: GitHub Integration */}
            {currentStep === 2 && (
              <div className="space-y-5 pt-2">
                <div className="p-4 rounded-2xl bg-[#E8F0FE] border border-[#1C1C1C] flex items-start gap-3">
                  <GitBranch className="w-5 h-5 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed space-y-1">
                    <p className="font-bold">GrowthLens Feature 1 uses your GitHub Personal Access Token (PAT)</p>
                    <p className="text-gray-600">
                      Generate a classic token with <span className="font-mono font-bold">repo</span> and{' '}
                      <span className="font-mono font-bold">read:user</span> scopes at{' '}
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-bold inline-flex items-center gap-0.5"
                      >
                        github.com/settings/tokens <ExternalLink className="w-3 h-3" />
                      </a>.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ml-4">
                    <Key className="w-3.5 h-3.5" /> GitHub Personal Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showGithubToken ? 'text' : 'password'}
                      className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-mono text-xs pr-12"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={githubToken}
                      onChange={(e) => {
                        setGithubToken(e.target.value);
                        setGithubStatus({ tested: false, valid: false });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGithubToken(!showGithubToken)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black"
                    >
                      {showGithubToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider ml-4">GitHub Username</label>
                    <input
                      type="text"
                      className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs"
                      placeholder="e.g. shubham392007"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider ml-4">Default Repo (Owner/Name)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="pill-input w-1/2 bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs"
                        placeholder="Owner"
                        value={githubOwner}
                        onChange={(e) => setGithubOwner(e.target.value)}
                      />
                      <input
                        type="text"
                        className="pill-input w-1/2 bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs"
                        placeholder="Repo"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Status Badge */}
                {githubStatus.tested && (
                  <div
                    className={`p-3.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-xs font-bold flex items-center gap-2.5 ${
                      githubStatus.valid ? 'bg-[#D3E8D5]' : 'bg-[#F6C8D6]'
                    }`}
                  >
                    {githubStatus.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-green-800 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-800 flex-shrink-0" />
                    )}
                    <span>{githubStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={testingGithub || !githubToken.trim()}
                    onClick={handleTestGithub}
                    className="pill-btn bg-[#FBF1CF] border border-[#1C1C1C] flex items-center gap-2 text-xs font-black uppercase tracking-wider py-2.5 px-4 disabled:opacity-50"
                  >
                    {testingGithub ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> VERIFYING ···
                      </>
                    ) : (
                      <>TEST CONNECTION</>
                    )}
                  </button>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Tests token authenticity without storing anything yet.
                  </span>
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-[#1C1C1C]/10">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="pill-btn bg-transparent border border-[#1C1C1C] flex items-center gap-1.5 text-xs font-black uppercase py-3 px-4"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> BACK
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="pill-btn bg-transparent hover:bg-gray-100 text-xs font-bold py-3 px-4"
                    >
                      SKIP FOR NOW
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="pill-btn pill-btn-primary flex items-center gap-2 text-xs font-black uppercase tracking-wider py-3 px-6"
                    >
                      CONTINUE TO JIRA <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Jira Integration */}
            {currentStep === 3 && (
              <div className="space-y-5 pt-2">
                <div className="p-4 rounded-2xl bg-[#E8F0FE] border border-[#1C1C1C] flex items-start gap-3">
                  <Globe className="w-5 h-5 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed space-y-1">
                    <p className="font-bold">GrowthLens Feature 1 uses your Jira Cloud REST API credentials</p>
                    <p className="text-gray-600">
                      Create an API token at{' '}
                      <a
                        href="https://id.atlassian.com/manage-profile/security/api-tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-bold inline-flex items-center gap-0.5"
                      >
                        id.atlassian.com <ExternalLink className="w-3 h-3" />
                      </a>.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ml-4">
                    <Globe className="w-3.5 h-3.5" /> Jira Cloud Base URL
                  </label>
                  <input
                    type="url"
                    className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs"
                    placeholder="https://your-workspace.atlassian.net"
                    value={jiraBaseUrl}
                    onChange={(e) => {
                      setJiraBaseUrl(e.target.value);
                      setJiraStatus({ tested: false, valid: false });
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider ml-4">Atlassian Work Email</label>
                    <input
                      type="email"
                      className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs"
                      placeholder="engineer@company.com"
                      value={jiraEmail}
                      onChange={(e) => {
                        setJiraEmail(e.target.value);
                        setJiraStatus({ tested: false, valid: false });
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider ml-4">Default Project Key</label>
                    <input
                      type="text"
                      className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs"
                      placeholder="e.g. ENG or GL"
                      value={jiraProjectKey}
                      onChange={(e) => setJiraProjectKey(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ml-4">
                    <Key className="w-3.5 h-3.5" /> Jira API Token
                  </label>
                  <div className="relative">
                    <input
                      type={showJiraToken ? 'text' : 'password'}
                      className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-mono text-xs pr-12"
                      placeholder="ATATT3xFfGF0xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={jiraToken}
                      onChange={(e) => {
                        setJiraToken(e.target.value);
                        setJiraStatus({ tested: false, valid: false });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowJiraToken(!showJiraToken)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black"
                    >
                      {showJiraToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Jira Validation Status */}
                {jiraStatus.tested && (
                  <div
                    className={`p-3.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-xs font-bold flex items-center gap-2.5 ${
                      jiraStatus.valid ? 'bg-[#D3E8D5]' : 'bg-[#F6C8D6]'
                    }`}
                  >
                    {jiraStatus.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-green-800 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-800 flex-shrink-0" />
                    )}
                    <span>{jiraStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={testingJira || !jiraBaseUrl.trim() || !jiraEmail.trim() || !jiraToken.trim()}
                    onClick={handleTestJira}
                    className="pill-btn bg-[#FBF1CF] border border-[#1C1C1C] flex items-center gap-2 text-xs font-black uppercase tracking-wider py-2.5 px-4 disabled:opacity-50"
                  >
                    {testingJira ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> VERIFYING ···
                      </>
                    ) : (
                      <>TEST JIRA CONNECTION</>
                    )}
                  </button>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Validates against Jira REST API v3 /myself endpoint.
                  </span>
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-[#1C1C1C]/10">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="pill-btn bg-transparent border border-[#1C1C1C] flex items-center gap-1.5 text-xs font-black uppercase py-3 px-4"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> BACK
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="pill-btn bg-transparent hover:bg-gray-100 text-xs font-bold py-3 px-4"
                    >
                      SKIP FOR NOW
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="pill-btn pill-btn-primary flex items-center gap-2 text-xs font-black uppercase tracking-wider py-3 px-6"
                    >
                      REVIEW & COMPLETE <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Review, Security Notice & Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-6 pt-2">
                {/* Security Guarantee Card */}
                <div className="p-4 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] flex items-start gap-3.5 shadow-[2px_2px_0_0_#1C1C1C]">
                  <Shield className="w-6 h-6 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-wider">Enterprise Security Isolation</h3>
                    <p className="text-xs font-medium text-gray-800 leading-relaxed">
                      Your integration credentials are encrypted at rest with AES-256 (Fernet) and isolated from login authentication.
                      They will <span className="font-bold underline">not</span> be requested again upon returning to GrowthLens.
                    </p>
                  </div>
                </div>

                {/* Summary Grid */}
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl border border-[#1C1C1C] bg-[#FBF1CF] flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Profile & Role</span>
                      <p className="text-sm font-extrabold">{fullName || profile?.full_name || 'Engineer'}</p>
                      <p className="text-xs text-gray-600">{jobTitle} · {department}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-bold underline hover:text-black"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#1C1C1C] bg-[#FBF1CF] flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">GitHub Source</span>
                      <p className="text-sm font-extrabold">
                        {githubToken ? (githubUsername ? `@${githubUsername}` : 'Token Configured') : 'Not Configured (Optional)'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {githubOwner && githubRepo ? `${githubOwner}/${githubRepo}` : 'Standard tracking'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {githubToken ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#D3E8D5] border border-[#1C1C1C]">
                          <Check className="w-3 h-3" /> READY
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-500">SKIPPED</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="text-xs font-bold underline hover:text-black"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#1C1C1C] bg-[#FBF1CF] flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Jira Source</span>
                      <p className="text-sm font-extrabold">
                        {jiraToken ? (jiraBaseUrl || 'Instance Configured') : 'Not Configured (Optional)'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {jiraEmail ? jiraEmail : 'Standard tracking'} {jiraProjectKey ? `(${jiraProjectKey})` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {jiraToken ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#D3E8D5] border border-[#1C1C1C]">
                          <Check className="w-3 h-3" /> READY
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-500">SKIPPED</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-xs font-bold underline hover:text-black"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-[#1C1C1C]/10">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="pill-btn bg-transparent border border-[#1C1C1C] flex items-center gap-1.5 text-xs font-black uppercase py-3 px-4"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> BACK
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleCompleteOnboarding}
                    className="pill-btn pill-btn-primary flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 px-8 disabled:opacity-50 shadow-[3px_3px_0_0_#1C1C1C]"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> ENCRYPTING & ACTIVATING ···
                      </>
                    ) : (
                      <>
                        COMPLETE PROFILE & ENTER GROWTHLENS <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col justify-between text-[#1C1C1C]">
          <GlobalHeader />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="gl-card max-w-sm w-full p-8 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-col items-center gap-4 text-center">
              <div className="w-10 h-10 rounded-full border-3 border-[#1C1C1C] border-t-[#DFE968] animate-spin" />
              <p className="text-xs font-extrabold tracking-[0.14em] uppercase text-[#1C1C1C]">
                LOADING ONBOARDING PORTAL ···
              </p>
            </div>
          </main>
          <GlobalFooter />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

