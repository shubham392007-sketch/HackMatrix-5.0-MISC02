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
            print(f"[RetentionService] Warning: {evidence_path} not found.")

        if os.path.exists(learners_path):
            self.learners_df = pd.read_csv(learners_path)
            print(f"[RetentionService] Loaded {len(self.learners_df):,} learners.")

    def resolve_learner_id(self, learner_id: str) -> str:
        """Resolve learner_id, with fallback for demo identifiers like user_123"""
        if self.evidence_df is None or self.evidence_df.empty:
            return learner_id

        # If learner_id exists in dataset, return as is
        if learner_id in self.evidence_df['learner_id'].values:
            return learner_id

        # Fallback mapping: 'user_123' or unknown IDs map to L000001
        return "L000001"

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
        return [
            {
                "competency_id": cid,
                "competency_name": COMPETENCIES_MAP.get(cid, cid),
                "evidence_count": int((sub['competency_id'] == cid).sum())
            }
            for cid in comp_ids
        ]

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
