import pandas as pd
import numpy as np
import yaml
import os
from ml.retention_features import compute_historical_features

def load_config():
    with open("config/retention_config.yaml", "r") as f:
        return yaml.safe_load(f)

def build_retention_dataset():
    print("Loading config...")
    config = load_config()
    
    # We strictly use the provided CSV datasets
    dataset_path = 'misc02_dataset/evidence.csv'
    
    print("Loading data...")
    evidence_df = pd.read_csv(dataset_path)
    evidence_df['timestamp'] = pd.to_datetime(evidence_df['timestamp'])
    evidence_df = evidence_df.sort_values(by=['trajectory_id', 'timestamp'])
    
    SOURCE_WEIGHTS = config['source_weights']
    DECAY_THRESHOLD = config['decay_event_rules']['decay_drop_threshold']
    
    snapshots = []
    
    print("Processing trajectories...")
    grouped = evidence_df.groupby('trajectory_id')
    
    total_trajs = len(grouped)
    for idx, (traj_id, group) in enumerate(grouped):
        if idx % 5000 == 0:
            print(f"Processed {idx}/{total_trajs} trajectories...")
            
        scores = group['raw_score'].values
        timestamps = group['timestamp'].values
        sources = group['evidence_source'].values
        n = len(scores)
        
        if n < 4:
            continue
            
        for i in range(2, n - 1): 
            snapshot_time = timestamps[i]
            
            future_scores = scores[i+1:]
            future_timestamps = timestamps[i+1:]
            
            hist_dict = {
                'timestamp': timestamps[:i+1],
                'raw_score': scores[:i+1],
                'evidence_source': sources[:i+1]
            }
            
            features = compute_historical_features(hist_dict, snapshot_time, SOURCE_WEIGHTS)
            features['trajectory_id'] = traj_id
            features['snapshot_time'] = snapshot_time
            
            # Decay event target:
            # Does the learner drop by >= DECAY_THRESHOLD points after the snapshot?
            current_score = scores[i]
            decay_event = 0
            days_to_decay = 0
            
            for j in range(len(future_scores)):
                if (current_score - future_scores[j]) >= DECAY_THRESHOLD:
                    decay_event = 1
                    days_to_decay = (future_timestamps[j] - snapshot_time).astype('timedelta64[D]').astype(int)
                    break
                    
            features['decay_event'] = decay_event
            if decay_event:
                features['days_to_decay'] = days_to_decay
                features['future_observation_days'] = days_to_decay
            else:
                features['days_to_decay'] = -1
                features['future_observation_days'] = (future_timestamps[-1] - snapshot_time).astype('timedelta64[D]').astype(int)
                
            snapshots.append(features)

    print("Building DataFrame...")
    final_df = pd.DataFrame(snapshots)
    
    print(f"Generated {len(final_df)} snapshots.")
    
    os.makedirs('derived_data', exist_ok=True)
    out_path = config['dataset']['output_survival']
    final_df.to_csv(out_path, index=False)
    print(f"Saved dataset to {out_path}")

if __name__ == "__main__":
    build_retention_dataset()
