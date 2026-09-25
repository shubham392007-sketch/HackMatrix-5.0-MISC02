import pandas as pd
import numpy as np
import os
import yaml
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, brier_score_loss
from lifelines import WeibullAFTFitter, CoxPHFitter
from lifelines.utils import concordance_index
import xgboost as xgb
import warnings
from lifelines.utils import ConvergenceWarning

warnings.filterwarnings("ignore", category=ConvergenceWarning)
warnings.filterwarnings("ignore", category=RuntimeWarning)

def load_config():
    with open("config/retention_config.yaml", "r") as f:
        return yaml.safe_load(f)

def calc_horizon_metrics(time_test, event_test, risk_scores, surv_probs=None, horizons=[30, 60, 90, 180]):
    metrics = {}
    
    for h in horizons:
        # Define binary outcome for horizon 'h'
        # 1 if event occurred <= h
        # 0 if known to survive > h
        # Ignore if censored <= h
        
        valid_idx = (time_test > h) | ((time_test <= h) & (event_test == 1))
        
        if valid_idx.sum() < 10:
            metrics[f'{h}d'] = np.nan
            continue
            
        y_true = ((time_test <= h) & (event_test == 1))[valid_idx].astype(int)
        y_score = risk_scores[valid_idx] # higher = more risk
        
        try:
            auc = roc_auc_score(y_true, y_score)
            metrics[f'{h}d'] = round(auc, 4)
        except Exception:
            metrics[f'{h}d'] = np.nan
            
    # Naive Brier Score (if survival probabilities are provided)
    # We average the Brier score over all available horizons
    brier_scores = []
    if surv_probs is not None:
        for i, h in enumerate(horizons):
            valid_idx = (time_test > h) | ((time_test <= h) & (event_test == 1))
            if valid_idx.sum() > 0:
                y_true = ((time_test <= h) & (event_test == 1))[valid_idx].astype(int)
                # surv_probs[i] contains P(T > h)
                y_prob = 1 - surv_probs[i][valid_idx] # P(event <= h)
                brier_scores.append(brier_score_loss(y_true, y_prob))
                
    metrics['Brier'] = round(np.mean(brier_scores), 4) if brier_scores else "N/A"
    metrics['Calibration'] = "Pending"
    return metrics

def evaluate_model(model_name, time_test, event_test, risk_scores, surv_probs=None, horizons=[30, 60, 90, 180]):
    results = {
        'Model': model_name,
        'C-Index': np.nan,
        'Brier': "N/A",
        '30d': np.nan,
        '60d': np.nan,
        '90d': np.nan,
        '180d': np.nan,
        'Calibration': 'Pending'
    }
    
    # 1. C-Index
    try:
        # lifelines expects predicted times (higher = lives longer)
        # We pass -risk_scores
        c_idx = concordance_index(time_test, -risk_scores, event_test)
        results['C-Index'] = round(c_idx, 4)
    except Exception as e:
        print(f"Error calculating C-Index for {model_name}: {e}")

    # 2. Horizon Metrics
    h_metrics = calc_horizon_metrics(time_test, event_test, risk_scores, surv_probs, horizons)
    results.update(h_metrics)

    return results

