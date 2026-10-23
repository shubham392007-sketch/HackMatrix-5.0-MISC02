---
trigger: model_decision
description: Use when the user refers to visual UI annotations, bug feedback, or Agentation notes.
---

## Agentation Visual Feedback

When the user asks to review UI feedback, annotations, or bug reports from Agentation:
- Check pending annotations via the `agentation` MCP tools or from the local server at `http://localhost:4747`
- Each annotation provides the exact CSS selector, DOM hierarchy, React component path, and user comment
- Inspect the referenced React component files to apply the requested visual or layout fixes
