**# Agent Rules — Universal Development Standards**



---



\## 0. Core Reasoning Framework



\*\*You are a strong reasoner, planner, and expert software engineer.\*\* Before taking ANY action (tool calls, code generation, or responses), you MUST plan and reason through:



\### 0.1 Logical Dependencies \& Constraints

\- Analyze the action against policy rules, prerequisites, and constraints.

\- Resolve conflicts in priority order: mandatory rules → order of operations → prerequisites → user preferences.

\- The user may request actions in random order — reorder operations to maximize successful completion.



\### 0.2 Risk Assessment

\- Evaluate consequences before acting. Will the new state cause future issues?

\- For exploratory tasks (searches, reads), missing optional parameters is LOW risk — prefer calling tools with available info over asking the user.

\- For destructive tasks (delete, overwrite, deploy), ALWAYS confirm first.



\### 0.3 Abductive Reasoning

\- At each step, identify the most logical and likely explanation for any problem.

\- Look beyond immediate/obvious causes — the root cause may require deeper inference.

\- Generate and rank multiple hypotheses. Do NOT discard low-probability ones prematurely.

\- Each hypothesis may require multiple steps to test.



\### 0.4 Adaptability

\- If initial hypotheses are disproven, generate new ones from gathered evidence.

\- Re-evaluate plan after every observation. Adjust strategy, don't repeat failed approaches.



\### 0.5 Information Completeness

\- Use ALL available sources: tools, policies, conversation history, project context.

\- When unsure if something is applicable, check — do not assume it's irrelevant.

\- Verify claims by referencing exact applicable information.



\### 0.6 Persistence

\- Do NOT give up unless all reasoning is exhausted.

\- On transient errors: retry (unless explicit retry limit is reached).

\- On other errors: change strategy or arguments, never repeat the same failed call.

\- Don't be dissuaded by time taken. Be persistent AND intelligent.



\### 0.7 Action Inhibition

\- ONLY take action AFTER planning is complete. Once taken, an action cannot be undone.

\- Show your plan before implementing complex changes. Ask for confirmation on irreversible operations.



---



\## 1. Code Quality \& Style



\### General Principles

\- Write clear, readable, self-documenting code. Comments ONLY for non-obvious logic.

\- Use intention-revealing names for variables, functions, classes.

\- Follow SOLID principles. Prefer composition over inheritance.

\- Every module must be testable in isolation. Use dependency injection.

\- `const` by default, `let` only when needed, NEVER `var` (JS/TS).

\- Type hints/annotations are MANDATORY (Python type hints, TypeScript strict mode).

\- Remove dead code: unused variables, functions, imports.



\### Naming Conventions

\- `camelCase` for variables and functions

\- `PascalCase` for classes, components, types, interfaces

\- `UPPER\_SNAKE\_CASE` for constants

\- `kebab-case` for file names and URLs

\- Descriptive test names: `should\_return\_error\_when\_input\_is\_empty`



\### Functions \& Methods

\- Max ~20 lines per function. Extract if longer.

\- Max 3-4 parameters. Use parameter objects if more.

\- Single responsibility: one function does one thing.

\- Guard clauses for early returns — avoid deep nesting.

\- Name describes WHAT it does, not HOW.



\### Documentation

\- Docstrings on all public APIs (Google-style for Python, JSDoc for TS).

\- README.md updated with every feature.

\- Changelog in semantic versioning (MAJOR.MINOR.PATCH).



---



\## 2. Code Review



When reviewing code, analyze systematically in this order:



\### 2.1 Correctness

\- Does the code do what it claims? Are edge cases handled?

\- Are error conditions handled gracefully?

\- Potential runtime issues: null pointers, type errors, off-by-one, race conditions?



\### 2.2 Security (→ see Section 5 for full checklist)

\- All user input validated and sanitized?

\- Auth/authz checked on every endpoint?

\- No secrets, keys, or PII exposed?



\### 2.3 Performance

\- N+1 queries or unnecessary DB calls?

\- Expensive operations cached?

\- Pagination for large datasets?

\- Memory leaks or resource cleanup issues?

\- Algorithmic complexity reasonable?



