git commit -m "fix: Implement anchor-based warmth model to prevent score jumps

PROBLEM: Mode switching caused score jumps. Users expected score to stay same with only future decay rate changing.

SOLUTION: Anchor-based decay model that preserves score continuity.

Changes:
- Added warmth_anchor_score, warmth_anchor_at columns
- New functions: warmthScoreFromAnchor, applyModeSwitchNoJump, applyTouch
- Updated PATCH endpoint to re-anchor on mode switch
- Migration backfills existing contacts
- SQL warmth_score_from_anchor function

Result:
- Before: Switch medium to fast, score 75 to 25 (jump)
- After: Switch medium to fast, score 75 to 75 (smooth, only future slope changes)

Migration: 20251102_warmth_anchor_model.sql"

git push origin feat/dev-dashboard
