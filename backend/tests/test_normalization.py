from backend.integrations.github.normalizer import normalize_github_commit, normalize_github_pr
from backend.integrations.jira.normalizer import normalize_jira_issue
from backend.schemas.evidence import CanonicalEvidence


def test_github_commit_normalization():
    raw_commit = {
        "sha": "a1b2c3d4e5",
        "commit": {
            "message": "feat(auth): Add JWT middleware validation",
            "author": {
                "name": "Jane Doe",
                "email": "jane@example.com",
                "date": "2026-09-24T08:30:00Z"
            }
        },
        "author": {"login": "janedoe"},
        "html_url": "https://github.com/myorg/myrepo/commit/a1b2c3d4e5"
    }

    ev = normalize_github_commit(raw_commit, "myorg", "myrepo", employee_id="emp-123")
    assert isinstance(ev, CanonicalEvidence)
    assert ev.source == "github"
    assert ev.source_type == "commit"
    assert ev.source_reference == "myorg/myrepo#a1b2c3d4e5"
    assert ev.employee_id == "emp-123"
    assert ev.title == "feat(auth): Add JWT middleware validation"
    assert ev.is_mapped is True
    assert ev.metadata["author_username"] == "janedoe"


def test_jira_issue_normalization():
    raw_issue = {
        "key": "DEV-402",
        "fields": {
            "summary": "Fix connection pool exhaustion in worker nodes",
            "description": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Under high load, worker pool leaks sockets."}]
                    }
                ]
            },
            "status": {"name": "In Progress"},
            "assignee": {
                "emailAddress": "jane@example.com",
                "displayName": "Jane Doe"
            },
            "updated": "2026-09-24T09:00:00Z"
        }
    }

    ev = normalize_jira_issue(raw_issue, "https://company.atlassian.net", "DEV", employee_id="emp-123")
    assert isinstance(ev, CanonicalEvidence)
    assert ev.source == "jira"
    assert ev.source_type == "issue"
    assert ev.source_reference == "company.atlassian.net#DEV-402"
    assert ev.employee_id == "emp-123"
    assert "[DEV-402]" in ev.title
    assert "leaks sockets" in ev.content
    assert ev.metadata["assignee_email"] == "jane@example.com"
