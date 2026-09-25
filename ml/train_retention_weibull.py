import os
import json
import yaml
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler
from lifelines import WeibullAFTFitter
from lifelines.utils import concordance_index

def train_and_save_weibull_model():
    print("Loading retention configuration...")
    with open("config/retention_config.yaml", "r") as f:
        config = yaml.safe_load(f)

    data_path = config['dataset']['output_survival']
    print(f"Reading survival dataset from {data_path}...")
    df = pd.read_csv(data_path).fillna(0)
    print(f"Loaded {len(df):,} snapshots.")

    # High-signal, non-collinear features with full variance
    features = [
        'evidence_count_30d',
        'evidence_count_90d',
        'historical_mean',
        'recent_vs_historical_change',
        'slope_per_30d',
        'source_diversity',
        'maximum_evidence_gap',
        'average_days_between_evidence',
        'current_score'
    ]

    # Split by trajectory_id to strictly prevent data leakage across splits
    rs = config['training'].get('random_state', 42)
    gss = GroupShuffleSplit(n_splits=1, train_size=0.7, random_state=rs)
    train_idx, temp_idx = next(gss.split(df, groups=df['trajectory_id']))
    
    df_train = df.iloc[train_idx].copy()
    df_temp = df.iloc[temp_idx].copy()

    gss_val = GroupShuffleSplit(n_splits=1, train_size=0.5, random_state=rs)
    val_idx, test_idx = next(gss_val.split(df_temp, groups=df_temp['trajectory_id']))
    df_test = df_temp.iloc[test_idx].copy()

    # Subsample training data for fast, numerically stable convergence
    MAX_TRAIN_SAMPLES = 30000
    if len(df_train) > MAX_TRAIN_SAMPLES:
        gss_sub = GroupShuffleSplit(n_splits=1, train_size=MAX_TRAIN_SAMPLES / len(df_train), random_state=rs)
        sub_idx, _ = next(gss_sub.split(df_train, groups=df_train['trajectory_id']))
        df_train_sub = df_train.iloc[sub_idx].copy()
    else:
        df_train_sub = df_train.copy()

    print(f"Training on {len(df_train_sub):,} snapshots (from {df_train_sub['trajectory_id'].nunique():,} unique trajectories)...")

    # Fit StandardScaler
    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(scaler.fit_transform(df_train_sub[features]), columns=features, index=df_train_sub.index)
    X_test_scaled = pd.DataFrame(scaler.transform(df_test[features]), columns=features, index=df_test.index)

    def extract_time_event(d):
        t = np.where(d['decay_event'] == 1, d['days_to_decay'], d['future_observation_days'])
        t = np.maximum(t, 1.0)
        return d['decay_event'].values, t

    event_train, time_train = extract_time_event(df_train_sub)
    event_test, time_test = extract_time_event(df_test)

    train_data_ll = X_train_scaled.copy()
    train_data_ll['time'] = time_train
    train_data_ll['event'] = event_train

    print("Fitting WeibullAFTFitter (penalizer=0.05)...")
    weibull = WeibullAFTFitter(penalizer=0.05)
    weibull.fit(train_data_ll, duration_col='time', event_col='event')

    # Evaluate on test set
    predicted_medians = weibull.predict_median(X_test_scaled).values
    # In concordance_index: higher predicted time = lives longer
    c_index = concordance_index(time_test, predicted_medians, event_test)
    print(f"Test Concordance Index (C-Index): {c_index:.4f}")

    # Extract summary coefficients
    summary_df = weibull.summary
    coef_dict = {}
    for idx, row in summary_df.iterrows():
        param, feat = idx
        if param == 'lambda_':
            coef_dict[feat] = {
                'coef': float(row['coef']),
                'exp(coef)': float(row['exp(coef)']),
                'p': float(row['p'])
            }

    # Save directory
    save_dir = "models/retention"
    os.makedirs(save_dir, exist_ok=True)

    model_path = os.path.join(save_dir, "weibull_model.pkl")
    scaler_path = os.path.join(save_dir, "scaler.pkl")
    meta_path = os.path.join(save_dir, "model_metadata.json")

    print(f"Saving Weibull model to {model_path}...")
    joblib.dump(weibull, model_path)

    print(f"Saving Scaler to {scaler_path}...")
    joblib.dump(scaler, scaler_path)

    metadata = {
        'model_type': 'WeibullAFTFitter',
        'c_index': float(c_index),
        'features': features,
        'feature_means': {feat: float(scaler.mean_[i]) for i, feat in enumerate(features)},
        'feature_scales': {feat: float(scaler.scale_[i]) for i, feat in enumerate(features)},
        'coefficients': coef_dict,
        'penalizer': 0.05,
        'training_samples': len(df_train_sub),
        'test_samples': len(df_test)
    }

    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved metadata to {meta_path}.")
    print("Model training & persistence complete!")

if __name__ == "__main__":
    train_and_save_weibull_model()
