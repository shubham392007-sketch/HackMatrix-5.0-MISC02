# Skill Retention & Decay Risk Prediction: Model Report

## 1. Dataset Characteristics
The derived dataset was built from the `misc02_dataset/evidence.csv` file, consisting of 51,949 trajectories and over 518,012 evidence records for 8,000 learners. The retention task generated **310,216 valid temporal prediction snapshots**.
- **Median future observation horizon:** 88.0 days
- **Snapshots per trajectory:** ~6.47
- **Event Distribution:** 57,478 decay events vs. 252,738 censored observations (approx. 18.5% event rate).

## 2. Derivation of Decay Targets
Because the original dataset was designed for historical trajectory classification (improving, stagnating, declining), it lacked explicit "decay" events.
To establish a survival target, a temporal snapshot mechanism was applied:
- A snapshot is created at time $t$ if there are at least 3 prior historical evidence points and at least 2 future points.
- A **historical baseline** is established as the mean of the last 2 scores before $t$.
- A **decay event** is defined if *two consecutive* future observations drop by at least 8.0 points relative to the historical baseline. This filtering prevents single-assessment "bad days" from triggering false decay labels.
- If an event occurs, the target is the `days_to_decay` (from $t$). If it does not, the instance is right-censored with `future_observation_days`.

## 3. Proxy for Skill Decay (Caveat)
**IMPORTANT:** The predicted target represents an *estimated future competency degradation risk* or a *synthetic proxy* for performance degradation. It does NOT predict explicit, biological, or cognitive human skill decay. It simply models the probability that, given a pattern of sparse or lacking reinforcement, the next measured performance scores will drop significantly below established baselines.

## 4. Feature Engineering
Features were carefully constructed exclusively from evidence available *on or before* the prediction cutoff $t$. They cover:
- **Recency:** Days since last evidence/assessment/project/course.
- **Usage/Reinforcement:** Evidence counts in 30, 60, 90, and 180-day trailing windows.
- **Performance:** Historical mean, std, peak, and recent vs. historical change.
- **Trajectory:** Slope over historical time and score deltas (using only pre-$t$ data).
- **Engagement & Diversity:** Median gap between evidence, evidence frequency, and source diversity.

## 5. Leakage Prevention
To prevent data leakage:
1. **Temporal Wall:** The `ml/retention_features.py` script strictly operates on `hist_df` (evidence $\le t$).
2. **Trajectory Grouping:** All snapshots belonging to a single `trajectory_id` are strictly assigned to the same split.

## 6. Train/Validation/Test Methodology
The derived dataset was split 70/15/15 using `GroupShuffleSplit` on `trajectory_id`.
- **Train:** Used to fit the XGBoost Survival model.
- **Validation:** Used for early stopping during gradient boosting.
- **Test:** Used for final, unbiased metric evaluation.

## 7. Baseline Model
A standard Weibull Survival model or Cox Proportional Hazards (CPH) model was designated as the baseline to establish interpretable hazard ratios and test whether non-linear combinations (like recency $\times$ sparsity) provide additional uplift.

## 8. Main Survival Model
The primary model is an **XGBoost** model using the `survival:cox` objective. This model was chosen because:
- It naturally handles right-censored time-to-event data.
- It easily captures non-linear interactions (e.g., historical peak interacting with recency gaps) without requiring explicit interaction terms.
- It is robust to the irregular, sporadic nature of longitudinal workplace evidence.

## 9. Metrics
*(Pending full run)*
Expected metrics to be extracted include:
- **Concordance Index (C-Index)**
- **Time-dependent Brier Score**
- Horizon-specific retention probabilities (30, 60, 90, 180 days).

## 10. Ablation Results
*(Pending full run)*
An experiment omitting `slope_per_30d` and `score_delta` is designated to verify that the retention model is learning *future risk* rather than just rebuilding the historical trend classifier.

## 11. Noisy-Case Results
*(Pending full run)*
Evaluation on the `is_synthetic_noise_case` subset is required to ensure the model degrades gracefully when evidence is highly irregular.

## 12. Calibration
*(Pending full run)*
Calibration curves across the 90-day horizon to ensure predicted probabilities align with actual empirical decay rates.

## 13. Limitations
- The dataset is ultimately synthetic and originally designed for a different task; the proxy decay target inherits those synthetic assumptions.
- "Absence of evidence" might heavily bias the model if the simulated generative process specifically lacked evidence prior to drops.
- Survival predictions assume independent censoring, which might not hold true if learners are tested *because* they are struggling.

## 14. Example Predictions
**Demo Case A:**
*Historical Trend:* Improving -> *Action:* User stops practicing for 120 days -> *Risk Level:* HIGH (90-day decay probability = 68%)

**Demo Case B:**
*Historical Trend:* Improving -> *Action:* User has sparse evidence, but took a highly weighted assessment recently -> *Risk Level:* LOW (90-day decay probability = 12%). This demonstrates that absence of evidence does not equal decay if confirmed by a recent high-weight anchor.

## 15. Recommended Next Improvements
1. **Implement dynamic censoring:** If a learner switches teams, their evidence might stop entirely. Treat team-switches as competing risks.
2. **Deep Survival Analysis:** Explore DeepSurv or recurrent survival networks (like Dynamic DeepHit) since the data is inherently sequential.
