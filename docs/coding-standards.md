# Coding Standards

This project follows strict coding standards to ensure code quality and maintainability.

## TypeScript and Types

- **Strict TypeScript**: We use strict mode in TypeScript.
- **No `any`**: The use of `any` is strictly prohibited. Define explicit interfaces or types instead.

## Functional Programming

- **Pure Functions**: Default to pure functions wherever possible.
- **Immutable Data**: Avoid mutating objects or arrays directly. Use `const` declarations. Use immutable methods like `map`, `filter`, and `reduce` instead of traditional `for` loops.
- **No Shared Mutable State**: Push side effects to the boundaries/edges of the application.

## Architecture and Structure

- **Folder by Feature**: Organize files by feature or domain, rather than by shared technical layers (e.g., all models together, all controllers together).
- **Environment Variables**: Fail fast on startup if a required environment variable is missing (e.g. check at startup in `app/env.ts` or similar).

## Styling and UI

- **Accessibility**: All screens must have a baseline level of accessibility: adequate color contrast, visible focus states, and full keyboard operability.
- **Shared Styles**: Do not copy-paste raw Tailwind utility classes across multiple files if they represent a repeatable visual pattern. Use `globals.css` or create a shared React component for those patterns.

## Tooling Enforcements

- **Prettier**: Enforces consistent code formatting on commit.
- **ESLint**: Enforces the "no `any`" rule, unused variables checking, and best practices.
- **Husky & Lint-Staged**: A pre-commit hook automatically formats and lints all staged files. You cannot commit code that fails formatting or linting.

## Testing and Verification

- **Run Before Commit**: After making changes, actually run the dev server, typecheck, lint, and build. Ensure the application functions correctly in a real browser. Fix failures before marking tasks as complete.