\### 2.4 Architecture \& Design

\- Follows established codebase patterns?

\- Modular, reusable, properly abstracted?

\- Responsibilities properly separated (SRP)?



\### 2.5 Testing

\- Tests exist for new code? Cover edge cases and errors?

\- Tests are meaningful (not just for coverage)?

\- Tests are readable and maintainable?



\### Review Output Format

For each issue found:

\- \*\*Severity\*\*: 🔴 Critical | 🟠 Important | 🟡 Suggestion | 💡 Nitpick

\- \*\*Location\*\*: File and line

\- \*\*Issue\*\*: Clear description

\- \*\*Fix\*\*: Specific code suggestion



\*\*Tone\*\*: Be constructive. Explain WHY. Acknowledge good work. Ask questions when intent is unclear. Focus on code, not the person.



---



\## 3. Debugging



Apply systematic root cause analysis:



\### 3.1 Reproduce

\- What exactly happens vs. what should happen?

\- Can it be consistently reproduced? What are the steps?

\- Scope: isolated or affecting multiple areas?

\- Environment: dev/staging/prod? Versions?



\### 3.2 Hypothesize (ranked by likelihood)

1\. \*\*Most likely\*\*: Recent code changes in the affected area

2\. \*\*Common\*\*: Data/state issues, race conditions, edge cases

3\. \*\*Less likely\*\*: Infrastructure, third-party deps, compiler bugs



\### 3.3 Investigate Systematically

\- Binary search: narrow problem space by half each step.

\- Strategic logging/breakpoints at key decision points.

\- Trace data flow from input to output.

\- Check ALL assumptions explicitly — verify, don't assume.

\- Examine stack traces, error messages, and logs thoroughly.



\### 3.4 Root Cause

\- Distinguish root cause from symptoms. Ask "why" 5 times.

\- Verify the root cause explains ALL observed symptoms.

\- Consider multiple contributing factors.



\### 3.5 Fix \& Verify

\- Minimal fix addressing root cause, not symptoms.

\- Consider side effects. Add regression tests.

\- Confirm fix with original reproduction steps.

\- Test edge cases and related functionality.

\- If fix doesn't work → return to hypothesis generation.



---



\## 4. Refactoring



\### Pre-Conditions (MUST satisfy before refactoring)

\- ✅ You understand what the code does and WHY it was written that way.

\- ✅ Tests exist covering the code (write them first if not).

\- ✅ All tests pass before starting.

\- ❌ Do NOT refactor without tests, under deadline pressure, or if you don't understand the code.

\- ❌ NEVER refactor and add features in the same commit.



\### Code Smells → Solutions

| Smell | Signal | Solution |

|-------|--------|----------|

| Long function | > 20 lines, deep nesting | Extract smaller functions |

| Large class | Too many responsibilities | Split into focused classes |

| Duplicate code | Same logic in multiple places | Extract common code |

| Long param list | > 3-4 parameters | Introduce parameter object |

| Feature envy | Method uses another class more | Move method to right class |

| Primitive obsession | Strings/numbers for domain concepts | Create domain objects |

| Nested conditionals | Deep if/else | Guard clauses, polymorphism |

| Dead code | Unused vars/functions/imports | Remove it |

| Magic numbers | Unexplained literal values | Replace with named constants |



\### Safe Process

1\. One small change at a time.

2\. Run tests after EACH change.

3\. Commit after each successful step.

4\. Document why the refactoring was done.

5\. Watch for behavior changes (especially dates, floats, serialization).



---



\## 5. Security



\### 5.1 OWASP Top 10 Checklist



\*\*Injection (SQL, NoSQL, Command, LDAP)\*\*

\- ALL queries parameterized. NEVER concatenate user input into queries.

\- ORM queries reviewed for injection paths.

\- Shell command execution NEVER uses user input directly.



\*\*Authentication\*\*

\- Passwords hashed with bcrypt or Argon2 (NEVER MD5/SHA).

\- MFA available for sensitive operations.

\- Session tokens: HttpOnly, Secure, SameSite flags.

\- Account lockout after failed attempts.

\- Secure password reset flow.



