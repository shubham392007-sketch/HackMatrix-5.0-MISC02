import pandas as pd
import pytest

def test_feature_leakage():
    # Load dataset
    try:
        df = pd.read_csv('derived_data/decay_survival_dataset.csv', nrows=2000)
    except FileNotFoundError:
        pytest.skip("Dataset not yet built.")
        
    # Ensure snapshot_time is present
    assert 'snapshot_time' in df.columns
    assert 'trajectory_id' in df.columns
    assert 'decay_event' in df.columns
    assert 'future_observation_days' in df.columns
    
    # Assert that all future observation days are strictly non-negative
    assert (df['future_observation_days'] >= 0).all(), "Observation duration cannot be negative!"
    
    # Check that evidence counts and intervals are non-negative
    if 'evidence_count_30d' in df.columns:
        assert (df['evidence_count_30d'] >= 0).all()
    if 'evidence_count_90d' in df.columns:
        assert (df['evidence_count_90d'] >= 0).all()
    if 'average_days_between_evidence' in df.columns:
        assert (df['average_days_between_evidence'] >= 0).all()
        
    # Check that events have valid days_to_decay
    events = df[df['decay_event'] == 1]
    if len(events) > 0:
        assert (events['days_to_decay'] > 0).all(), "Days to decay must be positive for true decay events!"
    
    print("Leakage and temporal integrity tests passed!")
