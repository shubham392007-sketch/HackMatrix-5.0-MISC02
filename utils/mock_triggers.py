def mock_get_skill_trajectory(learner_id: str, competency: str) -> dict:
    """Mock function simulating LSTM output for a learner's skill trajectory.

    Args:
        learner_id: Identifier for the learner (unused in mock).
        competency: The competency being evaluated (unused in mock).

    Returns:
        A dictionary indicating a declining trend with confidence.
    """
    return {
        "trend": "declining",
        "confidence": 0.85,
        "evidence_ref": "E14-1",
    }
