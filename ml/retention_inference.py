import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from ml.retention_features import compute_historical_features

# Feature descriptions and labels for human-readable explanations
FEATURE_EXPLANATIONS = {
    'evidence_count_30d': {
        'label': 'Recent Practice Velocity (30-day)',
        'risk_desc': 'Minimal recent learning activity ({val:.0f} evidence records in last 30 days)',
        'protect_desc': 'Active and consistent learning cadence ({val:.0f} records in last 30 days)'
    },
    'slope_per_30d': {
        'label': 'Skill Trajectory Velocity (30-day)',
        'risk_desc': 'Downward performance momentum ({val:+.1f} pts/month)',
        'protect_desc': 'Upward skill progression ({val:+.1f} pts/month)'
    },
    'evidence_count_90d': {
        'label': 'Quarterly Evidence Volume (90-day)',
        'risk_desc': 'Low overall practice volume ({val:.0f} records in 90 days)',
        'protect_desc': 'Robust multi-month engagement ({val:.0f} records in 90 days)'
    },
    'historical_mean': {
        'label': 'Historical Mean Score',
        'risk_desc': 'Sub-mastery average performance ({val:.1f}/100)',
        'protect_desc': 'Strong historical baseline ({val:.1f}/100)'
    },
    'current_score': {
        'label': 'Current Skill Score',
        'risk_desc': 'Low current proficiency level ({val:.1f}/100)',
        'protect_desc': 'High current proficiency level ({val:.1f}/100)'
    },
    'recent_vs_historical_change': {
        'label': 'Recent vs Historical Performance Gap',
        'risk_desc': 'Recent scores dropping below historical standard ({val:+.1f} pts)',
        'protect_desc': 'Recent scores exceeding historical standard ({val:+.1f} pts)'
    },
    'source_diversity': {
        'label': 'Evidence Source Diversity',
        'risk_desc': 'Single-source evidence lack of multimodal verification ({val:.0f} source type)',
        'protect_desc': 'Multi-modal verification across {val:.0f} distinct source types'
    },
    'maximum_evidence_gap': {
        'label': 'Maximum Practice Gap',
        'risk_desc': 'Large historical gap between learning events ({val:.0f} days)',
        'protect_desc': 'Consistent practice without extended lapses ({val:.0f} days max gap)'
    },
    'average_days_between_evidence': {
        'label': 'Average Interval Between Evidence',
        'risk_desc': 'Infrequent evidence logging (avg {val:.0f} days between events)',
        'protect_desc': 'Regular learning cadence (avg {val:.0f} days between events)'
    },
    'days_since_last_evidence': {
        'label': 'Days Since Last Evidence',
        'risk_desc': 'Extended period of inactivity ({val:.0f} days)',
        'protect_desc': 'Recent learning engagement ({val:.0f} days ago)'
    }
}

DEFAULT_SOURCE_WEIGHTS = {
    'assessment': 1.00,
    'project_outcome': 0.85,
    'course_completion': 0.55
}

