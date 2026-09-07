# Common AI Slop

AI slop is code that looks plausible and complete, but is unnecessarily verbose, generic, inconsistent, brittle, or disconnected from the codebase’s actual conventions.

## 1. Unnecessary Abstractions

- Interfaces with only one implementation
- Factory → service → manager → repository chains for trivial logic
- Wrapper classes that add no behavior
- Generic `BaseService<T>` created prematurely
- Excessive dependency injection for simple helpers

## 2. Over-Engineering

- Design patterns added without need
- CQRS for basic CRUD
- Event buses for local method calls
- Complex configuration systems for two settings
- Plugin architectures where nothing is pluggable
- “Future-proofing” speculative requirements

## 3. Excessive Comments

- Comments explaining obvious code
- `// increment counter`
- Huge docstrings restating method names
- AI-generated essay-like comments
- Comments describing implementation instead of intent

## 4. Meaningless Naming

- `data`, `result`, `item`, `temp`, `obj`
- `processData()`
- `handleRequest()`
- `Manager`, `Helper`, `Util`, `Processor` everywhere
- Different names for the same domain concept

## 5. Copy-Paste Duplication

- Nearly identical functions
- Same validation logic repeated
- Repeated API wrappers
- Duplicate DTO mappings
- Slightly modified blocks produced instead of reusing existing code

## 6. Ignoring Existing Codebase Patterns

- Inventing a new logging approach
- Introducing another HTTP client library
- Creating new folder structures
- Adding another state-management pattern
- Ignoring existing utility functions
- Reimplementing functionality already present

## 7. Dependency Slop

- Installing libraries for trivial operations
- Duplicate libraries doing the same thing
- Large dependencies for one function
- Abandoned packages
- Unnecessary version upgrades
- Mixing competing frameworks

## 8. Error-Handling Slop

- `catch (Exception) { }`
- Catching and rethrowing unchanged
- Returning `null` for every failure
- Swallowing errors
- Generic `"Something went wrong"`
- Excessive try/catch around every function
- Retrying non-retryable failures

## 9. Fake Robustness

- Null checks on values that cannot be null
- Defensive code against impossible states
- Arbitrary fallback values
- Silent fallback masking real bugs
- Huge validation layers for internal trusted objects

## 10. Fake Completeness

- TODOs hidden behind apparently working APIs
- Stub implementations returning empty arrays
- Placeholder values in production paths
- Mock implementations accidentally wired into real code
- Functions returning success without actually doing anything

## 11. Hallucinated APIs

- Calling methods that don't exist
- Using outdated library APIs
- Incorrect configuration properties
- Invented command-line options
- Assuming framework behavior that isn't real

## 12. Dead Code

- Unused helpers
- Unreachable branches
- Unused imports
- Old implementations left behind
- Feature flags that no longer do anything
- Generated methods that are never called

## 13. Boilerplate Explosion

- 200 lines for something requiring 20
- Unnecessary DTO → model → entity → response transformations
- Giant configuration classes
- Excessive getters/setters
- Repetitive builder patterns

## 14. Premature Generalization

- Making everything generic
- Supporting hypothetical future databases/providers/formats
- Generic strategy systems with one strategy
- Configurable behavior nobody needs

## 15. Poor Architecture Boundaries

- UI directly querying the database
- Controllers containing business logic
- Domain logic inside repositories
- Infrastructure leaking everywhere
- Circular dependencies
- Modules knowing too much about each other

## 16. God Objects / God Functions

- Massive service classes
- Functions doing validation + DB + networking + formatting
- Files thousands of lines long
- Classes accumulating unrelated responsibilities

## 17. Tiny-Function Slop

- Breaking simple code into dozens of 1–2 line functions
- Functions that merely rename another function call
- Excessive indirection making code hard to follow

## 18. Async Slop

- `async` functions with no asynchronous work
- Blocking inside async code
- Fire-and-forget tasks without handling failures
- Excessive parallelism
- Race conditions introduced by unnecessary concurrency

## 19. Performance Slop

- N+1 database queries
- Loading entire tables into memory
- Repeated API calls
- Repeated parsing/serialization
- Unbounded loops
- Unnecessary polling
- Missing pagination

## 20. Database Slop

- `SELECT *`
- Missing indexes on obvious access paths
- Queries inside loops
- Business logic embedded in random SQL
- No transactions where atomicity matters
- Overusing transactions where they don't
- Duplicate schema representations

## 21. Security Slop

- Secrets committed to source
- SQL injection
- String-built queries
- Missing authorization checks
- Trusting user input
- Logging tokens/passwords
- Insecure defaults
- Overly permissive CORS
- Disabling TLS/security checks “temporarily”

## 22. Frontend Slop

- Giant components
- Business logic inside UI components
- Prop drilling everywhere
- State duplicated across multiple locations
- Effects used for derived state
- Excessive rerenders
- Hardcoded styling
- Inconsistent spacing/components

