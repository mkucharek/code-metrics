# Contributing to Engineering Metrics Platform

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git
- GitHub personal access token (for testing GitHub integration)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/metrics-v2.git
   cd metrics-v2
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub token
   ```

4. **Run quality checks**
   ```bash
   pnpm check  # TypeScript, ESLint, Prettier
   pnpm test   # Run all tests
   ```

## 📋 Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards below
   - Write tests for new functionality
   - Update documentation as needed

3. **Run quality checks**
   ```bash
   pnpm check          # Type checking, linting, formatting
   pnpm test:coverage  # Tests with coverage report
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```
   
   Pre-commit hooks will automatically:
   - Format your code with Prettier
   - Fix ESLint issues
   - Run type checking
   - Run all tests

5. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🎨 Coding Standards

### TypeScript

- **Strict mode enabled** - All code must pass TypeScript strict checks
- **No `any` types** - Use specific types or `unknown` instead
- **Explicit return types** - For public functions and methods
- **Immutability** - Prefer `const` over `let`, use `readonly` where appropriate

**Good:**
```typescript
function getUserMetrics(userId: string): UserMetrics {
  // ...
}
```

**Bad:**
```typescript
function getUserMetrics(userId: any): any {
  // ...
}
```

### Code Organization

Follow the layered architecture:

```
src/
├── presentation/   # UI layer (CLI, formatters)
├── app/           # Application services
├── domain/        # Business logic (pure functions)
└── infrastructure/ # External systems (DB, APIs)
```

**Rules:**
- Domain layer has no external dependencies
- Presentation layer is thin (no business logic)
- Services orchestrate between layers

### Testing

- **Write tests for all new functionality**
- **Aim for >80% coverage** on new code
- **Use descriptive test names**

```typescript
describe('PRRepository', () => {
  describe('findByAuthor', () => {
    it('returns PRs filtered by author', () => {
      // Test implementation
    });

    it('returns empty array when author has no PRs', () => {
      // Test implementation
    });
  });
});
```

### Validation

- **Use Zod for runtime validation** of external data
- **Validate at boundaries** (API responses, user input, database)

```typescript
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const user = UserSchema.parse(apiResponse);
```

## 📝 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Build process or tooling changes

**Examples:**
```
feat: add pagination to PR repository
fix: handle null dates in metrics computation
docs: update README with coverage instructions
refactor: extract date filtering into utility function
test: add tests for organization metrics
chore: update dependencies
```

## 🧪 Testing Guidelines

### Running Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
pnpm test:ui           # Interactive UI
```

### Writing Tests

1. **Unit tests** for pure functions (domain layer)
2. **Integration tests** for repositories and services
3. **Use in-memory SQLite** for database tests

```typescript
describe('ComputeMetrics', () => {
  it('calculates PR count correctly', () => {
    const prs = [mockPR1, mockPR2];
    const metrics = computeMetrics(prs);
    expect(metrics.prCount).toBe(2);
  });
});
```

### Coverage Requirements

Minimum coverage thresholds:
- **40% lines**
- **70% functions**
- **90% branches**

Strive for >80% on new code.

## 🔍 Code Review Process

### Before Requesting Review

- [ ] All tests pass
- [ ] Coverage meets thresholds
- [ ] Quality checks pass (`pnpm check`)
- [ ] Documentation updated
- [ ] Commit messages follow conventions

### Review Checklist

Reviewers will check:
- Code follows architecture patterns
- Tests are comprehensive
- No `any` types used
- Error handling is appropriate
- Performance considerations addressed

## 🐛 Reporting Issues

### Bug Reports

Include:
- Description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version, etc.)

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative approaches considered
- Impact on existing functionality

## 📚 Resources

- [Architecture Documentation](backlog/docs/architecture.md)
- [Task Breakdown](backlog/tasks/)
- [Project README](README.md)

## ❓ Questions?

If you have questions, please:
1. Check existing documentation
2. Search closed issues
3. Open a new issue with the "question" label

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's ISC License.