class RetentionInferenceEngine:
    _instance = None

    def __init__(self, model_dir: str = "models/retention"):
        self.model_dir = model_dir
        self.model = None
        self.scaler = None
        self.metadata = None
        self._load_artifacts()

    @classmethod
    def get_instance(cls, model_dir: str = "models/retention"):
        if cls._instance is None:
            cls._instance = cls(model_dir=model_dir)
        return cls._instance

    def _load_artifacts(self):
        model_path = os.path.join(self.model_dir, "weibull_model.pkl")
        scaler_path = os.path.join(self.model_dir, "scaler.pkl")
        meta_path = os.path.join(self.model_dir, "model_metadata.json")

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            print(f"[RetentionInferenceEngine] Warning: Model files not found in {self.model_dir}. Need training.")
            return

        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        if os.path.exists(meta_path):
            with open(meta_path, 'r') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {}

        print(f"[RetentionInferenceEngine] Weibull model and scaler loaded successfully.")

    def is_ready(self) -> bool:
        return self.model is not None and self.scaler is not None

    def extract_features_from_trajectory(
        self,
        evidence_records: List[Dict[str, Any]],
        snapshot_time: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract features from a list of evidence dicts.
        Each record must have: timestamp, raw_score, evidence_source
        """
        if not evidence_records:
            return {}

        # Sort chronologically
        sorted_records = sorted(evidence_records, key=lambda x: str(x['timestamp']))

        if snapshot_time is None:
            # Default to 30 days after last evidence or today
            last_ts = np.datetime64(str(sorted_records[-1]['timestamp']))
            # Add 15 days of observation buffer
            snapshot_time = str(last_ts + np.timedelta64(15, 'D'))

        hist_dict = {
            'timestamp': np.array([np.datetime64(str(r['timestamp'])) for r in sorted_records]),
            'raw_score': np.array([float(r['raw_score']) for r in sorted_records], dtype=float),
            'evidence_source': np.array([str(r['evidence_source']) for r in sorted_records])
        }

        features = compute_historical_features(
            hist_dict=hist_dict,
            snapshot_time=snapshot_time,
            source_weights=DEFAULT_SOURCE_WEIGHTS
        )
        return features

    def predict_from_features(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run inference using the loaded Weibull survival model.
        """
        if not self.is_ready():
            raise RuntimeError("Retention model is not loaded. Train or verify model path.")

        feature_names = self.metadata.get('features', [
            'days_since_last_evidence', 'evidence_count_90d', 'historical_mean',
            'recent_vs_historical_change', 'slope_per_30d', 'source_diversity',
            'maximum_evidence_gap', 'average_days_between_evidence', 'current_score'
        ])

        # Prepare feature vector
        raw_vals = [float(features.get(f, 0.0)) for f in feature_names]
        X_df = pd.DataFrame([raw_vals], columns=feature_names)
        X_scaled = pd.DataFrame(self.scaler.transform(X_df), columns=feature_names)

        # 1. Survival probabilities across horizons
        # predict_survival_function returns S(t) = P(T > t)
        sf_df = self.model.predict_survival_function(X_scaled)
        
        horizons = [30, 60, 90, 180]
        survival_probs = {}
        decay_risks = {}
        for h in horizons:
            # find closest time point in survival function
            idx = sf_df.index.get_indexer([h], method='nearest')[0]
            s_prob = float(sf_df.iloc[idx].values[0])
            survival_probs[f"{h}d"] = round(float(np.clip(s_prob, 0.01, 0.99)), 4)
            decay_risks[f"{h}d"] = round(float(np.clip(1.0 - s_prob, 0.01, 0.99)), 4)

        # Primary risk score = probability of decay within 90 days
        risk_score = decay_risks["90d"]

        # Expected days to decay (median survival time)
        median_days = float(self.model.predict_median(X_scaled).values[0])
        expected_days = max(1, int(round(median_days)))

        # Categorize risk level
        if risk_score < 0.30:
            risk_level = "LOW"
            urgency = "Monitor quarterly"
        elif risk_score < 0.60:
            risk_level = "MEDIUM"
            urgency = "Reinforcement recommended within 30 days"
        else:
            risk_level = "HIGH"
            urgency = "Immediate reinforcement action required"

        # 2. Risk factors analysis via Weibull AFT coefficients
        # In AFT: ln(T) = beta_0 + beta * Z.
        # beta * z > 0 delays event (protective)
        # beta * z < 0 accelerates event (risk driver)
        key_risk_factors = []
        coef_dict = self.metadata.get('coefficients', {})

        factor_impacts = []
        for i, feat in enumerate(feature_names):
            val = raw_vals[i]
            z = float(X_scaled[feat].values[0])
            # get coefficient for lambda_
            coef_info = coef_dict.get(feat, {})
            coef = coef_info.get('coef', 0.0)
            
            # Impact on acceleration of failure: negative beta*z means faster failure -> higher risk
            decay_acceleration = -(coef * z) 
            factor_impacts.append({
                'feature': feat,
                'val': val,
                'z': z,
                'decay_acceleration': decay_acceleration,
                'coef': coef
            })

        # Sort by decay acceleration descending (highest risk contributors first)
        factor_impacts.sort(key=lambda x: x['decay_acceleration'], reverse=True)

        for item in factor_impacts:
            feat = item['feature']
            meta = FEATURE_EXPLANATIONS.get(feat, {'label': feat, 'risk_desc': '{val}', 'protect_desc': '{val}'})
            label = meta['label']
            val = item['val']
            is_risk = item['decay_acceleration'] > 0

            desc_template = meta['risk_desc'] if is_risk else meta['protect_desc']
            try:
                description = desc_template.format(val=val)
            except Exception:
                description = f"{label}: {val:.1f}"

            key_risk_factors.append({
                'factor': label,
                'impact': 'negative' if is_risk else 'positive',
                'raw_value': round(val, 2),
                'description': description,
                'severity': 'high' if abs(item['decay_acceleration']) > 0.5 else 'moderate'
            })

        confidence = round(float(features.get('prediction_confidence', 0.85)), 2)

        return {
            'risk_score': round(risk_score, 4),
            'risk_percentage': round(risk_score * 100, 1),
            'risk_level': risk_level,
            'urgency': urgency,
            'confidence': confidence,
            'expected_days_to_decay': expected_days,
            'survival_probabilities': survival_probs,
            'decay_probabilities': decay_risks,
            'key_risk_factors': key_risk_factors[:4], # top 4 actionable factors
            'features_extracted': {k: round(v, 2) if isinstance(v, (int, float)) else v for k, v in features.items()}
        }

    def simulate_intervention(
        self,
        current_evidence: List[Dict[str, Any]],
        action_type: str,
        simulated_score: float,
        days_from_now: int = 0
    ) -> Dict[str, Any]:
        """
        Simulate the impact of a learning intervention on retention risk.
        Appends the hypothetical evidence event, re-computes features, and re-evaluates risk.
        """
        # 1. Baseline prediction
        baseline_features = self.extract_features_from_trajectory(current_evidence)
        baseline_pred = self.predict_from_features(baseline_features)

        # 2. Construct simulated evidence record
        sorted_records = sorted(current_evidence, key=lambda x: str(x['timestamp']))
        last_ts = np.datetime64(str(sorted_records[-1]['timestamp'])) if sorted_records else np.datetime64('2026-06-01')
        sim_ts = last_ts + np.timedelta64(max(0, days_from_now), 'D')

        simulated_record = {
            'evidence_id': 'SIM_INTERVENTION',
            'learner_id': current_evidence[0].get('learner_id', 'L_SIM') if current_evidence else 'L_SIM',
            'competency_id': current_evidence[0].get('competency_id', 'C01') if current_evidence else 'C01',
            'evidence_source': action_type,
            'source_detail': f"Simulated Intervention ({action_type})",
            'timestamp': str(sim_ts),
            'raw_score': float(simulated_score),
            'source_confidence_weight': DEFAULT_SOURCE_WEIGHTS.get(action_type, 0.85)
        }

        # 3. Predict with hypothetical intervention
        extended_evidence = list(current_evidence) + [simulated_record]
        sim_snapshot_time = str(sim_ts + np.timedelta64(1, 'D'))
        sim_features = self.extract_features_from_trajectory(extended_evidence, snapshot_time=sim_snapshot_time)
        sim_pred = self.predict_from_features(sim_features)

        risk_delta = round(sim_pred['risk_score'] - baseline_pred['risk_score'], 4)
        pct_delta = round((sim_pred['risk_percentage'] - baseline_pred['risk_percentage']), 1)
        days_gained = max(0, sim_pred['expected_days_to_decay'] - baseline_pred['expected_days_to_decay'])

        return {
            'original_risk': baseline_pred['risk_score'],
            'original_risk_percentage': baseline_pred['risk_percentage'],
            'original_expected_days': baseline_pred['expected_days_to_decay'],
            'new_risk': sim_pred['risk_score'],
            'new_risk_percentage': sim_pred['risk_percentage'],
            'new_risk_level': sim_pred['risk_level'],
            'new_expected_days_to_decay': sim_pred['expected_days_to_decay'],
            'risk_delta': risk_delta,
            'percentage_delta': pct_delta,
            'expected_days_gained': days_gained,
            'simulated_action': {
                'action_type': action_type,
                'simulated_score': simulated_score,
                'days_from_now': days_from_now
            },
            'simulated_survival_probabilities': sim_pred['survival_probabilities'],
            'simulated_decay_probabilities': sim_pred['decay_probabilities'],
            'updated_key_factors': sim_pred['key_risk_factors']
        }
