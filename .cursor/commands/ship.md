---
description: Finalize changes, summarize, commit on a feature branch, push, and open a PR
---

Ship the current changes in this repo. Follow the `git-workflow-master` rule (`.cursor/rules/git-workflow-master.mdc`) for commit and branch conventions. Run the steps in order and do not ask for confirmation between steps unless a stop condition is hit.

## 1. Preflight

- Run `git status` and `git diff` (staged and unstaged). If there are no changes, stop and say so.
- Run `git remote get-url origin`. If it fails, stop and print:
  ```
  git remote add origin git@github-sagetech:sagetech24/show-desk.git
  git push -u origin main
  ```
  (Use the `github-sagetech` SSH alias. Plain HTTPS fails with 403 on this machine.)
- If a push or fetch fails with 403 or "Permission denied", do not retry with other credentials. Check `git remote get-url origin` uses the `github-sagetech` alias and report the error.
- Run `git branch --show-current` and note the branch.

## 2. Finalize

- Run `npm run typecheck`. If it fails, fix trivial errors and re-run. Stop if the failure is not trivial.
- Run `npm run build` only if files under `src/` or `migrations/` changed. If it fails, stop.

## 3. Safety gate (before staging)

- Never stage: `.env`, `.env.*` (except `.env.example`), `.data/`, `.next/`, `node_modules/`, `*.tsbuildinfo`, or any file that looks like a credential or database dump.
- Scan the diff for secrets: values of `IG_ACCESS_TOKEN`, `ADMIN_PASSWORD`, `IG_USER_ID`; connection strings with credentials such as `postgres://user:pass@`; long random tokens. If found, stop and report the file and line. Do not commit.
- If `src/app/actions/**`, `src/app/api/**`, `src/app/login/**`, `src/lib/auth*`, or env/config handling changed, review the diff against the `application-security-engineer` rule (`.cursor/rules/application-security-engineer.mdc`). Stop on high-severity findings.

## 4. Summary

Write a short summary of what changed and why, grouped by area: UI, server actions and API, database and migrations, tooling and docs. Keep it factual. This becomes the PR body.

## 5. Branch and commit

- If on `main`, create a branch from the diff: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, or `docs/<slug>`. Never commit directly to `main`.
- Split the changes into atomic conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`) by concern when the diff is mixed. Each commit should be revertable on its own.
- Stage files by name. Do not use `git add -A` without checking the list first.
- Never use `--no-verify`. Never amend commits that are already pushed.

## 6. Push

- Run `git push -u origin <branch>`.
- Never force-push. Use `--force-with-lease` only if the user explicitly asks.

## 7. Pull request

- If `gh` is installed and the remote is GitHub, run `gh pr create --base main --head <branch> --title "<conventional title>" --body "<summary>"` and print the URL.
- If `gh` is missing or not authenticated, print the compare URL instead: `https://github.com/sagetech24/show-desk/compare/main...<branch>`.

## 8. Report

Print the branch name, the commit list (`git log --oneline main..HEAD`), the PR URL or compare URL, and the typecheck and build results.