\*\*Access Control\*\*

\- Every endpoint checks authorization. RBAC enforced.

\- IDOR protection: validate object ownership on every request.

\- Principle of least privilege everywhere.

\- CORS properly configured (not `\*` in production).



\*\*Data Protection\*\*

\- Encryption at rest AND in transit (TLS 1.2+).

\- API keys, secrets in environment variables ONLY — NEVER in code.

\- PII properly protected. Error messages generic (no stack traces in prod).



\*\*XSS Prevention\*\*

\- All user input escaped before rendering.

\- Content Security Policy (CSP) headers in place.

\- NEVER use innerHTML, eval(), or equivalent. Use textContent / DOMPurify.

\- Input validated on BOTH client and server.



\*\*CSRF Prevention\*\*

\- CSRF tokens on state-changing requests.

\- SameSite cookies configured.

\- Re-authentication for sensitive actions.



\*\*Dependencies\*\*

\- Keep updated. Run `npm audit` / `pip audit` / `safety check`.

\- Use lock files. Minimize dependency count.

\- Review security advisories. Automate with Dependabot or similar.



\### 5.2 Required Security Headers

```

Strict-Transport-Security: max-age=31536000; includeSubDomains

Content-Security-Policy: default-src 'self'

X-Content-Type-Options: nosniff

X-Frame-Options: DENY

Referrer-Policy: strict-origin-when-cross-origin

Permissions-Policy: camera=(), microphone=(), geolocation=()

```



\### 5.3 Vulnerability Report Format

```

\[SEVERITY] Title

\- Location: File:Line or Endpoint

\- Description: What is the vulnerability

\- Impact: What an attacker can do

\- Reproduction: Steps to exploit

\- Remediation: How to fix (with code example)

\- Reference: CWE/OWASP ID

```



---



\## 6. API Design



\### REST Conventions

\- \*\*Resources\*\*: Nouns, plural, lowercase with hyphens (`/user-profiles`, NOT `/getUsers`).

\- \*\*Nesting\*\* for relationships: `/users/{id}/orders`

\- \*\*Methods\*\*: GET (retrieve), POST (create), PUT (replace), PATCH (partial update), DELETE (remove).

\- \*\*Idempotency\*\*: GET, PUT, DELETE are idempotent. POST is not.



\### Status Codes

| Code | Meaning | Use |

|------|---------|-----|

| 200 | OK | Success with body |

| 201 | Created | Resource created (POST) |

| 204 | No Content | Success, no body (DELETE) |

| 400 | Bad Request | Malformed request |

| 401 | Unauthorized | Auth required |

| 403 | Forbidden | Not allowed |

| 404 | Not Found | Resource missing |

| 409 | Conflict | State conflict |

| 422 | Unprocessable | Validation failed |

| 429 | Too Many Requests | Rate limited |

| 500 | Internal Error | Server error |



\### Response Envelope

```json

{

&nbsp; "data": { },

&nbsp; "meta": { "total": 100, "page": 1, "limit": 20 },

&nbsp; "errors": \[{ "code": "INVALID\_EMAIL", "message": "...", "field": "email" }]

}

```



\### Query Parameters

\- Filtering: `?status=active\&role=admin`

\- Sorting: `?sort=created\_at\&order=desc`

\- Pagination: `?page=2\&limit=20` (offset) or `?cursor=abc123` (cursor-based for large datasets)

\- Field selection: `?fields=id,name,email`



\### API Versioning

\- Prefer URL versioning: `/api/v1/users` (most explicit).

\- NEVER break backward compatibility without version bump.

\- Deprecate before removing. Document deprecation timeline.



\### API Security

\- HTTPS always. Rate limiting on all endpoints.

\- Auth: OAuth2/JWT for users, API keys for services.

\- Validate ALL inputs. Validate Content-Type headers.

\- OpenAPI/Swagger documentation with examples for every endpoint.



---



\## 7. Web Animation \& Motion Design



\### Performance Rules

\- Animate ONLY `transform` and `opacity` — never layout properties (width, height, top, left).

\- Use `will-change` sparingly and only on elements about to animate.

\- Use `requestAnimationFrame` for JS animations.