## 23. API Slop

- Inconsistent endpoint naming
- Different response structures everywhere
- Always returning `200`
- Incorrect HTTP verbs
- Missing pagination
- Breaking API contracts unnecessarily
- Leaking internal exceptions

## 24. Configuration Slop

- Hardcoded URLs
- Hardcoded environment assumptions
- Config values duplicated in code
- Environment variables read throughout the app
- Giant `.env` files with undocumented variables

## 25. Testing Slop

- Tests that assert nothing useful
- Tests that only verify mocks
- One test per getter/setter
- Huge snapshot tests
- Tests coupled tightly to implementation
- AI creating hundreds of shallow tests to inflate coverage

## 26. Mock Slop

- Mocking everything
- Mocking your own domain logic
- Mocks behaving differently from real systems
- Huge setup sections
- Tests passing despite broken integration

## 27. Exception-Driven Control Flow

- Throwing exceptions for expected states
- Using exceptions instead of normal branching
- Catching exceptions to determine whether something exists

## 28. Magic-Value Slop

- Random numbers
- String constants scattered everywhere
- `"active"`, `"pending"`, `"completed"` repeated manually
- Undocumented timeout/retry values

## 29. Logging Slop

- Logging every method entry/exit
- Logging huge objects
- Sensitive information in logs
- No correlation IDs where needed
- Everything logged as `Information`
- Duplicate logging of the same failure

## 30. AI-Style Verbosity

- `UserDataProcessingServiceManager`
- `IUserDataProcessingServiceManager`
- `UserDataProcessingServiceManagerImpl`
- Long explanatory comments
- Excessive headings in docs
- Excessive helper functions
- “Enterprise-looking” code with little substance

## 31. Inconsistent Code Style

- Different naming conventions in adjacent files
- Mixed error-handling styles
- Mixed async patterns
- Different DTO conventions
- Different dependency injection styles

## 32. Unnecessary Rewrites

- AI replaces working code instead of modifying it
- Rewrites entire files for a 3-line change
- Changes formatting unrelated to the task
- Renames unrelated variables
- Causes huge noisy diffs

## 33. Scope Creep

- User asks to fix one bug; AI also refactors architecture
- Adds tests, docs, abstractions, config, libraries unnecessarily
- “While we're here…” changes

## 34. Broken Edge Cases

- Empty inputs
- Pagination boundaries
- Concurrency
- Time zones
- Unicode
- Large files
- Network failures
- Partial DB failures

## 35. False Assumptions

- Assuming IDs are sequential
- Assuming lists are non-empty
- Assuming APIs always succeed
- Assuming local timezone
- Assuming file paths/platform behavior
- Assuming ordering without explicitly requesting it

## 36. Documentation Slop

- README claims features that don't exist
- Generated architecture docs that don't match code
- Massive documentation for trivial modules
- Copy-pasted generic setup instructions

## 37. Version-Control Slop

- Generated files committed unnecessarily
- Huge unrelated diffs
- Build artifacts checked in
- Debug files left behind
- Environment-specific configuration committed

## 38. Inconsistent Domain Modelling

- Same concept represented differently across modules
- `UserId` string here, integer elsewhere
- Status represented by enum/string/int in different places
- Duplicate domain entities

## 39. Violation of Local Conventions

One of the most important Slop Meter categories.

Even objectively good code can be slop if it ignores how the repository works.

Examples:

- Introducing a new pattern when an established one already exists
- Naming things differently from surrounding code
- Ignoring existing helpers or infrastructure
- Putting logic in a layer where the codebase normally does not
- Using a different error-handling strategy from nearby code

## 40. Complexity Without Value

A useful highest-level slop rule:

> **Does this code introduce more complexity than the value it provides?**

# Suggested Slop Meter Dimensions

The categories above can be collapsed into eight high-level dimensions.

| Dimension | Examples |
|---|---|
| **Complexity** | Over-engineering, premature abstractions |
| **Maintainability** | Duplication, god classes, poor naming |
| **Correctness** | Edge cases, fake implementations, hallucinated APIs |
| **Architecture** | Bad boundaries, inconsistent patterns |
| **Security** | Unsafe input, secrets, authorization |
| **Performance** | N+1 queries, unnecessary work, memory problems |
| **Repository Fit** | Ignores existing conventions and utilities |
| **AI Fingerprints** | Verbose comments, giant diffs, boilerplate, speculative code |

# Core Slop Meter Principle

**Repository Fit** should be one of the most important dimensions.

Static linters already catch many traditional problems.

The more interesting problem for an AI-powered Slop Meter is detecting:

> **This code isn't necessarily wrong, but a competent engineer familiar with this repository probably wouldn't have written it this way.**

That is where an AI-powered Slop Meter can become much more useful than a traditional linter or static-analysis tool.
