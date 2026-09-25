import pandas as pd
import pytest
import yaml
from sklearn.model_selection import GroupShuffleSplit

def test_split_grouping():
    try:
        df = pd.read_csv('derived_data/decay_survival_dataset.csv')
    except FileNotFoundError:
        pytest.skip("Dataset not yet built.")
        
    with open("config/retention_config.yaml", "r") as f:
        config = yaml.safe_load(f)
        
    gss = GroupShuffleSplit(n_splits=1, train_size=0.7, random_state=config['training']['random_state'])
    train_idx, test_idx = next(gss.split(df, groups=df['trajectory_id']))
    
    df_train = df.iloc[train_idx]
    df_test = df.iloc[test_idx]
    
    train_trajectories = set(df_train['trajectory_id'].unique())
    test_trajectories = set(df_test['trajectory_id'].unique())
    
    # Assert there is no intersection between train and test trajectories
    intersection = train_trajectories.intersection(test_trajectories)
    assert len(intersection) == 0, f"Leakage detected! {len(intersection)} trajectories appear in both train and test splits."
    
    print("Group split tests passed!")
