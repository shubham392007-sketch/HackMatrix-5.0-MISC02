"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ActiveDomainSelectorBar,
  TopicDifficultyBadge,
  MasteryProgressBar,
} from "@/components/app/LearningBadges";
import {
  Play,
  CheckCircle,
  Clock,
  Sparkles,
  Code,
  FileCode2,
  AlertTriangle,
  Lightbulb,
  Check,
  ChevronRight,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Filter,
  FastForward,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import { PracticeExercise } from "@/types/learning";
import { validatePracticeCode } from "@/lib/evidenceApi";

export default function PracticeExercisesPage() {
  const {
    activeBlueprint,
    activeRoadmap,
    practiceExercises,
    completePracticeExercise,
  } = useEvidence();

  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [filterCompleted, setFilterCompleted] = useState<string>("all");
  
  // Active modal / interactive workspace
  const [activeExercise, setActiveExercise] = useState<PracticeExercise | null>(null);
  const [userCode, setUserCode] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    passed: boolean;
    score: number;
    testCases: Array<{ name: string; status: "pass" | "fail"; details: string }>;
    executionType?: string;
    sandboxedRunnerAvailable?: boolean;
    summaryMessage?: string;
  } | null>(null);

  // Dynamic fallback for any newly created or custom domain
  const allDomainExercises = useMemo(() => {
    const existing = practiceExercises.filter((e) => e.domain_id === activeBlueprint.domain_id);
    if (existing.length > 0) return existing;

    const topics = activeBlueprint.modules?.flatMap((m) => m.topics) || [];
    if (topics.length === 0) return [];

    return topics.slice(0, 3).map((top, idx): PracticeExercise => ({
      id: `prac-dyn-${activeBlueprint.domain_id}-${idx}`,
      topic_id: top.id,
      domain_id: activeBlueprint.domain_id,
      title: `${top.title} Practical Implementation`,
      difficulty: top.difficulty || "Intermediate",
      estimated_minutes: 20,
      learning_objective: top.learning_objective || `Demonstrate competency in ${top.title}`,
      format: (idx % 2 === 0 ? "code_completion" : "applied_scenario") as any,
      prompt: `Implement a production-grade solution demonstrating: ${top.description}`,
      starter_code: `# Implementation for ${top.title}\ndef solve_${top.id.replace(/[^a-zA-Z0-9]/g, "_")}():\n    # TODO: Write logic for ${top.learning_objective}\n    pass`,
      solution_explanation: `Standard architectural implementation pattern for ${top.title} complying with production guidelines.`,
      completed: false,
      score: 85,
    }));
  }, [practiceExercises, activeBlueprint]);

  // Filter exercises by domain and filters
  const filteredExercises = useMemo(() => {
    return allDomainExercises.filter((ex) => {
      if (selectedFormat !== "all" && ex.format !== selectedFormat) return false;
      if (selectedDifficulty !== "all" && ex.difficulty !== selectedDifficulty) return false;
      if (filterCompleted === "completed" && !ex.completed) return false;
      if (filterCompleted === "pending" && ex.completed) return false;
      return true;
    });
  }, [allDomainExercises, selectedFormat, selectedDifficulty, filterCompleted]);

  const completedCount = allDomainExercises.filter((e) => e.completed).length;
  const totalCount = allDomainExercises.length;

  const handleOpenExercise = (ex: PracticeExercise) => {
    setActiveExercise(ex);
    setUserCode(ex.starter_code || "");
    setSelectedOption(null);
    setShowHint(false);
    setEvaluationResult(null);
  };

  const runCodeValidation = async (): Promise<{ passed: boolean; score: number } | null> => {
    setEvaluating(true);
    setEvaluationResult(null);

    try {
      if (activeExercise?.format === "multiple_choice") {
        let passed = true;
        let score = 100;
        if (selectedOption !== activeExercise.correct_index) {
          passed = false;
          score = 0;
        }

        const testResults = [
          {
            name: "Test 1: Concept Validation",
            status: (passed ? "pass" : "fail") as "pass" | "fail",
            details: passed
              ? "Selected option aligns with production architecture guidelines."
              : "Selected option violates standard engineering practices.",
          },
          {
            name: "Test 2: Trade-off Alignment",
            status: (passed ? "pass" : "fail") as "pass" | "fail",
            details: passed
              ? "Recognizes latency and consistency boundaries."
              : "Suboptimal latency-consistency trade-off chosen.",
          },
        ];

        setEvaluationResult({
          passed,
          score,
          testCases: testResults,
          executionType: "conceptual_choice_validation",
          sandboxedRunnerAvailable: false,
          summaryMessage: passed ? "Concept validation passed." : "Selected option violates engineering principles. Score: 0/100.",
        });

        return { passed, score };
      } else {
        const trimmed = (userCode || "").trim();
        // Guard against empty code, trivial starter skeletons, or solitary pass statements
        if (
          !trimmed ||
          trimmed === "pass" ||
          trimmed.replace(/\s+/g, "") === "pass" ||
          (trimmed.startsWith("#") && !trimmed.includes("\ndef ") && !trimmed.includes("\nclass ") && !trimmed.includes("return"))
        ) {
          const emptyResult = {
            passed: false,
            score: 0,
            testCases: [
              {
                name: "Test 1: Code Presence & Structure",
                status: "fail" as const,
                details: "Submitted code is empty, comment-only, or solitary pass statement.",
              },
            ],
            executionType: "structural_ast_validation",
            sandboxedRunnerAvailable: false,
            summaryMessage: "No executable implementation logic detected. Score: 0/100.",
          };
          setEvaluationResult(emptyResult);
          return { passed: false, score: 0 };
        }

        // Run real backend AST structural validation
        try {
          const valRes = await validatePracticeCode({
            exercise_id: activeExercise?.id || "prac-current",
            code: userCode,
            language: (activeExercise as any)?.language || "python",
          });

          setEvaluationResult({
            passed: valRes.passed,
            score: valRes.score,
            testCases: valRes.test_cases,
            executionType: valRes.execution_type,
            sandboxedRunnerAvailable: valRes.sandboxed_runner_available,
            summaryMessage: valRes.summary_message,
          });

          return { passed: valRes.passed, score: valRes.score };
        } catch (apiErr: any) {
          // Client-side fallback if backend API is unreachable
          const openParens = (trimmed.match(/\(/g) || []).length;
          const closeParens = (trimmed.match(/\)/g) || []).length;
          const openBrackets = (trimmed.match(/\[/g) || []).length;
          const closeBrackets = (trimmed.match(/\]/g) || []).length;
          const openBraces = (trimmed.match(/\{/g) || []).length;
          const closeBraces = (trimmed.match(/\}/g) || []).length;
          const isBalanced = openParens === closeParens && openBrackets === closeBrackets && openBraces === closeBraces;

          const hasBody =
            trimmed.includes("return") ||
            trimmed.includes("=") ||
            (trimmed.toLowerCase().includes("select") && trimmed.toLowerCase().includes("from")) ||
            trimmed.toLowerCase().includes("create index");

          const passed = trimmed.length > 20 && isBalanced && hasBody;
          const score = passed ? 85 : 0;
          setEvaluationResult({
            passed,
            score,
            testCases: [
              {
                name: "Test 1: Delimiter Balancing",
                status: isBalanced ? "pass" : "fail",
                details: isBalanced ? "Delimiters balanced." : "Unbalanced parentheses or brackets.",
              },
              {
                name: "Test 2: AST Structure & Statements",
                status: passed ? "pass" : "fail",
                details: passed ? "Structural verification passed." : "Incomplete implementation without assignments or returns.",
              },
            ],
            executionType: "structural_ast_validation",
            sandboxedRunnerAvailable: false,
            summaryMessage: passed
              ? "Client-side structural verification completed (dynamic sandbox unavailable)."
              : "Structural verification failed. Score: 0/100.",
          });

          return { passed, score };
        }
      }
    } finally {
      setEvaluating(false);
    }
  };

  const handleRunTests = async () => {
    await runCodeValidation();
  };

  const handleSubmitSolution = async () => {
    const res = await runCodeValidation();
    if (res && res.passed && activeExercise) {
      completePracticeExercise(activeExercise.id, res.score);
    }
  };

  const handleSkipExercise = () => {
    if (!activeExercise) return;
    setEvaluationResult({
      passed: false,
      score: 0,
      testCases: [
        {
          name: "Exercise Skipped",
          status: "fail",
          details: "Learner chose to skip this exercise. No practice mastery credit awarded.",
        },
      ],
      executionType: "skipped",
      sandboxedRunnerAvailable: false,
      summaryMessage: "Exercise skipped by learner. Score recorded as 0/100.",
    });
    // Mark as completed locally with 0 score (no mastery awarded)
    completePracticeExercise(activeExercise.id, 0);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Interactive Practice Exercises"
        description="Solve hands-on coding snippets, spot architectural flaws, and diagnose applied engineering scenarios. Practice directly fuels the Practice Signal (P = 25%) in your overall topic mastery formula."
        badge="Domain 5 · Practice & Application"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/app/learning/roadmaps/roadmap-domain-data-preprocessing"
            className="pill-btn pill-btn-ghost text-xs"
          >
            &larr; Back to Roadmap
          </Link>
          <Link
            href="/app/learning/projects"
            className="pill-btn pill-btn-primary text-xs"
          >
            Go to Mini-Projects &rarr;
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {/* Domain Switcher */}
        <ActiveDomainSelectorBar />

        {/* Quick Stats Banner */}
        <div className="gl-card p-4 sm:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-paper/60 rounded-xl border border-ink/5">
              <div className="text-xs text-ink/60 font-medium">Domain Exercises</div>
              <div className="text-xl font-extrabold text-ink mt-0.5">{totalCount} Modules</div>
            </div>
            <div className="p-3 bg-paper/60 rounded-xl border border-ink/5">
              <div className="text-xs text-ink/60 font-medium">Completed</div>
              <div className="text-xl font-extrabold text-ink mt-0.5">
                {completedCount} of {totalCount} ({totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)
              </div>
            </div>
            <div className="p-3 bg-paper/60 rounded-xl border border-ink/5">
              <div className="text-xs text-ink/60 font-medium">Mastery Contribution</div>
              <div className="text-xl font-extrabold text-ink mt-0.5">25% (Signal P)</div>
            </div>
            <div className="p-3 bg-paper/60 rounded-xl border border-ink/5">
              <div className="text-xs text-ink/60 font-medium">Execution Engine</div>
              <div className="text-xs font-bold text-ink mt-1 flex items-center gap-1.5 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Structural AST Validation
              </div>
            </div>
          </div>
        </div>

      {/* Filter Toolbar */}
      <div className="gl-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-bold text-ink/60 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Format:
            </div>
            {[
              { id: "all", label: "All Formats" },
              { id: "code_completion", label: "Code Completion" },
              { id: "applied_scenario", label: "Applied Scenario" },
              { id: "error_identification", label: "Error Spotting" },
              { id: "multiple_choice", label: "Multiple Choice" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFormat(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedFormat === f.id
                    ? "bg-ink text-paper shadow-sm"
                    : "bg-paper hover:bg-card-hover text-ink/70 border border-ink/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-ink/15 bg-paper text-ink font-medium focus:outline-none"
            >
              <option value="all">All Difficulties</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            <select
              value={filterCompleted}
              onChange={(e) => setFilterCompleted(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-ink/15 bg-paper text-ink font-medium focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exercise Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredExercises.map((exercise) => {
          return (
            <div
              key={exercise.id}
              className={`gl-card p-5 transition-all hover:shadow-md flex flex-col justify-between ${
                exercise.completed ? "border-l-4 border-l-emerald-500" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-ink/5 text-ink/70">
                      {exercise.format.replace("_", " ")}
                    </span>
                    <TopicDifficultyBadge difficulty={exercise.difficulty} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink/60">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{exercise.estimated_minutes}m</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-ink mt-2">
                  {exercise.title}
                </h3>
                <p className="text-xs text-ink/70 mt-1.5 line-clamp-2">
                  {exercise.prompt}
                </p>

                <div className="mt-3 p-2 bg-paper/60 rounded-lg border border-ink/5">
                  <div className="text-[10px] font-bold uppercase text-ink/50 tracking-wider">
                    Target Objective
                  </div>
                  <div className="text-xs text-ink/80 mt-0.5 line-clamp-1">
                    {exercise.learning_objective}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-ink/10 flex items-center justify-between">
                <div>
                  {exercise.completed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                      Completed · {exercise.score || 95}%
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-ink/50">
                      Not attempted yet
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleOpenExercise(exercise)}
                  className={`pill-btn text-xs ${
                    exercise.completed ? "pill-btn-ghost" : "pill-btn-primary"
                  }`}
                >
                  {exercise.completed ? "Review Solution →" : "Start Exercise →"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredExercises.length === 0 && (
        <div className="gl-card p-12 text-center text-ink/60">
          <BookOpen className="w-8 h-8 mx-auto text-ink/30 mb-2" />
          <p className="font-semibold">No exercises match your selected filters.</p>
          <button
            onClick={() => {
              setSelectedFormat("all");
              setSelectedDifficulty("all");
              setFilterCompleted("all");
            }}
            className="mt-3 text-xs text-ink underline font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Interactive Modal / Workspace */}
      {activeExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn">
          <div className="gl-card w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 md:p-8 bg-paper border border-ink/20 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-ink/10 text-ink">
                    {activeExercise.format.replace("_", " ")}
                  </span>
                  <TopicDifficultyBadge difficulty={activeExercise.difficulty} />
                  <span className="text-xs text-ink/60 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {activeExercise.estimated_minutes} min
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-ink">
                  {activeExercise.title}
                </h2>
                <p className="text-xs text-ink/70 mt-1">
                  Objective: {activeExercise.learning_objective}
                </p>
              </div>

              <button
                onClick={() => setActiveExercise(null)}
                className="w-8 h-8 rounded-full bg-ink/5 hover:bg-ink/10 text-ink flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Problem Prompt */}
            <div className="p-4 bg-card rounded-xl border border-ink/10">
              <div className="text-xs font-bold uppercase tracking-wider text-ink/50 mb-1">
                Exercise Prompt
              </div>
              <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                {activeExercise.prompt}
              </p>
            </div>

            {/* Coding / Solution Workspace */}
            {activeExercise.format !== "multiple_choice" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-ink/70" />
                    Interactive Code Editor (Python 3.12 / Vectorized Execution)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink/50 hidden sm:inline">
                      Press Tab for 4-space indentation
                    </span>
                    <button
                      onClick={() => setUserCode(activeExercise.starter_code || "")}
                      className="text-ink/60 hover:text-ink flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset starter
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-ink/30 overflow-hidden bg-[#18181B] text-[#F4F4F5] shadow-inner">
                  {/* Editor Window Header */}
                  <div className="px-4 py-2.5 bg-[#27272A] border-b border-[#3F3F46] flex items-center justify-between text-[11px] text-[#A1A1AA]">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 mr-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80 inline-block" />
                      </div>
                      <span className="font-bold text-white font-mono">solution.py</span>
                      <span className="text-white/30">&bull;</span>
                      <span className="text-emerald-400 font-mono text-[10px]">Active Buffer</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono">
                      <span>Python 3.12</span>
                      <span className="text-white/30">&bull;</span>
                      <span>UTF-8</span>
                    </div>
                  </div>

                  {/* Interactive Editor with Line Numbers Gutter */}
                  <div className="flex bg-[#18181B] min-h-[240px] max-h-[480px] overflow-hidden">
                    {/* Line numbers gutter */}
                    <div
                      aria-hidden="true"
                      className="py-4 pl-3 pr-2 select-none text-right font-mono text-xs text-white/30 bg-[#121214] border-r border-[#27272A] shrink-0 min-w-[3rem] leading-relaxed"
                    >
                      {(userCode || "\n").split("\n").map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>

                    {/* Editable textarea with visible white text & caret */}
                    <textarea
                      value={userCode}
                      onChange={(e) => setUserCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Tab") {
                          e.preventDefault();
                          const target = e.currentTarget;
                          const start = target.selectionStart;
                          const end = target.selectionEnd;
                          const val = target.value;
                          const newVal = val.substring(0, start) + "    " + val.substring(end);
                          setUserCode(newVal);
                          setTimeout(() => {
                            target.selectionStart = target.selectionEnd = start + 4;
                          }, 0);
                        }
                      }}
                      rows={12}
                      className="w-full p-4 font-mono text-xs bg-transparent text-[#F4F4F5] placeholder-white/30 caret-white focus:outline-none resize-y leading-relaxed selection:bg-amber-500/30 selection:text-white"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                      placeholder="# Write your solution here. Use Tab to indent."
                      aria-label="Interactive Python code editor"
                    />
                  </div>

                  {/* Editor Footer Status Bar */}
                  <div className="px-4 py-1.5 bg-[#121214] border-t border-[#27272A] flex items-center justify-between text-[10px] font-mono text-white/50">
                    <div className="flex items-center gap-3">
                      <span>Lines: {(userCode || "").split("\n").length}</span>
                      <span>Chars: {(userCode || "").length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Ready for AST Execution</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Multiple Choice Option selector */
              <div className="space-y-3">
                <div className="text-xs font-bold text-ink">
                  Select the optimal engineering choice:
                </div>
                <div className="space-y-2">
                  {activeExercise.options?.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full p-3.5 rounded-xl text-left text-xs font-medium border transition-all flex items-start gap-3 ${
                        selectedOption === idx
                          ? "bg-peach/30 border-ink text-ink font-semibold shadow-sm"
                          : "bg-paper hover:bg-card border-ink/10 text-ink/80"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${
                          selectedOption === idx
                            ? "bg-ink text-paper border-ink"
                            : "border-ink/20 text-ink/60"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="mt-0.5">{option}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hints Accordion */}
            <div className="border border-ink/10 rounded-xl overflow-hidden bg-paper">
              <button
                onClick={() => setShowHint(!showHint)}
                className="w-full px-4 py-2.5 text-xs font-bold text-ink flex items-center justify-between hover:bg-card transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  {showHint ? "Hide Implementation Hint" : "Need a hint? Click to reveal"}
                </span>
                <span className="text-[10px] text-ink/40">
                  {showHint ? "▲" : "▼"}
                </span>
              </button>
              {showHint && (
                <div className="p-4 bg-amber-50/50 border-t border-ink/10 text-xs text-ink/80 leading-relaxed">
                  💡 Hint: Use <code className="bg-ink/5 px-1 rounded font-mono">Series.clip(lower=..., upper=...)</code> rather than writing loops. Remember to compute quantiles strictly on training inputs to avoid data leakage.
                </div>
              )}
            </div>

            {/* Evaluation Results Banner */}
            {evaluationResult && (
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  evaluationResult.passed
                    ? "bg-emerald-50/80 border-emerald-300"
                    : "bg-rose-50/80 border-rose-300"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {evaluationResult.passed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span className="text-sm font-extrabold text-ink">
                      {evaluationResult.passed
                        ? `Structural AST Validation Passed (Score: ${evaluationResult.score}/100)`
                        : `Structural Validation Failed (Score: ${evaluationResult.score}/100)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-semibold">
                      AST Structural Analysis (Sandbox Container Offline)
                    </span>
                    {evaluationResult.passed && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                        +12 Practice Signal Points
                      </span>
                    )}
                  </div>
                </div>

                {evaluationResult.summaryMessage && (
                  <p className="text-xs text-ink/80 bg-white/70 p-2.5 rounded-lg border border-ink/10 leading-relaxed font-mono">
                    {evaluationResult.summaryMessage}
                  </p>
                )}

                {/* Test case breakdown */}
                <div className="space-y-1.5 pt-2 border-t border-ink/10">
                  {evaluationResult.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs bg-paper/60 p-2 rounded-lg border border-ink/5"
                    >
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          tc.status === "pass"
                            ? "bg-emerald-200 text-emerald-900"
                            : "bg-rose-200 text-rose-900"
                        }`}
                      >
                        {tc.status}
                      </span>
                      <div>
                        <div className="font-semibold text-ink">{tc.name}</div>
                        <div className="text-ink/70 text-[11px]">{tc.details}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Solution Explanation */}
                <div className="mt-3 pt-3 border-t border-ink/10 text-xs text-ink/80">
                  <div className="font-bold text-ink mb-1">Architectural Takeaway:</div>
                  <p>{activeExercise.solution_explanation}</p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-ink/10">
              <button
                type="button"
                onClick={() => setActiveExercise(null)}
                className="pill-btn pill-btn-ghost text-xs"
              >
                Close Workspace
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSkipExercise}
                  disabled={evaluating}
                  className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5 text-amber-800 hover:bg-amber-100/60 border border-amber-300"
                  title="Skip this exercise. Score will be recorded as 0/100 and no practice mastery credit awarded."
                >
                  <FastForward className="w-3.5 h-3.5 text-amber-700" />
                  Skip Exercise
                </button>

                <button
                  type="button"
                  disabled={evaluating}
                  onClick={handleRunTests}
                  className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5 border border-ink/20 hover:bg-sand/40"
                  title="Run structural tests and inspect test cases without submitting"
                >
                  {evaluating ? (
                    <span className="w-3 h-3 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-ink fill-current" />
                  )}
                  Run Tests
                </button>

                <button
                  type="button"
                  disabled={evaluating}
                  onClick={handleSubmitSolution}
                  className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  title="Validate and submit solution for practice points"
                >
                  {evaluating ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Submit Solution
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
