"""
Learn & Grow Assessment Generator & Evaluation Engine.
Generates structured diagnostic and mastery assessments using local Ollama (qwen3:8b).
Enforces:
  - Security invariant: Answer keys, rubrics, and explanations are strictly kept on the backend
    and never exposed to the learner prior to submission.
  - Balanced question mix: Conceptual, applied scenarios, code reading/debugging, and practical decisions.
  - Structured output validation, duplicate question checks, and answer-key completeness checks.
  - Deterministic evaluation, mastery signal computation, and attempt feedback.
  - Safe fallback when Ollama is unavailable or times out.
"""

import json
import os
import time
import uuid
from typing import List, Dict, Any, Optional, Tuple
import httpx
from pydantic import BaseModel, Field, field_validator

from backend.app.core.logging import get_logger

logger = get_logger("learning.assessment_generator")


class AssessmentQuestion(BaseModel):
    id: str = Field(..., description="Unique question ID within assessment")
    question_text: str
    category: str = Field(
        ...,
        description="conceptual, applied_scenario, code_analysis, or practical_decision",
    )
    options: List[str] = Field(..., min_length=2)
    correct_index: int = Field(..., ge=0, description="Index of the correct option (0-indexed)")
    explanation: str = Field(..., description="Educational rationale for the correct answer")
    difficulty: str = Field("Intermediate", description="Beginner, Intermediate, or Advanced")
    points: int = Field(20, ge=1)
    hint: Optional[str] = None

    @field_validator("correct_index")
    @classmethod
    def validate_correct_index(cls, v: int, info) -> int:
        options = info.data.get("options", [])
        if options and (v < 0 or v >= len(options)):
            raise ValueError(f"correct_index {v} is out of bounds for options length {len(options)}")
        return v


class AssessmentDefinition(BaseModel):
    assessment_id: str
    title: str
    skill_id: str
    skill_name: str
    learning_objective: str
    difficulty: str = "Intermediate"
    passing_threshold: float = 70.0
    time_limit_minutes: int = 15
    is_synthetic: bool = False
    generation_method: str = "ollama_qwen"
    generation_latency_seconds: Optional[float] = None
    questions: List[AssessmentQuestion] = Field(..., min_length=2)


ASSESSMENT_SYSTEM_PROMPT = """You are the SkillPassport Assessment Engine.
Create a rigorous, technical assessment evaluating mastery of a specific machine learning competency.

CRITICAL INVARIANTS:
1. Provide a balanced mix of questions:
   - Conceptual understanding
   - Applied scenario problem solving
   - Code-reading / debugging (for technical/code-related topics)
   - Practical engineering decision-making
2. Every question MUST have exactly 4 distinct options.
3. Every question MUST designate a valid 0-indexed 'correct_index' (0, 1, 2, or 3).
4. Every question MUST include a detailed, technical 'explanation'.
5. Do NOT duplicate questions.
6. Output ONLY valid JSON adhering strictly to the schema. No markdown backticks.
"""


