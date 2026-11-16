#!/usr/bin/env bash
# Apply / refresh main branch protection required checks.
# Usage: ./scripts/apply-branch-protection.sh technetechtt-dotcom/Dripless-Carwash
set -euo pipefail
REPO="${1:?owner/repo}"

gh api -X PUT "repos/${REPO}/branches/main/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "backend-check",
      "app-checks (Dripless Customer)",
      "app-checks (Dripless Driver)",
      "app-checks (Dripless Ops Admin)",
      "golden-path",
      "e2e-cross-platform",
      "backup-restore-drill",
      "evidence-s3",
      "secret-scan",
      "dependency-scan",
      "codeql",
      "security-audit (backend-api)",
      "security-audit (Dripless Customer)",
      "security-audit (Dripless Driver)",
      "security-audit (Dripless Ops Admin)",
      "container-scan",
      "repository-scan"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_last_push_approval": true,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

echo "Branch protection applied for ${REPO} main."
