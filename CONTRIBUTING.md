# Contributing to Prime Printify

Thank you for interest in contributing to Prime Printify! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and professional
- Focus on the code, not the person
- Help others learn and grow
- Report serious issues privately

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Code editor (VS Code recommended)

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/Mrcoderv/Printify.git

# Navigate to project
cd Printify

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
# http://localhost:5000
```

### Project Structure
See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed project structure.

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Use meaningful variable names
- Comment complex logic
- Keep functions small and focused
- Maximum 50 lines per function

### Naming Conventions
```typescript
// Components: PascalCase
export function UserDashboard() { }

// Functions/Variables: camelCase
const getUserData = () => { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3

// Types/Interfaces: PascalCase
interface UserData { }
type Status = 'pending' | 'complete'
```

### Component Structure
```typescript
import { useState } from 'react'
import { useData } from '@/hooks/useData'
import { Card } from '@/components/ui/Card'

interface ComponentProps {
  title: string
  onSubmit?: () => void
}

export function MyComponent({ title, onSubmit }: ComponentProps) {
  const [state, setState] = useState(false)
  const { data } = useData()

  const handleClick = () => {
    // Implementation
  }

  return (
    <Card>
      <h1>{title}</h1>
      {/* JSX */}
    </Card>
  )
}
```

### CSS/Styling
- Use Tailwind CSS classes exclusively
- No inline styles
- Use responsive prefixes (md:, lg:, etc.)
- Follow dark mode conventions with `dark:` prefix
- Reference design system colors consistently

```typescript
// Good
<div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-lg">
  
// Bad
<div style={{ backgroundColor: '#fff', padding: '16px' }}>
```

## Commit Guidelines

### Commit Messages
Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, missing semicolons)
- `refactor`: Code refactoring without feature/fix
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Dependency updates, tooling changes

### Examples
```
feat(billing): add discount calculation to bills

fix(dashboard): resolve chart data loading issue

docs: update API documentation

style: format code with prettier

refactor(components): extract shared logic to custom hook
```

### Scope Options
- `auth`: Authentication related
- `billing`: Billing module
- `customers`: Customer management
- `inventory`: Inventory (Phase 2)
- `ui`: UI components
- `api`: API/Backend
- `docs`: Documentation

## Pull Request Process

### Before Submitting PR
1. Create a feature branch: `git checkout -b feature/FEATURE-NAME`
2. Make your changes
3. Test thoroughly
4. Run linter: `npm run lint`
5. Build: `npm run build`
6. Commit with meaningful messages

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Related Issues
Closes #(issue number)

## Testing
How to test these changes:

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Documentation updated
- [ ] No console errors
- [ ] Mobile responsive tested
- [ ] Dark mode tested
```

### PR Review Checklist
Reviewers will check:
- ✅ Code follows style guidelines
- ✅ Changes don't break existing features
- ✅ Performance is acceptable
- ✅ Security best practices followed
- ✅ Documentation is updated
- ✅ Tests pass

## Testing

### Run Tests
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Testing Guidelines
- Write tests for new features
- Aim for >80% code coverage
- Test happy path and error cases
- Mock external dependencies
- Use descriptive test names

### Test Example
```typescript
describe('BillCalculator', () => {
  it('should calculate total with tax', () => {
    const items = [{ price: 100, quantity: 2 }]
    const result = calculateTotal(items, 0.1)
    expect(result).toBe(220)
  })

  it('should handle empty items', () => {
    const result = calculateTotal([], 0.1)
    expect(result).toBe(0)
  })
})
```

## Code Review Process

### Submitting for Review
1. Push to your feature branch
2. Create Pull Request
3. Fill out PR template
4. Request reviewers
5. Address feedback

### Review Comments
- Be specific: "Consider extracting this logic to a custom hook"
- Suggest improvements: "This could be more efficient with..."
- Ask questions: "What's the reason for using X instead of Y?"

### Addressing Feedback
- Respond to all comments
- Make requested changes
- Re-request review after updates
- Discuss disagreements respectfully

## Bug Reporting

### Before Reporting
- Search existing issues
- Check latest version
- Verify it's reproducible

### Bug Report Template
```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: (e.g., macOS)
- Browser: (e.g., Chrome)
- Version: (e.g., 1.0.0)

## Screenshots
Attach relevant screenshots
```

## Feature Requests

### Feature Request Template
```markdown
## Feature Description
What should be added?

## Use Case
Why is this needed?

## Proposed Solution
How should it work?

## Alternative Solutions
Other approaches to consider

## Related Issues
Links to related issues
```

## Documentation

### Update Documentation When
- Adding new features
- Changing existing behavior
- Updating configuration
- Adding API endpoints

### Documentation Files
- `README.md`: Main project overview
- `ROADMAP.md`: Development roadmap
- `ARCHITECTURE.md`: Technical architecture
- `CONTRIBUTING.md`: This file
- Inline code comments for complex logic

## Performance Guidelines

### Frontend Performance
- Bundle size < 500KB (gzipped)
- First contentful paint < 2s
- Lazy load routes
- Optimize images
- Use React.memo for expensive components

### Backend Performance (Future)
- API response time < 200ms
- Database queries < 100ms
- Implement caching
- Use pagination
- Index databases appropriately

## Security Guidelines

### Security Checklist
- ✅ No hardcoded secrets
- ✅ Validate all inputs
- ✅ Sanitize user data
- ✅ Use HTTPS only
- ✅ Implement rate limiting
- ✅ Handle errors securely
- ✅ Authenticate users properly
- ✅ Use secure headers

### Reporting Security Issues
🚨 **Do NOT** open public issues for security vulnerabilities

Email: security@primeprintify.com with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Development Phases

### Current Phase: Phase 1 (MVP) ✅
Focus areas:
- Bug fixes in core modules
- UI/UX improvements
- Performance optimization
- Documentation

### Next Phase: Phase 2 (Inventory)
If interested in Phase 2 features, discuss with maintainers.

## Development Tools

### Recommended VS Code Extensions
- ESLint
- Prettier
- TypeScript Vue Plugin
- Tailwind CSS IntelliSense
- Thunder Client / REST Client

### Browser DevTools
- React Developer Tools
- Redux DevTools (if used)
- Lighthouse
- Network tab for performance

## Questions & Support

### Getting Help
- Check existing documentation
- Search GitHub issues
- Ask in discussions (if available)
- Email: support@primeprintify.com

### Community
- Be part of our community
- Share your improvements
- Help other contributors
- Provide feedback

## License

By contributing to Prime Printify, you agree that your contributions will be licensed under the project's license.

## Recognition

Contributors will be recognized in:
- Project README (with permission)
- Release notes
- GitHub contributors page

---

**Thank you for contributing to Prime Printify!**

Your efforts help make printing press management easier for businesses everywhere.

For any questions, don't hesitate to reach out to the development team.
