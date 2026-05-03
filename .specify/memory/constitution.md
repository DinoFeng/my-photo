# My-Photo Constitution

## Core Principles

### I. Code Quality

Every feature MUST be implemented with production-quality code from inception.

- **Self-documenting code**: Variable and function names MUST clearly convey intent without requiring comments to explain "why"
- **Consistent style**: Code MUST follow established project formatting conventions; automated linting MUST pass without suppression
- **Error handling**: All external operations (I/O, network, system calls) MUST have explicit error handling with meaningful messages
- **No dead code**: Unused functions, variables, imports, and files MUST be removed before commits
- **Single responsibility**: Each module and function MUST have one clear purpose; overly complex functions MUST be refactored

**Rationale**: Code is read far more often than written. Quality directly impacts maintainability, bug rate, and team velocity.

### II. Testing Standards

All features MUST be tested at appropriate levels with clear pass/fail criteria.

- **Unit tests**: Core business logic, utilities, and algorithms MUST have unit tests with >80% coverage for critical paths
- **Contract tests**: Public APIs and module interfaces MUST have contract tests verifying input/output contracts
- **Integration tests**: Multi-component workflows MUST have integration tests covering primary user journeys
- **Test independence**: Each test MUST be able to run in isolation without depending on execution order or shared state
- **Meaningful assertions**: Tests MUST assert specific outcomes, not just absence of crashes

**Rationale**: Tests provide confidence to refactor, document expected behavior, and catch regressions early.

### III. User Experience Consistency

All user-facing elements MUST maintain consistent patterns and behavior.

- **Interaction consistency**: Similar actions across the application MUST behave identically (e.g., button styles, form validation, error displays)
- **Clear feedback**: User actions MUST produce immediate, visible feedback; long operations MUST show progress indicators
- **Predictable navigation**: User flows MUST follow mental models; back navigation MUST return to the previous logical location
- **Accessible by default**: UI components MUST support keyboard navigation and screen readers; color MUST not be the only differentiator
- **Responsive layouts**: UI MUST adapt appropriately to different screen sizes without functionality loss

**Rationale**: Inconsistency creates cognitive load and confusion; users must build a mental model that works everywhere.

### IV. Performance Requirements

Performance is a feature; slow implementations MUST be optimized.

- **Response time**: Interactive operations MUST complete within 200ms; operations >2s MUST show progress indication
- **Resource efficiency**: Memory and CPU usage MUST be appropriate for the operation; no memory leaks or unbounded growth
- **Lazy loading**: Resources MUST load on-demand unless preloading demonstrably improves user experience
- **Efficient data handling**: Large datasets MUST be paginated or virtualized; unnecessary data transfers MUST be eliminated
- **Performance testing**: Performance-critical paths MUST have benchmarks to detect regressions

**Rationale**: Users abandon slow experiences; performance affects perceived quality and accessibility on lower-end devices.

## Quality Gates

All features MUST pass the following gates before merge:

1. **Linting**: `npm run lint` (or equivalent) passes with zero errors
2. **Type checking**: TypeScript/typed code passes type checks without errors
3. **Unit tests**: `npm test` passes with >80% coverage on critical paths
4. **Contract tests**: All API/module contracts verified passing
5. **Integration tests**: Primary user journeys execute successfully
6. **Accessibility audit**: Core user flows pass accessibility checks
7. **Performance check**: No regression in benchmark results for critical paths

## Governance

This constitution supersedes informal practices. Amendments MUST follow this process:

1. **Proposal**: Document the proposed change with rationale
2. **Impact assessment**: Evaluate effects on existing features and workflows
3. **Migration plan**: If breaking, document how existing code adapts
4. **Approval**: Obtain explicit confirmation from stakeholders
5. **Version bump**: Increment version appropriately per semantic versioning

**Version**: 1.0.0 | **Ratified**: 2026-05-03 | **Last Amended**: 2026-05-03

<!-- SYNC IMPACT REPORT -->
<!--
Version change: N/A → 1.0.0 (initial creation)
Added sections:
  - Core Principles (I. Code Quality, II. Testing Standards, III. User Experience Consistency, IV. Performance Requirements)
  - Quality Gates
  - Governance
Removed sections: None
Templates requiring updates: N/A (no changes needed)
  - .specify/templates/plan-template.md: Constitution Check section already generic, no updates needed
  - .specify/templates/spec-template.md: Already has User Scenarios, Requirements, Success Criteria - aligned
  - .specify/templates/tasks-template.md: Already references testing phases, aligned
Follow-up TODOs: None
-->
