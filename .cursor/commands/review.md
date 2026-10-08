# Review

Review the current changes (or the area named after the command) for correctness, pedagogy, and design.

1. Run the **tester** subagent: add any missing tests for changed logic, then run typecheck, lint, tests and build.
2. If the change touches a **module** (`src/modules/**`) or LLM prompts/validators, run the **pedagogy-reviewer** subagent and include its PASS/FAIL table.
3. Run the **ui-designer** subagent on changed UI/CSS/HTML. It checks against `30-design-system.mdc` and `00-user-context.mdc`.
4. Fix issues found, keeping edits small. Re-run the tester until everything is green.
5. Summarize: what was checked, what was fixed, pedagogy AC status, and anything still open for Vladislav.