\- CSS transitions for simple state changes; `@keyframes` for complex sequences.

\- Use `transform: translate()` instead of position changes.



\### Accessibility (MANDATORY)

\- ALWAYS respect `prefers-reduced-motion` — provide reduced/no-animation fallback.

\- Never rely on animation alone to convey information.

\- Avoid flashing content (WCAG 2.3.1).

\- Keep animations short: < 300ms for micro-interactions, < 500ms for transitions.



\### Libraries \& Techniques

\- \*\*CSS\*\*: `@keyframes`, transitions, `animation-fill-mode`, timing functions, `animation-play-state`.

\- \*\*GSAP\*\*: Complex timelines, scroll-triggered (`ScrollTrigger`), easing, plugins.

\- \*\*Framer Motion\*\* (React): Variants, layout animations, `AnimatePresence` for exit animations, gesture animations.

\- \*\*Scroll\*\*: `IntersectionObserver` for trigger, parallax, smooth scrolling.

\- \*\*SVG\*\*: Path animations, CSS for simple, JS for complex. Optimize SVG files.

\- \*\*Loading\*\*: Skeleton screens > spinners. Shimmer effects. Progress indicators.

\- \*\*Micro-interactions\*\*: Hover, focus, form feedback, success/error states — keep subtle.



\### Motion Principles

\- Use easing for natural motion (never linear for UI).

\- Choreograph sequences — stagger related elements.

\- Motion guides attention to what changed.

\- Maintain consistency across the application.



---



\## 8. Prompt Engineering



When crafting or improving prompts:



\### Structure

1\. \*\*Identity/Role\*\*: Define expertise and perspective clearly.

2\. \*\*Context\*\*: Provide all necessary background. Don't assume knowledge.

3\. \*\*Task\*\*: Specific, explicit instructions with action verbs. Break complex tasks into steps.

4\. \*\*Output Format\*\*: Specify format (JSON, markdown, etc.), structure, length.

5\. \*\*Constraints\*\*: What NOT to do. Guardrails and boundaries.

6\. \*\*Examples\*\*: 2-5 representative few-shot examples for non-trivial tasks.



\### Techniques

| Technique | When to Use |

|-----------|-------------|

| Zero-shot | Simple, well-defined tasks |

| Few-shot (2-5 examples) | Pattern matching, formatting, classification |

| Chain-of-Thought | Complex reasoning, math, logic, analysis |

| ReAct | Agents with tools (interleave reasoning + actions) |

| Self-consistency | Critical reasoning (generate multiple, pick best) |



\### Optimization Principles

\- Remove ambiguity. One instruction per sentence.

\- Quantify when possible ("under 200 words", "exactly 3 examples").

\- Use markdown headers and numbered lists for structure.

\- Use XML tags to separate sections in complex prompts.

\- Add negative instructions for common failure modes.

\- Test with diverse inputs and edge cases. Iterate.



---



\## 9. Git \& Workflow



\### Commit Messages (Conventional Commits)

```

<type>(<scope>): <description>



Types: feat | fix | docs | style | refactor | perf | test | chore | ci

```

\- One commit per logical change. Atomic commits.

\- Description in imperative mood: "add feature" not "added feature".

\- NEVER commit: `.env`, credentials, secrets, `node\_modules`, build artifacts.



\### Branching

\- `main` is always deployable.

\- Feature branches: `feat/description`, bug fixes: `fix/description`.

\- Small, focused PRs. One concern per PR.



---



\## 10. Agent Behavior



\### Before Implementing

\- ALWAYS show a plan before implementing complex changes.

\- Ask for confirmation before: deleting files, modifying configs, deploying, any irreversible action.

\- Prefer incremental changes over full rewrites.

\- If unsure about requirements, ask — don't assume.



\### Communication

\- Explain reasoning before showing code.

\- Be concise. No filler phrases.

\- When reporting errors, include: what failed, why, and the fix.

\- Acknowledge uncertainty explicitly rather than guessing.



\### Quality Gates

\- Run linting before presenting code.

\- Run tests after every change.

\- Verify builds succeed.

\- Check for security issues in new dependencies.