class LearningAssessmentGenerator:
    """
    Dedicated generator and grader for Learn & Grow assessments.
    """

    def __init__(
        self,
        ollama_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ):
        self.ollama_url = (ollama_url or os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")
        self.model = model or os.environ.get("OLLAMA_QWEN_MODEL") or os.environ.get("OLLAMA_MODEL", "qwen3:8b")
        if timeout_seconds is not None:
            self.timeout_seconds = timeout_seconds
        elif "OLLAMA_ASSESSMENT_TIMEOUT_SECONDS" in os.environ:
            self.timeout_seconds = float(os.environ["OLLAMA_ASSESSMENT_TIMEOUT_SECONDS"])
        else:
            try:
                from backend.app.core.config import get_settings
                settings = get_settings()
                self.timeout_seconds = float(
                    getattr(settings, "effective_assessment_timeout_seconds", getattr(settings, "ollama_assessment_timeout_seconds", 120.0))
                )
            except Exception:
                if "OLLAMA_TIMEOUT_SECONDS" in os.environ:
                    env_val = float(os.environ["OLLAMA_TIMEOUT_SECONDS"])
                    self.timeout_seconds = env_val if env_val > 45.0 else 120.0
                else:
                    self.timeout_seconds = 120.0


    async def generate_assessment(
        self,
        skill_id: str,
        skill_name: str,
        learning_objective: str,
        difficulty: str = "Intermediate",
        step_id: Optional[str] = None,
        roadmap_id: Optional[str] = None,
        is_synthetic: bool = False,
        question_count: int = 4,
    ) -> AssessmentDefinition:
        """
        Generates an assessment via Ollama Qwen3 8B with fallback protection.
        """
        asmt_id = f"asmt-{skill_id[:16]}-{uuid.uuid4().hex[:6]}"
        user_prompt = (
            f"Generate a {question_count}-question technical assessment for:\n"
            f"Skill: {skill_name}\n"
            f"Learning Objective: {learning_objective}\n"
            f"Target Difficulty: {difficulty}\n\n"
            "Output JSON Schema:\n"
            "{\n"
            f'  "title": "{skill_name} Mastery Assessment",\n'
            '  "questions": [\n'
            "    {\n"
            '      "id": "q-1",\n'
            '      "question_text": "Technical question text?",\n'
            '      "category": "applied_scenario",\n'
            '      "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            '      "correct_index": 1,\n'
            '      "explanation": "Why Option B is the correct engineering choice.",\n'
            f'      "difficulty": "{difficulty}",\n'
            '      "points": 25\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                resp = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.model,
                        "think": False,
                        "messages": [
                            {"role": "system", "content": ASSESSMENT_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        "format": "json",
                        "stream": False,
                        "options": {
                            "temperature": 0.2,
                            "num_ctx": 2048,
                            "num_predict": 1024,
                        },
                    },
                )
                elapsed = round(time.perf_counter() - start_time, 2)

                if resp.status_code != 200:
                    logger.warning(
                        f"Ollama assessment generation returned HTTP {resp.status_code}. Using curated generator."
                    )
                    return self._fallback_assessment(
                        skill_id, skill_name, learning_objective, difficulty, asmt_id, is_synthetic, elapsed
                    )

                data = resp.json()
                raw_content = data.get("message", {}).get("content", "{}")
                parsed = json.loads(raw_content)

                raw_questions = parsed.get("questions", [])
                valid_questions: List[AssessmentQuestion] = []
                seen_texts = set()

                for idx, q in enumerate(raw_questions):
                    q_text = q.get("question_text", "").strip()
                    if not q_text or q_text in seen_texts:
                        continue
                    seen_texts.add(q_text)

                    options = q.get("options", [])
                    if len(options) < 2:
                        continue

                    correct_idx = q.get("correct_index", 0)
                    if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx >= len(options):
                        correct_idx = 0

                    valid_questions.append(
                        AssessmentQuestion(
                            id=q.get("id", f"q-{idx+1}"),
                            question_text=q_text,
                            category=q.get("category", "conceptual"),
                            options=options,
                            correct_index=correct_idx,
                            explanation=q.get("explanation", "Correct according to standard best practices."),
                            difficulty=q.get("difficulty", difficulty),
                            points=int(q.get("points", 25)),
                            hint=q.get("hint"),
                        )
                    )

                if len(valid_questions) < 2:
                    logger.warning("Fewer than 2 valid questions generated by Ollama. Using curated generator.")
                    return self._fallback_assessment(
                        skill_id, skill_name, learning_objective, difficulty, asmt_id, is_synthetic, elapsed
                    )

                logger.info(f"Ollama assessment generation successful in {elapsed:.2f}s ({len(valid_questions)} questions)")
                return AssessmentDefinition(
                    assessment_id=asmt_id,
                    title=parsed.get("title", f"{skill_name} Mastery Assessment"),
                    skill_id=skill_id,
                    skill_name=skill_name,
                    learning_objective=learning_objective,
                    difficulty=difficulty,
                    passing_threshold=70.0,
                    time_limit_minutes=15,
                    is_synthetic=is_synthetic,
                    generation_method="ollama_qwen",
                    generation_latency_seconds=elapsed,
                    questions=valid_questions,
                )

        except (httpx.TimeoutException, httpx.ConnectError, json.JSONDecodeError) as e:
            elapsed = round(time.perf_counter() - start_time, 2)
            logger.info(f"Ollama unavailable for assessment generation after {elapsed:.2f}s ({e}). Using curated generator.")
            return self._fallback_assessment(
                skill_id, skill_name, learning_objective, difficulty, asmt_id, is_synthetic, elapsed
            )
        except Exception as e:
            elapsed = round(time.perf_counter() - start_time, 2)
            logger.error(f"Unexpected error in assessment generator after {elapsed:.2f}s: {e}", exc_info=True)
            return self._fallback_assessment(
                skill_id, skill_name, learning_objective, difficulty, asmt_id, is_synthetic, elapsed
            )

    def strip_answers_for_learner(self, assessment: AssessmentDefinition) -> Dict[str, Any]:
        """
        SECURITY INVARIANT:
        Strips correct_index, rubric, and explanation from the assessment payload
        so learners cannot inspect answers in browser network requests.
        """
        safe_questions = []
        for q in assessment.questions:
            safe_questions.append({
                "id": q.id,
                "question_text": q.question_text,
                "text": q.question_text,
                "category": q.category,
                "options": q.options,
                "difficulty": q.difficulty,
                "points": q.points,
                "hint": q.hint,
            })

        return {
            "assessment_id": assessment.assessment_id,
            "title": assessment.title,
            "skill_id": assessment.skill_id,
            "skill_name": assessment.skill_name,
            "learning_objective": assessment.learning_objective,
            "difficulty": assessment.difficulty,
            "passing_threshold": assessment.passing_threshold,
            "time_limit_minutes": assessment.time_limit_minutes,
            "total_questions": len(safe_questions),
            "questions": safe_questions,
            "generation_method": assessment.generation_method,
            "generation_latency_seconds": assessment.generation_latency_seconds,
        }

    def grade_assessment(
        self,
        assessment: AssessmentDefinition,
        submitted_answers: Dict[str, int],
    ) -> Dict[str, Any]:
        """
        Grades submitted answers strictly against the stored protected answer keys.
        Computes score, passed status, feedback, and recommended next action.
        """
        total_points = sum(q.points for q in assessment.questions)
        earned_points = 0
        detailed_results = []

        q_map = {q.id: q for q in assessment.questions}

        for q in assessment.questions:
            chosen_idx = submitted_answers.get(q.id)
            is_correct = chosen_idx is not None and chosen_idx == q.correct_index

            if is_correct:
                earned_points += q.points

            detailed_results.append({
                "question_id": q.id,
                "question_text": q.question_text,
                "selected_option_index": chosen_idx,
                "selected_option_text": q.options[chosen_idx] if chosen_idx is not None and chosen_idx < len(q.options) else None,
                "correct_option_index": q.correct_index,
                "correct_option_text": q.options[q.correct_index],
                "is_correct": is_correct,
                "points_earned": q.points if is_correct else 0,
                "explanation": q.explanation,
            })

        score_percentage = round((earned_points / max(1, total_points)) * 100, 1)
        passed = score_percentage >= assessment.passing_threshold

        # Compute mastery contribution (Assessment signal = 20% weight in mastery formula)
        computed_mastery = round(score_percentage * 0.20, 1)

        recommendation = (
            "Assessment passed! Prerequisite met to advance to the next learning stage."
            if passed
            else "Score below passing threshold. Review recommended resources and practical exercises before retaking."
        )

        return {
            "assessment_id": assessment.assessment_id,
            "skill_id": assessment.skill_id,
            "total_questions": len(assessment.questions),
            "total_points": total_points,
            "earned_points": earned_points,
            "score_percentage": score_percentage,
            "passing_threshold": assessment.passing_threshold,
            "passed": passed,
            "computed_mastery": computed_mastery,
            "recommendation": recommendation,
            "results": detailed_results,
        }

    def _fallback_assessment(
        self,
        skill_id: str,
        skill_name: str,
        learning_objective: str,
        difficulty: str,
        asmt_id: str,
        is_synthetic: bool,
        latency_seconds: Optional[float] = None,
    ) -> AssessmentDefinition:
        """
        Deterministic, technically accurate fallback question set tailored to ML skills.
        """
        name_lower = skill_name.lower()
        if "preprocess" in name_lower or "pandas" in name_lower:
            questions = [
                AssessmentQuestion(
                    id="q-prep-1",
                    question_text="When preparing features for linear models, which scaler is most robust to extreme outliers?",
                    category="applied_scenario",
                    options=[
                        "StandardScaler using z-score normalization",
                        "MinMaxScaler scaling between [0, 1]",
                        "RobustScaler using median and interquartile range (IQR)",
                        "MaxAbsScaler dividing by maximum absolute value",
                    ],
                    correct_index=2,
                    explanation="RobustScaler removes the median and scales the data according to the Interquartile Range (IQR), making it resistant to extreme outliers.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-prep-2",
                    question_text="Why must fit_transform be called only on the training set, while only transform is called on validation/test sets?",
                    category="conceptual",
                    options=[
                        "To prevent memory leaks in the GPU allocator",
                        "To prevent data leakage from the evaluation distribution into training parameters",
                        "Because transform requires pre-computed test target labels",
                        "Because Scikit-Learn pipelines throw a syntax error if fit is called twice",
                    ],
                    correct_index=1,
                    explanation="Fitting scalers or transformers on evaluation data leaks information about the test distribution into the training process, leading to optimistically biased performance estimates.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-prep-3",
                    question_text="Consider a DataFrame with 15% missing values in a column with MAR (Missing at Random) pattern. Which strategy preserves feature distribution without target leakage?",
                    category="code_analysis",
                    options=[
                        "Drop all rows with missing values using df.dropna()",
                        "Impute with global test-set mean",
                        "Fit an IterativeImputer or KNNImputer on the training fold within a Pipeline",
                        "Replace missing values with 0 unconditionally",
                    ],
                    correct_index=2,
                    explanation="Fitting an IterativeImputer or KNNImputer inside a Pipeline ensures imputation parameters are learned strictly from the training fold without data leakage.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-prep-4",
                    question_text="When encoding high-cardinality nominal categorical features (>1000 categories) for tree-based models, which approach avoids dimensionality explosion?",
                    category="practical_decision",
                    options=[
                        "One-Hot Encoding with drop='first'",
                        "Target Encoding with out-of-fold smoothing or CatBoost encoding",
                        "Integer ordinal encoding assigning arbitrary alphabetized indices",
                        "MinMax scaling the category strings",
                    ],
                    correct_index=1,
                    explanation="Target encoding with smoothing compresses high-cardinality features into a single continuous column without memory explosion, provided out-of-fold regularization is applied.",
                    difficulty=difficulty,
                    points=25,
                ),
            ]
        elif "feature" in name_lower:
            questions = [
                AssessmentQuestion(
                    id="q-fe-1",
                    question_text="Which technique is best suited for detecting multicollinear features before training a linear regression model?",
                    category="conceptual",
                    options=[
                        "Variance Inflation Factor (VIF)",
                        "Silhouette score",
                        "F1-macro score",
                        "ROC-AUC score",
                    ],
                    correct_index=0,
                    explanation="VIF measures how much the variance of an estimated regression coefficient increases when features are correlated.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-fe-2",
                    question_text="When generating interaction features (e.g. x1 * x2), what risk must be mitigated to prevent model degradation?",
                    category="applied_scenario",
                    options=[
                        "Loss of gradient during backpropagation",
                        "Curse of dimensionality and feature correlation leading to overfitting",
                        "Automatic conversion of continuous variables to booleans",
                        "Inability to compute cross-entropy loss",
                    ],
                    correct_index=1,
                    explanation="Combinatorial feature generation rapidly increases dimensionality and introduces redundancy, requiring feature selection.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-fe-3",
                    question_text="Which automated feature selection method penalizes coefficients with an L1 norm, driving irrelevant feature weights to exactly zero?",
                    category="code_analysis",
                    options=[
                        "Ridge Regression",
                        "Lasso (L1 Regularization)",
                        "Principal Component Analysis",
                        "K-Means Clustering",
                    ],
                    correct_index=1,
                    explanation="Lasso regression adds an L1 penalty to the loss function, producing sparse models by setting less important feature weights to zero.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-fe-4",
                    question_text="In time-series feature engineering, what error occurs if a rolling 7-day average includes the target value of the current timestamp?",
                    category="practical_decision",
                    options=[
                        "Lookahead bias / temporal leakage",
                        "Covariate shift",
                        "Underfitting",
                        "Class imbalance",
                    ],
                    correct_index=0,
                    explanation="Including the current or future timestamp values in lag or rolling calculations introduces lookahead bias, making offline scores artificially optimistic.",
                    difficulty=difficulty,
                    points=25,
                ),
            ]
        elif "evaluation" in name_lower or "model" in name_lower:
            questions = [
                AssessmentQuestion(
                    id="q-eval-1",
                    question_text="For an imbalanced fraud detection problem (0.1% fraud), which metric should be prioritized over standard ROC-AUC?",
                    category="applied_scenario",
                    options=[
                        "Raw Accuracy",
                        "Precision-Recall AUC (PR-AUC)",
                        "Mean Squared Error",
                        "Explained Variance Score",
                    ],
                    correct_index=1,
                    explanation="PR-AUC focuses on the minority positive class without being inflated by true negatives, making it superior for extreme class imbalance.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-eval-2",
                    question_text="What is the primary indicator of probability calibration in a binary classification model?",
                    category="conceptual",
                    options=[
                        "Brier score and calibration curves (reliability diagrams)",
                        "Gini coefficient only",
                        "Cosine similarity of weights",
                        "L2 norm of predictions",
                    ],
                    correct_index=0,
                    explanation="Reliability diagrams plot mean predicted probabilities against observed positive frequencies, and Brier score quantifies probability accuracy.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-eval-3",
                    question_text="When validating data where observations from the same customer appear multiple times, which cross-validation strategy is required?",
                    category="practical_decision",
                    options=[
                        "KFold with shuffle=True",
                        "GroupKFold grouped by customer ID",
                        "Leave-One-Out Cross-Validation",
                        "StratifiedKFold without group grouping",
                    ],
                    correct_index=1,
                    explanation="GroupKFold ensures that all records from the same customer are kept exclusively in either training or validation, preventing identity leakage.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-eval-4",
                    question_text="If training loss is 0.05 while validation loss is 0.85, what condition is present, and what is the appropriate remediation?",
                    category="code_analysis",
                    options=[
                        "Underfitting; increase model capacity",
                        "Overfitting; introduce regularization, dropout, or increase training data",
                        "Label leakage; invert validation predictions",
                        "Learning rate too low; increase learning rate by 10x",
                    ],
                    correct_index=1,
                    explanation="A large gap between low training loss and high validation loss indicates high variance (overfitting), requiring regularization or simpler models.",
                    difficulty=difficulty,
                    points=25,
                ),
            ]
        elif "deep" in name_lower:
            questions = [
                AssessmentQuestion(
                    id="q-dl-1",
                    question_text="Which activation function mitigates the vanishing gradient problem in deep feedforward networks by having a constant gradient for positive inputs?",
                    category="conceptual",
                    options=[
                        "Sigmoid",
                        "Hyperbolic Tangent (Tanh)",
                        "Rectified Linear Unit (ReLU)",
                        "Softmax",
                    ],
                    correct_index=2,
                    explanation="ReLU maintains a derivative of 1 for all positive activations, preventing gradients from decaying exponentially across deep layers.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-dl-2",
                    question_text="In PyTorch training loops, why must optimizer.zero_grad() be called before loss.backward()?",
                    category="code_analysis",
                    options=[
                        "To clear accumulated gradients from previous batches",
                        "To reset the model weights to random initialization",
                        "To free GPU VRAM used by tensor allocations",
                        "To disable dropout layers during backpropagation",
                    ],
                    correct_index=0,
                    explanation="PyTorch accumulates gradients on every backward pass by default; zero_grad() resets them so gradients do not compound across iterations.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-dl-3",
                    question_text="What is the primary role of Batch Normalization during deep neural network training?",
                    category="applied_scenario",
                    options=[
                        "To replace gradient descent with closed-form inversion",
                        "To stabilize layer activations and smooth the loss landscape, enabling higher learning rates",
                        "To encrypt activations before saving checkpoints",
                        "To convert floating point tensors to integers",
                    ],
                    correct_index=1,
                    explanation="Batch Normalization re-centers and re-scales layer inputs, smoothing the optimization landscape and reducing internal covariate shift.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-dl-4",
                    question_text="When training a neural network with cross-entropy loss, why is Softmax applied to logits rather than raw argmax?",
                    category="practical_decision",
                    options=[
                        "Because argmax is non-differentiable and cannot propagate gradients",
                        "Because Softmax guarantees zero loss on validation sets",
                        "Because argmax requires integer inputs",
                        "Because Softmax reduces the number of output classes",
                    ],
                    correct_index=0,
                    explanation="Argmax is a step function with zero gradient almost everywhere, whereas Softmax produces smooth, differentiable probability distributions.",
                    difficulty=difficulty,
                    points=25,
                ),
            ]
        else:  # deployment / serving
            questions = [
                AssessmentQuestion(
                    id="q-dep-1",
                    question_text="When deploying a Scikit-Learn or PyTorch model for high-throughput low-latency inference, what format optimizes cross-platform runtime execution?",
                    category="practical_decision",
                    options=[
                        "Raw Python pickle (.pkl) without validation",
                        "ONNX (Open Neural Network Exchange) runtime or TorchScript",
                        "CSV text file containing weights",
                        "Raw Jupyter notebook execution",
                    ],
                    correct_index=1,
                    explanation="ONNX Runtime and TorchScript compile the computation graph into optimized C++ binaries, eliminating Python GIL bottlenecks and improving throughput.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-dep-2",
                    question_text="Why is unpickling untrusted model files (pickle.load) a critical security vulnerability in production ML services?",
                    category="applied_scenario",
                    options=[
                        "Pickle files cannot store float32 numbers",
                        "Pickle deserialization can execute arbitrary malicious code via __reduce__ hooks",
                        "Pickle increases latency by 100x compared to JSON",
                        "Pickle requires root operating system privileges",
                    ],
                    correct_index=1,
                    explanation="Python's pickle module allows constructor execution during unpickling, enabling remote code execution (RCE) if model artifacts are compromised.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-dep-3",
                    question_text="In an async FastAPI serving application, how should long CPU-bound model inferences be handled to prevent event loop blocking?",
                    category="code_analysis",
                    options=[
                        "Run inferences directly on the main async event loop",
                        "Offload inference to a process pool or use asyncio.to_thread / BackgroundTasks",
                        "Set time.sleep() inside the async endpoint",
                        "Disable HTTP keep-alive",
                    ],
                    correct_index=1,
                    explanation="Synchronous CPU-bound operations freeze the Python asyncio event loop; offloading to a thread or worker process maintains API responsiveness.",
                    difficulty=difficulty,
                    points=25,
                ),
                AssessmentQuestion(
                    id="q-dep-4",
                    question_text="What monitoring technique detects differences between the distribution of incoming production inference data and training data?",
                    category="conceptual",
                    options=[
                        "Data drift detection using Population Stability Index (PSI) or Kolmogorov-Smirnov test",
                        "Checking CPU clock frequencies",
                        "Measuring HTTP 404 error frequency",
                        "Counting line numbers in deployment scripts",
                    ],
                    correct_index=0,
                    explanation="PSI and KS-tests statistically compare production feature distributions against baseline reference distributions to detect covariate drift.",
                    difficulty=difficulty,
                    points=25,
                ),
            ]

        return AssessmentDefinition(
            assessment_id=asmt_id,
            title=f"{skill_name} Mastery Assessment",
            skill_id=skill_id,
            skill_name=skill_name,
            learning_objective=learning_objective,
            difficulty=difficulty,
            passing_threshold=70.0,
            time_limit_minutes=15,
            is_synthetic=is_synthetic,
            generation_method="heuristic_fallback",
            generation_latency_seconds=latency_seconds,
            questions=questions,
        )


# Global instance and exports
AssessmentGenerator = LearningAssessmentGenerator
assessment_generator = LearningAssessmentGenerator()
strip_answers_for_learner = assessment_generator.strip_answers_for_learner
grade_assessment = assessment_generator.grade_assessment
