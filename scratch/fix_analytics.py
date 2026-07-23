import os

file_path = r"backend\src\controllers\analytics.controller.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace userRole extractors
content = content.replace(
    "const userRole = req.user?.role;",
    "const perms = req.user?.permissions || [];"
)
content = content.replace(
    "const userRole = (req as any).user?.role;",
    "const perms = (req as any).user?.permissions || [];"
)

# 2. Replace role checks
content = content.replace(
    "userRole === 'recruiter'",
    "(perms.includes('analytics:view_own') || perms.includes('candidates:view_own'))"
)
content = content.replace(
    "userRole === 'team_lead'",
    "(perms.includes('analytics:view_team') || perms.includes('team:view_kpis'))"
)
content = content.replace(
    "(userRole === 'client_manager' || userRole === 'bdm')",
    "(perms.includes('analytics:view_own_clients') || perms.includes('clients:view_own'))"
)
content = content.replace(
    "((perms.includes('analytics:view_own_clients') || perms.includes('clients:view_own')) || (perms.includes('analytics:view_own_clients') || perms.includes('clients:view_own')))",
    "(perms.includes('analytics:view_own_clients') || perms.includes('clients:view_own'))"
) # just in case
content = content.replace(
    "userRole === 'client_manager'",
    "(perms.includes('analytics:view_own_clients') || perms.includes('clients:view_own'))"
)
content = content.replace(
    "userRole === 'bdm'",
    "(perms.includes('analytics:view_own_clients') || perms.includes('clients:view_own'))"
)
content = content.replace(
    "userRole === 'admin'",
    "(perms.includes('analytics:view') || perms.includes('dashboard:view'))"
)
content = content.replace(
    "userRole !== 'admin'",
    "!(perms.includes('analytics:view') || perms.includes('dashboard:view'))"
)
content = content.replace(
    "userRole !== 'team_lead'",
    "!(perms.includes('analytics:view_team') || perms.includes('team:view_kpis'))"
)
content = content.replace(
    "userRole !== 'client_manager'",
    "!(perms.includes('analytics:view_own_clients') || perms.includes('clients:view_own'))"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done replacing.")
