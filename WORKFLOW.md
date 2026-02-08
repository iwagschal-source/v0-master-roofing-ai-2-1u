# Development Workflow

## Branch Rules

- **All new work goes in feature branches** created from `main`:
  ```
  git checkout main
  git pull origin main
  git checkout -b feature/[name]
  ```
- **Never push directly to `main`** — all changes go through pull requests.
- **Test locally before creating a PR** — run `npm run build` to catch errors.
- **Tag working states before major changes** to create safe rollback points:
  ```
  git tag v[version]-[description]
  git push origin v[version]-[description]
  ```

## Safe Rollback Points

| Tag | Commit | Description |
|-----|--------|-------------|
| `v1.0-working-flow` | `b0aea8a` | BTX generation, CSV import, proposal generation — Session 23 complete |

## Feature Branch Naming

- `feature/` — new functionality
- `fix/` — bug fixes
- `refactor/` — code restructuring
