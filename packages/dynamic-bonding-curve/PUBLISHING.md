# Publishing Guide

This guide explains how to publish the `@notdotmarket/dynamic-bonding-curve-sdk` package to npm with restricted access.

## Prerequisites

1. **npm Account**: You need an npm account that is part of the `notdotmarket` organization
2. **Organization Setup**: The `notdotmarket` organization must exist on npm
3. **Login**: You must be logged in to npm

## Setup Steps

### 1. Login to npm

```bash
npm login
```

Enter your npm credentials when prompted.

### 2. Verify Organization Membership

```bash
npm org ls notdotmarket
```

This should show you as a member of the organization.

### 3. Configure Organization Access (One-time setup)

If the organization doesn't exist yet, create it on npm:
- Go to https://www.npmjs.com/org/create
- Create the `notdotmarket` organization
- Add team members who should have access

## Publishing the Package

### Option 1: Using the npm script (Recommended)

```bash
cd packages/dynamic-bonding-curve
npm run publish:restricted
```

This will:
1. Build the package automatically (`prepublishOnly` hook)
2. Publish with restricted access

### Option 2: Manual publishing

```bash
cd packages/dynamic-bonding-curve
npm run build
npm publish --access restricted
```

## Access Control

With `publishConfig.access: "restricted"`, the package is published as **private to your organization**.

### What this means:

✅ **Can access:**
- Members of the `notdotmarket` npm organization
- Projects authenticated with an npm token from an organization member
- CI/CD pipelines with proper npm authentication

❌ **Cannot access:**
- Public users
- Unauthenticated npm clients
- Projects outside the organization

## Installing the Package

### For Organization Members

If you're a member of the `notdotmarket` organization:

```bash
npm install @notdotmarket/dynamic-bonding-curve-sdk
```

### For CI/CD (GitHub Actions, etc.)

1. Generate an npm access token:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Automation"
   - Save the token securely

2. Add the token to your repository secrets:
   - GitHub: Settings → Secrets → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: Your npm token

3. Configure npm in your CI workflow:

```yaml
- name: Setup Node
  uses: actions/setup-node@v3
  with:
    node-version: '18'
    registry-url: 'https://registry.npmjs.org'

- name: Install dependencies
  run: npm install
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### For Local Development

Create a `.npmrc` file in your project root:

```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

Then set the environment variable:

```bash
export NPM_TOKEN=your-npm-token
```

## Version Management

Before publishing, update the version in `package.json`:

```bash
# Patch release (1.5.1 → 1.5.2)
npm version patch

# Minor release (1.5.1 → 1.6.0)
npm version minor

# Major release (1.5.1 → 2.0.0)
npm version major
```

## Troubleshooting

### Error: "You do not have permission to publish"

- Ensure you're logged in: `npm whoami`
- Verify organization membership: `npm org ls notdotmarket`
- Check that your account has publish permissions

### Error: "Package name too similar to existing package"

- The package name `@notdotmarket/dynamic-bonding-curve-sdk` must be unique
- Organization scopes help avoid conflicts

### Users can't install the package

- Verify they're members of the `notdotmarket` organization
- Check they're logged in: `npm whoami`
- Ensure `.npmrc` is properly configured with authentication

## Alternative: Team-based Access

For more granular control, create teams within your organization:

```bash
# Create a team
npm team create notdotmarket:developers

# Add members
npm team add notdotmarket:developers username

# Grant team access to package
npm access grant read-write notdotmarket:developers
```

## Security Best Practices

1. **Use automation tokens** for CI/CD (not your personal token)
2. **Rotate tokens** regularly
3. **Use read-only tokens** where write access isn't needed
4. **Never commit tokens** to version control
5. **Use organization-level 2FA** for added security

## Publishing Checklist

- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Version updated in package.json
- [ ] CHANGELOG.md updated
- [ ] README.md is current
- [ ] Logged into npm (`npm whoami`)
- [ ] Organization membership verified
- [ ] Ready to publish (`npm run publish:restricted`)

## Support

For issues with npm publishing or access:
- npm support: https://www.npmjs.com/support
- Organization settings: https://www.npmjs.com/settings/notdotmarket/packages
