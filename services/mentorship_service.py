def find_internal_mentor(competency_id: str, mentee_id: str) -> dict:
    """Mock function to find an internal mentor for a given competency.

    Args:
        competency_id: The competency identifier for which mentorship is needed.
        mentee_id: Identifier of the mentee (currently unused in the mock).

    Returns:
        A dictionary representing a hard‑coded mentor.
    """
    # Mocked response – replace with real DB query later.
    return {
        "mentor_id": "user_890",
        "mentor_name": "Senior Developer",
        "competency": competency_id,
    }
