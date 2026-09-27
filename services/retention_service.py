import os
from typing import Dict, Any, List, Optional
import pandas as pd
from ml.retention_inference import RetentionInferenceEngine

COMPETENCIES_MAP = {
    "C01": "Python Programming",
    "C02": "Data Analysis",
    "C03": "Cloud Deployment",
    "C04": "SQL & Databases",
    "C05": "Communication",
    "C06": "Stakeholder Management",
    "C07": "Team Leadership",
    "C08": "Negotiation",
    "C09": "Product Domain Knowledge",
    "C10": "Financial Acumen",
    "C11": "Customer Empathy",
    "C12": "Project Management"
}

COMPETENCY_NAME_TO_ID = {v: k for k, v in COMPETENCIES_MAP.items()}

class RetentionService:
    _instance = None

    def __init__(self, dataset_dir: str = "misc02_dataset"):
        self.dataset_dir = dataset_dir
        self.evidence_df = None
        self.learners_df = None
        self.engine = RetentionInferenceEngine.get_instance()
        self._load_data()

    @classmethod
    def get_instance(cls, dataset_dir: str = "misc02_dataset"):
        if cls._instance is None:
            cls._instance = cls(dataset_dir=dataset_dir)
        return cls._instance

    def _load_data(self):
        evidence_path = os.path.join(self.dataset_dir, "evidence.csv")
        learners_path = os.path.join(self.dataset_dir, "learners.csv")

        if os.path.exists(evidence_path):
            print(f"[RetentionService] Loading evidence from {evidence_path}...")
            # Load only required columns to optimize memory
            cols = [
                'evidence_id', 'trajectory_id', 'learner_id', 'competency_id',
                'evidence_source', 'source_detail', 'timestamp', 'raw_score',
                'source_confidence_weight'
            ]
            self.evidence_df = pd.read_csv(evidence_path, usecols=cols)
            # Ensure timestamp sorting
            self.evidence_df['timestamp'] = pd.to_datetime(self.evidence_df['timestamp'])
            self.evidence_df = self.evidence_df.sort_values(['learner_id', 'competency_id', 'timestamp'])
            print(f"[RetentionService] Loaded {len(self.evidence_df):,} evidence records.")
        else:
            print(f"[RetentionService] Note: {evidence_path} not found. Initializing built-in demo evidence.")
            sample_records = [
                {'evidence_id': 'E001', 'trajectory_id': 'T001', 'learner_id': 'L000001', 'competency_id': 'C05',
                 'evidence_source': 'course_completion', 'source_detail': 'Executive Communication', 'timestamp': '2026-05-10', 'raw_score': 74.0, 'source_confidence_weight': 1.0},
                {'evidence_id': 'E002', 'trajectory_id': 'T001', 'learner_id': 'L000001', 'competency_id': 'C05',
                 'evidence_source': 'assessment', 'source_detail': 'Midterm Stakeholder Assessment', 'timestamp': '2026-06-15', 'raw_score': 71.0, 'source_confidence_weight': 1.0},
                {'evidence_id': 'E003', 'trajectory_id': 'T001', 'learner_id': 'L000001', 'competency_id': 'C05',
                 'evidence_source': 'project_outcome', 'source_detail': 'Quarterly Strategy Presentation', 'timestamp': '2026-07-20', 'raw_score': 68.0, 'source_confidence_weight': 1.0},
                {'evidence_id': 'E004', 'trajectory_id': 'T002', 'learner_id': 'L000001', 'competency_id': 'C01',
                 'evidence_source': 'assessment', 'source_detail': 'Algorithms & Python Mastery', 'timestamp': '2026-08-01', 'raw_score': 88.0, 'source_confidence_weight': 1.0},
                {'evidence_id': 'E005', 'trajectory_id': 'T002', 'learner_id': 'L000001', 'competency_id': 'C01',
                 'evidence_source': 'project_outcome', 'source_detail': 'Async FastAPI Backend PR', 'timestamp': '2026-09-05', 'raw_score': 92.0, 'source_confidence_weight': 1.0},
            ]
            self.evidence_df = pd.DataFrame(sample_records)
            self.evidence_df['timestamp'] = pd.to_datetime(self.evidence_df['timestamp'])
            self.evidence_df = self.evidence_df.sort_values(['learner_id', 'competency_id', 'timestamp'])

        if os.path.exists(learners_path):
            self.learners_df = pd.read_csv(learners_path)
            print(f"[RetentionService] Loaded {len(self.learners_df):,} learners.")
        else:
            print(f"[RetentionService] Note: {learners_path} not found. Initializing built-in demo learners.")
            sample_learners = [
                {'learner_id': 'L000001', 'role': 'Software Engineer', 'department': 'Engineering', 'tenure_months': 24},
                {'learner_id': 'L000002', 'role': 'Frontend Developer', 'department': 'Engineering', 'tenure_months': 12},
                {'learner_id': 'L000003', 'role': 'Data Scientist', 'department': 'Analytics', 'tenure_months': 36},
                {'learner_id': 'L000004', 'role': 'Product Manager', 'department': 'Product', 'tenure_months': 18},
                {'learner_id': 'L000005', 'role': 'QA Engineer', 'department': 'Engineering', 'tenure_months': 8},
            ]
            self.learners_df = pd.DataFrame(sample_learners)

    def resolve_learner_id(self, learner_id: str) -> str:
        """Resolve learner_id, with fallback mapping legacy IDs or demo identifiers to active primary learner."""
        if self.evidence_df is None or self.evidence_df.empty:
            return learner_id

        # If learner_id exists in dataset, return as is
        if learner_id in self.evidence_df['learner_id'].values:
            return learner_id

        # Fallback mapping: 'user_123', 'L000001', or unknown IDs map to first active learner
        if self.learners_df is not None and not self.learners_df.empty:
            return str(self.learners_df.iloc[0]['learner_id'])
        return "shubham_pokale"

    def get_sample_learners(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return a list of sample learners with metadata for UI dropdown/demo"""
        if self.learners_df is None or self.learners_df.empty:
            return [{"learner_id": "L000001", "role": "Software Engineer", "department": "Engineering"}]

        sample = self.learners_df.head(limit)
        return sample[['learner_id', 'role', 'department', 'tenure_months']].to_dict(orient='records')

    def get_learner_competencies(self, learner_id: str) -> List[Dict[str, Any]]:
        """Get all competencies that have evidence for this learner"""
        resolved_id = self.resolve_learner_id(learner_id)
        if self.evidence_df is None:
            return []

        sub = self.evidence_df[self.evidence_df['learner_id'] == resolved_id]
        if sub.empty:
            return []

        comp_ids = sub['competency_id'].unique().tolist()
        results = []
        for cid in comp_ids:
            c_df = sub[sub['competency_id'] == cid].sort_values('timestamp')
            ev_count = len(c_df)
            if ev_count > 0:
                last_row = c_df.iloc[-1]
                first_row = c_df.iloc[0]
                current_score = float(last_row.get('raw_score', 75.0))
                # Trend calculation based on trajectory progression
                if ev_count >= 2:
                    score_diff = current_score - float(first_row.get('raw_score', current_score))
                    if score_diff > 2.0:
                        trend = "improving"
                    elif score_diff < -2.0:
                        trend = "declining"
                    else:
                        trend = "stagnating"
                else:
                    trend = "stagnating"

                avg_weight = float(c_df['source_confidence_weight'].mean()) if 'source_confidence_weight' in c_df.columns else 0.85
                confidence = min(98.0, max(45.0, (avg_weight * 70.0) + min(28.0, ev_count * 4.0)))

                last_ts = last_row['timestamp']
                last_evidence_date = last_ts.strftime('%Y-%m-%d') if hasattr(last_ts, 'strftime') else str(last_ts)[:10]
                days_since = max(0, int((pd.Timestamp.now() - pd.to_datetime(last_ts)).days))
            else:
                current_score = 72.0
                trend = "insufficient"
                confidence = 50.0
                last_evidence_date = "2026-09-01"
                days_since = 14

            results.append({
                "competency_id": cid,
                "competency_name": COMPETENCIES_MAP.get(cid, cid),
                "current_score": round(current_score, 1),
                "score": round(current_score, 1),
                "trend": trend,
                "confidence": round(confidence, 1),
                "evidence_count": ev_count,
                "last_evidence_date": last_evidence_date,
                "days_since_last": days_since
            })
        return results

    def get_learner_evidence(self, learner_id: str, competency_id: Optional[str] = None) -> List[Dict[str, Any]]:
        resolved_id = self.resolve_learner_id(learner_id)
        if self.evidence_df is None:
            return []

        sub = self.evidence_df[self.evidence_df['learner_id'] == resolved_id]
        if competency_id:
            # Handle name or ID
            c_id = COMPETENCY_NAME_TO_ID.get(competency_id, competency_id)
            sub = sub[sub['competency_id'] == c_id]

        if sub.empty:
            return []

        # Convert back to dict records with ISO format timestamps
        records = sub.to_dict(orient='records')
        for r in records:
            r['timestamp'] = r['timestamp'].strftime('%Y-%m-%d')
        return records

    def get_retention_assessment(self, learner_id: str, competency_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Assess retention risk for a learner and competency.
        If competency_id is omitted, chooses the highest-risk competency and includes an overview of others.
        """
        resolved_id = self.resolve_learner_id(learner_id)
        available_comps = self.get_learner_competencies(resolved_id)

        if not available_comps:
            return {
                "error": f"No learning evidence found for learner '{learner_id}'",
                "resolved_learner_id": resolved_id
            }

        # Determine target competency
        target_cid = None
        if competency_id:
            target_cid = COMPETENCY_NAME_TO_ID.get(competency_id, competency_id)
        else:
            # Analyze all available competencies and select the one with highest risk
            best_assessment = None
            all_summaries = []

            for comp in available_comps:
                cid = comp['competency_id']
                comp_evidence = self.get_learner_evidence(resolved_id, cid)
                if len(comp_evidence) < 2:
                    continue

                features = self.engine.extract_features_from_trajectory(comp_evidence)
                pred = self.engine.predict_from_features(features)

                summary = {
                    "competency_id": cid,
                    "competency_name": COMPETENCIES_MAP.get(cid, cid),
                    "risk_score": pred['risk_score'],
                    "risk_percentage": pred['risk_percentage'],
                    "risk_level": pred['risk_level'],
                    "expected_days_to_decay": pred['expected_days_to_decay']
                }
                all_summaries.append(summary)

                if best_assessment is None or pred['risk_score'] > best_assessment['pred']['risk_score']:
                    best_assessment = {
                        'cid': cid,
                        'pred': pred,
                        'evidence': comp_evidence
                    }

            if best_assessment:
                target_cid = best_assessment['cid']
                pred = best_assessment['pred']
                evidence = best_assessment['evidence']
            else:
                target_cid = available_comps[0]['competency_id']
                evidence = self.get_learner_evidence(resolved_id, target_cid)
                features = self.engine.extract_features_from_trajectory(evidence)
                pred = self.engine.predict_from_features(features)
                all_summaries = []

            # Sort all summaries by risk descending
            all_summaries.sort(key=lambda x: x['risk_score'], reverse=True)

            return {
                "learner_id": learner_id,
                "resolved_learner_id": resolved_id,
                "competency_id": target_cid,
                "competency_name": COMPETENCIES_MAP.get(target_cid, target_cid),
                "risk_score": pred['risk_score'],
                "risk_percentage": pred['risk_percentage'],
                "risk_level": pred['risk_level'],
                "urgency": pred['urgency'],
                "confidence": pred['confidence'],
                "expected_days_to_decay": pred['expected_days_to_decay'],
                "survival_probabilities": pred['survival_probabilities'],
                "decay_probabilities": pred['decay_probabilities'],
                "key_risk_factors": pred['key_risk_factors'],
                "evidence_count": len(evidence),
                "competencies_overview": all_summaries,
                "available_competencies": available_comps
            }

        # Specific competency was requested
        evidence = self.get_learner_evidence(resolved_id, target_cid)
        if not evidence:
            return {"error": f"No evidence found for competency {target_cid}"}

        features = self.engine.extract_features_from_trajectory(evidence)
        pred = self.engine.predict_from_features(features)

        return {
            "learner_id": learner_id,
            "resolved_learner_id": resolved_id,
            "competency_id": target_cid,
            "competency_name": COMPETENCIES_MAP.get(target_cid, target_cid),
            "risk_score": pred['risk_score'],
            "risk_percentage": pred['risk_percentage'],
            "risk_level": pred['risk_level'],
            "urgency": pred['urgency'],
            "confidence": pred['confidence'],
            "expected_days_to_decay": pred['expected_days_to_decay'],
            "survival_probabilities": pred['survival_probabilities'],
            "decay_probabilities": pred['decay_probabilities'],
            "key_risk_factors": pred['key_risk_factors'],
            "evidence_count": len(evidence),
            "available_competencies": available_comps
        }

    def simulate_action(
        self,
        learner_id: str,
        competency_id: str,
        action_type: str,
        simulated_score: float,
        days_from_now: int = 0
    ) -> Dict[str, Any]:
        """Run What-If simulation for a specific intervention"""
        resolved_id = self.resolve_learner_id(learner_id)
        target_cid = COMPETENCY_NAME_TO_ID.get(competency_id, competency_id)
        evidence = self.get_learner_evidence(resolved_id, target_cid)

        if not evidence:
            return {"error": f"No evidence found for competency {target_cid}"}

        sim_result = self.engine.simulate_intervention(
            current_evidence=evidence,
            action_type=action_type,
            simulated_score=simulated_score,
            days_from_now=days_from_now
        )
        sim_result['learner_id'] = learner_id
        sim_result['competency_id'] = target_cid
        sim_result['competency_name'] = COMPETENCIES_MAP.get(target_cid, target_cid)
        return sim_result
