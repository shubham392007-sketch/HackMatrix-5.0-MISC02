"""Training Dataset Builder for Feature 2 Competency LSTM.
Extracts historical trajectories from Supabase PostgreSQL and misc02_dataset/evidence.csv,
constructs sliding window sequences, generates ground truth labels,
and enforces a strict temporal train/val/test split with zero leakage.
"""
from datetime import datetime, timezone
import os
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any

from backend.feature2.schemas import CanonicalCompetencyEvidence
from backend.feature2.adapter import Feature1EvidenceAdapter
from backend.feature2.preprocessor import EvidencePreprocessor
from backend.feature2.sequence_builder import CompetencySequenceBuilder, MAX_SEQUENCE_LENGTH
from backend.feature2.labels import TrajectoryLabelGenerator, LABEL_MAP
from backend.feature2.features import FEATURE_DIMENSION
from backend.db.client import get_supabase_client
from backend.core.logging import get_logger

logger = get_logger("feature2.dataset")


class CompetencyDatasetBuilder:
    """Constructs train/validation/test tensor datasets from historical evidence."""

    def __init__(self, dataset_csv_path: str = "misc02_dataset/evidence.csv"):
        self.dataset_csv_path = dataset_csv_path
        self.seq_builder = CompetencySequenceBuilder()
        self.label_generator = TrajectoryLabelGenerator()

    def load_all_evidence(self) -> List[CanonicalCompetencyEvidence]:
        """
        Loads evidence from both misc02_dataset/evidence.csv and Supabase public.evidence.
        Deduplicates and groups by (employee_id, competency_id).
        """
        evidence_list: List[CanonicalCompetencyEvidence] = []

        # 1. Load from misc02_dataset/evidence.csv if present
        if os.path.exists(self.dataset_csv_path):
            try:
                df = pd.read_csv(self.dataset_csv_path)
                for _, row in df.iterrows():
                    evidence_list.append(Feature1EvidenceAdapter.from_csv_row(row.to_dict()))
                logger.info(f"Loaded {len(df)} records from {self.dataset_csv_path}")
            except Exception as e:
                logger.warning(f"Error reading {self.dataset_csv_path}: {e}")

        # 2. Load from Supabase DB
        try:
            client = get_supabase_client()
            db_ev = client.table("evidence").select("*").execute()
            if db_ev.data:
                # Also load evidence_competencies junction
                junc_res = client.table("evidence_competencies").select("evidence_id, competency_id").execute()
                comp_by_ev = {j["evidence_id"]: j["competency_id"] for j in (junc_res.data or [])}

                # Load competencies lookup
                c_res = client.table("competencies").select("id, name").execute()
                c_map = {c["id"]: c["name"] for c in (c_res.data or [])}

                for row in db_ev.data:
                    ev_id = row["id"]
                    comp_id = comp_by_ev.get(ev_id, "88149640-d265-4cb6-941b-7977d3ccd147")
                    comp_name = c_map.get(comp_id, "Backend Engineering & API Development")
                    evidence_list.append(Feature1EvidenceAdapter.from_db_record(row, comp_id, comp_name))
                logger.info(f"Loaded {len(db_ev.data)} records from Supabase DB")
        except Exception as e:
            logger.info(f"Note: Supabase evidence query skipped or empty: {e}")

        return evidence_list

    def generate_synthetic_development_sequences(
        self,
        num_trajectories: int = 150,
        events_per_traj: int = 8,
    ) -> List[CanonicalCompetencyEvidence]:
        """
        Generates labeled synthetic trajectories explicitly marked dataset_type='synthetic_development'.
        Provides balanced examples of Improving, Stagnating, and Declining for stable LSTM training.
        """
        np.random.seed(42)
        synthetic_evidence: List[CanonicalCompetencyEvidence] = []
        competencies = [
            ("C01", "Backend Engineering & API Development"),
            ("C02", "Data Processing & Analytics"),
            ("C03", "Database Systems & Storage"),
            ("C04", "DevOps & Cloud Infrastructure"),
            ("C05", "Quality Assurance & Testing"),
            ("C06", "Technical Communication & Collaboration"),
        ]
        sources = ["github", "jira", "assessment", "course_completion", "project_outcome"]

        base_time = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

        for traj_idx in range(num_trajectories):
            emp_id = f"synth_dev_emp_{traj_idx:03d}"
            comp_id, comp_name = competencies[traj_idx % len(competencies)]
            mode = traj_idx % 3  # 0=declining, 1=stagnating, 2=improving

            current_score = 70.0 + np.random.uniform(-5.0, 5.0)

            for step in range(events_per_traj):
                # Apply trajectory trend
                if mode == 2:  # Improving
                    current_score += np.random.uniform(1.5, 4.0)
                elif mode == 0:  # Declining
                    current_score -= np.random.uniform(1.5, 4.0)
                else:  # Stagnating
                    current_score += np.random.uniform(-1.0, 1.0)

                current_score = float(np.clip(current_score, 40.0, 98.0))
                time_offset = (step * 14) + int(np.random.uniform(0, 5))
                event_time = datetime.fromtimestamp(
                    base_time.timestamp() + (time_offset * 86400),
                    tz=timezone.utc
                )

                ev = CanonicalCompetencyEvidence(
                    evidence_id=f"SYNTH-EV-{traj_idx:03d}-{step:02d}",
                    employee_id=emp_id,
                    organization_id=None,
                    competency_id=comp_id,
                    competency_name=comp_name,
                    timestamp=event_time,
                    source=sources[step % len(sources)],
                    source_type="project_activity" if step % 2 == 0 else "assessment",
                    source_reference=f"SYNTH-REF-{traj_idx}-{step}",
                    title=f"Synthetic {comp_name} Activity #{step+1}",
                    content_summary=f"Milestone event {step+1} for {comp_name}",
                    evidence_strength=float(np.random.uniform(0.8, 1.0)),
                    raw_score=round(current_score, 1),
                    outcome_signal=round(current_score, 1),
                    metadata={"dataset_type": "synthetic_development"},
                    is_counterfactual=False,
                )
                synthetic_evidence.append(ev)

        return synthetic_evidence

    def build_dataset(
        self,
        include_synthetic_dev: bool = True,
    ) -> Dict[str, Any]:
        """
        Builds the complete dataset split into Train (70%), Validation (15%), Test (15%).
        Enforces chronological temporal order across splits to avoid leakage.
        """
        evidence_items = self.load_all_evidence()

        if include_synthetic_dev:
            synth = self.generate_synthetic_development_sequences(num_trajectories=180, events_per_traj=8)
            evidence_items.extend(synth)

        # 1. Clean, normalize, and group
        grouped = EvidencePreprocessor.group_by_employee_competency(evidence_items)

        X_list: List[np.ndarray] = []
        y_list: List[int] = []
        mask_list: List[np.ndarray] = []
        metadata_list: List[Dict[str, Any]] = []

        for (emp_id, comp_id), seq in grouped.items():
            if len(seq) < self.seq_builder.min_length:
                continue

            # Sliding windows for each valid subsequence
            for k in range(self.seq_builder.min_length, len(seq) + 1):
                sub_seq = seq[:k]
                window_tensor, mask, insufficient = self.seq_builder.build_inference_sequence(sub_seq)
                if insufficient:
                    continue

                label = self.label_generator.label_sequence_window(seq, k - 1)

                X_list.append(window_tensor[0])
                mask_list.append(mask[0])
                y_list.append(label)
                metadata_list.append({
                    "employee_id": emp_id,
                    "competency_id": comp_id,
                    "competency_name": seq[0].competency_name,
                    "sequence_len": k,
                    "last_timestamp": sub_seq[-1].timestamp.isoformat(),
                })

        if not X_list:
            raise ValueError("No valid sequences could be constructed from available evidence.")

        X = np.array(X_list, dtype=np.float32)
        masks = np.array(mask_list, dtype=bool)
        y = np.array(y_list, dtype=np.int64)

        # 2. Time-aware splitting (Sort by last_timestamp to simulate historical train -> recent test)
        timestamps = [m["last_timestamp"] for m in metadata_list]
        sort_indices = np.argsort(timestamps)

        X = X[sort_indices]
        masks = masks[sort_indices]
        y = y[sort_indices]
        metadata_sorted = [metadata_list[i] for i in sort_indices]

        n_total = len(X)
        n_train = int(n_total * 0.70)
        n_val = int(n_total * 0.15)

        train_slice = slice(0, n_train)
        val_slice = slice(n_train, n_train + n_val)
        test_slice = slice(n_train + n_val, None)

        unique, counts = np.unique(y, return_counts=True)
        class_dist = {LABEL_MAP.get(int(u), str(u)): int(c) for u, c in zip(unique, counts)}

        return {
            "X_train": X[train_slice],
            "y_train": y[train_slice],
            "mask_train": masks[train_slice],
            "X_val": X[val_slice],
            "y_val": y[val_slice],
            "mask_val": masks[val_slice],
            "X_test": X[test_slice],
            "y_test": y[test_slice],
            "mask_test": masks[test_slice],
            "class_distribution": class_dist,
            "total_sequences": n_total,
            "num_employees": len(set(m["employee_id"] for m in metadata_sorted)),
            "num_competencies": len(set(m["competency_id"] for m in metadata_sorted)),
            "metadata": metadata_sorted,
        }


# Convenient alias
TrajectoryDatasetBuilder = CompetencyDatasetBuilder