def run_comparison():
    config = load_config()
    data_path = config['dataset']['output_survival']
    
    if not os.path.exists(data_path):
        print(f"{data_path} not found.")
        return
        
    print("Loading data...")
    df = pd.read_csv(data_path).fillna(0)
    
    print("Splitting data...")
    rs = config['training'].get('random_state', 42)
    gss = GroupShuffleSplit(n_splits=1, train_size=0.7, random_state=rs)
    train_idx, temp_idx = next(gss.split(df, groups=df['trajectory_id']))
    df_train = df.iloc[train_idx].copy()
    df_temp = df.iloc[temp_idx].copy()
    
    gss_val = GroupShuffleSplit(n_splits=1, train_size=0.5, random_state=rs)
    val_idx, test_idx = next(gss_val.split(df_temp, groups=df_temp['trajectory_id']))
    df_test = df_temp.iloc[test_idx].copy()
    
    MAX_TRAIN_SAMPLES = 20000
    if len(df_train) > MAX_TRAIN_SAMPLES:
        gss_sub = GroupShuffleSplit(n_splits=1, train_size=MAX_TRAIN_SAMPLES/len(df_train), random_state=rs)
        sub_idx, _ = next(gss_sub.split(df_train, groups=df_train['trajectory_id']))
        df_train_sub = df_train.iloc[sub_idx].copy()
    else:
        df_train_sub = df_train.copy()
        
    features = [
        'days_since_last_evidence', 'evidence_count_90d', 'historical_mean', 
        'recent_vs_historical_change', 'slope_per_30d', 'source_diversity',
        'maximum_evidence_gap', 'average_days_between_evidence', 'current_score'
    ]
    
    scaler = StandardScaler()
    X_train = pd.DataFrame(scaler.fit_transform(df_train_sub[features]), columns=features)
    X_test = pd.DataFrame(scaler.transform(df_test[features]), columns=features)
    
    def extract_time_event(d):
        t = np.where(d['decay_event'] == 1, d['days_to_decay'], d['future_observation_days'])
        # ensure positive
        t = np.maximum(t, 1)
        return d['decay_event'].values, t
        
    event_train, time_train = extract_time_event(df_train_sub)
    event_test, time_test = extract_time_event(df_test)
    
    horizons = [30, 60, 90, 180]
    results = []

    # ==========================
    # MODEL 1: Weibull Survival
    # ==========================
    print("Training Weibull AFT...")
    try:
        df_train_ll = X_train.copy()
        df_train_ll['time'] = time_train
        df_train_ll['event'] = event_train
        
        weibull = WeibullAFTFitter(penalizer=0.1)
        weibull.fit(df_train_ll, duration_col='time', event_col='event')
        
        w_risk = -weibull.predict_median(X_test).values
        w_sf_df = weibull.predict_survival_function(X_test)
        
        w_surv_probs = []
        for h in horizons:
            # find closest time in sf_df index
            idx = w_sf_df.index.get_indexer([h], method='nearest')[0]
            w_surv_probs.append(w_sf_df.iloc[idx].values)
        
        w_eval = evaluate_model("Weibull", time_test, event_test, w_risk, w_surv_probs, horizons)
        results.append(w_eval)
    except Exception as e:
        print(f"Weibull failed: {e}")
        results.append({'Model': 'Weibull', 'C-Index': np.nan})

    # ==========================
    # MODEL 2: Survival GBM
    # ==========================
    print("Training Survival GBM (XGBoost)...")
    try:
        xgb_y_train = np.where(event_train == 1, time_train, -time_train)
        dtrain = xgb.DMatrix(X_train, label=xgb_y_train)
        
        params = {'objective': 'survival:cox', 'eval_metric': 'cox-nloglik', 'eta': 0.1, 'max_depth': 4}
        bst = xgb.train(params, dtrain, num_boost_round=100)
        
        dtest = xgb.DMatrix(X_test)
        x_risk = bst.predict(dtest)
        
        # XGBoost doesn't provide easy survival probabilities without baseline hazard, so surv_probs=None
        x_eval = evaluate_model("Survival GBM", time_test, event_test, x_risk, None, horizons)
        results.append(x_eval)
    except Exception as e:
        print(f"Survival GBM failed: {e}")
        results.append({'Model': 'Survival GBM', 'C-Index': np.nan})
        
    # ==========================
    # MODEL 3: Alternative (CoxPH)
    # ==========================
    print("Training CoxPH (lifelines)...")
    try:
        cox = CoxPHFitter(penalizer=0.1)
        cox.fit(df_train_ll, duration_col='time', event_col='event')
        
        c_risk = cox.predict_partial_hazard(X_test).values
        c_sf_df = cox.predict_survival_function(X_test)
        
        c_surv_probs = []
        for h in horizons:
            idx = c_sf_df.index.get_indexer([h], method='nearest')[0]
            c_surv_probs.append(c_sf_df.iloc[idx].values)
            
        c_eval = evaluate_model("CoxPH (Alternative)", time_test, event_test, c_risk, c_surv_probs, horizons)
        results.append(c_eval)
    except Exception as e:
        print(f"CoxPH failed: {e}")
        results.append({'Model': 'CoxPH (Alternative)', 'C-Index': np.nan})
        
    # Format and save
    df_res = pd.DataFrame(results)
    cols = ['Model', 'C-Index', 'Brier', '30d', '60d', '90d', '180d', 'Calibration']
    df_res = df_res[[c for c in cols if c in df_res.columns]]
    
    print("\n--- RESULTS ---")
    print(df_res)
    
    os.makedirs('reports', exist_ok=True)
    df_res.to_csv('reports/model_comparison.csv', index=False)
    
    with open('reports/model_comparison.md', 'w') as f:
        f.write("# Survival Model Comparison\n\n")
        f.write(df_res.to_markdown(index=False))
        f.write("\n\n### Model Selection\n")
        f.write("The models were evaluated using lifelines (Weibull, CoxPH) and XGBoost (Survival GBM).\n")
        f.write("XGBoost directly outputs risk scores (no absolute survival probability without Breslow estimator), so its Brier score is N/A.\n")

if __name__ == "__main__":
    run_comparison()
