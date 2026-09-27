# Confidence Decay & Evidence Staleness Methodology

**Module:** Feature 4 – Growth Intelligence & Manager Insights  
**Reference:** Feature 2 Trajectory Modeling & Weibull Survival Dynamics  

---

## 1. Unified Confidence Model (No Second Model)

Feature 4 does **not** create a competing confidence model. It strictly reuses the 4-factor parametric confidence formulation established in `ml/retention_features.py`:

$$\text{Confidence} = \frac{C_{\text{volume}} + C_{\text{diversity}} + C_{\text{recency}} + C_{\text{stability}}}{4}$$

Where:
- $C_{\text{volume}} = \min(1.0, \frac{N_{\text{evidence}}}{10.0})$ (sample count factor)
- $C_{\text{diversity}} = \frac{\text{Unique Sources}}{3.0}$ (assessment, project, course diversity)
- $C_{\text{recency}} = \max\left(0, 1.0 - \frac{\text{Days Since Last Evidence}}{180}\right)$ (temporal freshness)
- $C_{\text{stability}} = \max\left(0, 1.0 - \frac{\sigma_{\text{historical}}}{20.0}\right)$ (performance variance)

---

## 2. Dynamic Evidence Freshness States

Evidence freshness measures the temporal decay of signal recency independent of skill capability:

$$\text{Freshness} = \max\left(0.0, \min\left(100.0, \left(1.0 - \frac{\text{Days Since Last Evidence}}{180}\right) \times 100.0\right)\right)$$

| State | Freshness % | Days Inactive | Visual Representation | Semantic Interpretation |
| :--- | :--- | :--- | :--- | :--- |
| **Fresh** | $\ge 75\%$ | $\le 45$ days | Solid Emerald Badge | High empirical certainty; recent verified practice. |
| **Aging** | $40\% - 74\%$ | $46 - 108$ days | Amber Bordered Badge | Moderate certainty; evidence is maturing. |
| **Stale** | $< 40\%$ | $> 108$ days | Dashed Rose/Gray Badge| Low certainty; telemetry silence requires verification. |

---

## 3. Dynamic Uncertainty Bands

In the Feature 4 Trajectory Plot, confidence is visualized as a dynamic uncertainty envelope around the modelled skill trajectory:

$$\text{Band Upper}(t) = \text{Score}(t) + (1.0 - \text{Confidence}(t)) \times 25.0$$
$$\text{Band Lower}(t) = \text{Score}(t) - (1.0 - \text{Confidence}(t)) \times 25.0$$

- **High Confidence ($\ge 0.85$)**: Tight, focused envelope ($\pm 3.75$ pts).
- **Decayed Confidence ($0.50$)**: Broad, translucent envelope ($\pm 12.5$ pts).
- **Core Principle**: Trend label (e.g. *Improving*) remains structurally unchanged as confidence decays. The expanding band communicates: *"Same modelled trajectory direction, weaker recency backing."*
