# Survival Model Comparison

| Model               |   C-Index | Brier   |      30d |      60d |      90d |     180d | Calibration   |
|:--------------------|----------:|:--------|---------:|---------:|---------:|---------:|:--------------|
| Weibull             |    0.7925 | 0.1366  |   0.811  |   0.8216 |   0.8289 |   0.8472 | Pending       |
| Survival GBM        |    0.8042 | N/A     |   0.8229 |   0.8303 |   0.8347 |   0.8472 | Pending       |
| CoxPH (Alternative) |  nan      | nan     | nan      | nan      | nan      | nan      | nan           |

### Model Selection
### Model Selection

**Selected Model: Weibull Survival**

**Rationale:**
1. **Predictive Discrimination & Time-Horizon Performance**: The Survival GBM (XGBoost) model achieved a slightly higher C-Index (0.8042) compared to the Weibull baseline (0.7925). Across 30, 60, and 90-day prediction horizons, XGBoost demonstrated an AUC advantage of approximately ~0.005 to ~0.012. 
2. **Interpretability & Stability**: While the complex GBM is strictly more accurate, the Weibull model performs highly comparably (within ~1.5% margin of error on all major metrics) while providing vastly superior interpretability. Weibull coefficients naturally translate to direct hazard ratios, allowing us to explain risk factors to users transparently without needing black-box SHAP explainers.
3. **Computational Complexity**: The Weibull model provides explicit baseline survival probabilities (S(t)) instantly, allowing us to compute precise Integrated Brier Scores and expected survival times out-of-the-box, whereas Cox-based GBMs require complex, computationally heavy Breslow estimator post-processing to yield absolute probabilities.
4. **Conclusion**: Because the simpler Weibull model performs comparably to the more complex Gradient-Boosted model, we explicitly choose the interpretable, mathematically stable Weibull formulation as our final deployment model for the Retention Risk feature.
