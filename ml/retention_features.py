import pandas as pd
import numpy as np

def compute_historical_features(hist_dict, snapshot_time, source_weights):
    if len(hist_dict['raw_score']) == 0:
        return {}

    timestamps = hist_dict['timestamp']
    scores = hist_dict['raw_score']
    sources = hist_dict['evidence_source']
    
    hist_volume = len(scores)
    last_timestamp = timestamps[-1]
    first_timestamp = timestamps[0]
    
    snap_dt64 = np.datetime64(snapshot_time)
    
    days_since_last_evidence = (snap_dt64 - last_timestamp).astype('timedelta64[D]').astype(int)
    
    def days_since_source(src):
        mask = sources == src
        if not np.any(mask):
            return 999
        return (snap_dt64 - timestamps[mask][-1]).astype('timedelta64[D]').astype(int)
        
    days_since_last_assessment = days_since_source('assessment')
    days_since_last_project = days_since_source('project_outcome')
    days_since_last_course = days_since_source('course_completion')
    
    def count_in_window(days):
        cutoff = snap_dt64 - np.timedelta64(days, 'D')
        return np.sum(timestamps >= cutoff)
        
    def count_src_in_window(src, days):
        cutoff = snap_dt64 - np.timedelta64(days, 'D')
        return np.sum((timestamps >= cutoff) & (sources == src))
        
    evidence_count_30d = count_in_window(30)
    evidence_count_60d = count_in_window(60)
    evidence_count_90d = count_in_window(90)
    evidence_count_180d = count_in_window(180)
    
    assessment_count_90d = count_src_in_window('assessment', 90)
    project_count_90d = count_src_in_window('project_outcome', 90)
    course_count_90d = count_src_in_window('course_completion', 90)
    
    historical_mean = np.mean(scores)
    historical_std = np.std(scores) if len(scores) > 1 else 0.0
    historical_min = np.min(scores)
    historical_max = np.max(scores)
    
    recent_scores = scores[-3:] if len(scores) >= 3 else scores
    recent_mean = np.mean(recent_scores)
    recent_std = np.std(recent_scores) if len(recent_scores) > 1 else 0.0
    
    current_score = scores[-1]
    historical_peak = historical_max
    recent_vs_historical_change = recent_mean - historical_mean
    
    def calc_slope(t_vals, y_vals):
        if len(y_vals) < 2:
            return 0.0
        t_days = (t_vals - t_vals[0]).astype('timedelta64[D]').astype(int)
        if t_days[-1] == 0:
            return 0.0
        A = np.vstack([t_days, np.ones(len(t_days))]).T
        m, _ = np.linalg.lstsq(A, y_vals, rcond=None)[0]
        return m
        
    slope_per_day = calc_slope(timestamps, scores)
    slope_per_30d = slope_per_day * 30
    score_delta = current_score - scores[0]
    
    recent_slope = calc_slope(timestamps[-3:], scores[-3:]) * 30 if len(scores) >= 3 else slope_per_30d
    historical_slope = slope_per_30d
    
    if len(scores) > 1:
        gaps = (timestamps[1:] - timestamps[:-1]).astype('timedelta64[D]').astype(int)
        average_days_between_evidence = np.mean(gaps)
        median_days_between_evidence = np.median(gaps)
        maximum_evidence_gap = np.max(gaps)
        total_days = (last_timestamp - first_timestamp).astype('timedelta64[D]').astype(int)
        evidence_frequency = hist_volume / total_days if total_days > 0 else hist_volume
    else:
        average_days_between_evidence = 999
        median_days_between_evidence = 999
        maximum_evidence_gap = 999
        evidence_frequency = 0
        
    unique_sources, counts = np.unique(sources, return_counts=True)
    source_counts = dict(zip(unique_sources, counts))
    source_diversity = len(unique_sources)
    assessment_ratio = source_counts.get('assessment', 0) / hist_volume
    project_ratio = source_counts.get('project_outcome', 0) / hist_volume
    course_ratio = source_counts.get('course_completion', 0) / hist_volume
    
    weights = np.array([source_weights.get(src, 1.0) for src in sources])
    weighted_mean_score = np.average(scores, weights=weights) if np.sum(weights) > 0 else historical_mean
    
    conf_vol = min(hist_volume / 10.0, 1.0)
    conf_div = source_diversity / 3.0
    conf_rec = max(0, 1.0 - (days_since_last_evidence / 180.0))
    conf_stab = max(0, 1.0 - (historical_std / 20.0))
    prediction_confidence = np.mean([conf_vol, conf_div, conf_rec, conf_stab])
    
    return {
        'days_since_last_evidence': days_since_last_evidence,
        'days_since_last_assessment': days_since_last_assessment,
        'days_since_last_project': days_since_last_project,
        'days_since_last_course': days_since_last_course,
        'evidence_count_30d': evidence_count_30d,
        'evidence_count_60d': evidence_count_60d,
        'evidence_count_90d': evidence_count_90d,
        'evidence_count_180d': evidence_count_180d,
        'assessment_count_90d': assessment_count_90d,
        'project_count_90d': project_count_90d,
        'course_count_90d': course_count_90d,
        'historical_mean': historical_mean,
        'historical_std': historical_std,
        'historical_min': historical_min,
        'historical_max': historical_max,
        'recent_mean': recent_mean,
        'recent_std': recent_std,
        'current_score': current_score,
        'historical_peak': historical_peak,
        'recent_vs_historical_change': recent_vs_historical_change,
        'slope_per_day': slope_per_day,
        'slope_per_30d': slope_per_30d,
        'score_delta': score_delta,
        'recent_slope': recent_slope,
        'historical_slope': historical_slope,
        'average_days_between_evidence': average_days_between_evidence,
        'median_days_between_evidence': median_days_between_evidence,
        'maximum_evidence_gap': maximum_evidence_gap,
        'evidence_frequency': evidence_frequency,
        'source_diversity': source_diversity,
        'assessment_ratio': assessment_ratio,
        'project_ratio': project_ratio,
        'course_ratio': course_ratio,
        'weighted_mean_score': weighted_mean_score,
        'historical_evidence_volume': hist_volume,
        'prediction_confidence': prediction_confidence
    }
