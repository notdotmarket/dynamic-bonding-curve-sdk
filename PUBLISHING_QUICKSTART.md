# Quick Publishing Commands

## First-time Setup

```bash
# 1. Login to npm
npm login

# 2. Verify you're logged in
npm whoami

# 3. Check organization membership
npm org ls notdotmarket
```

If the organization doesn't exist, create it at: https://www.npmjs.com/org/create

## Publishing a New Version

```bash
# Navigate to package directory
cd packages/dynamic-bonding-curve

# Update version (choose one)
npm version patch  # 1.5.1 → 1.5.2
npm version minor  # 1.5.1 → 1.6.0
npm version major  # 1.5.1 → 2.0.0

# Publish (builds automatically)
npm run publish:restricted

# Or manually:
npm run build
npm publish --access restricted
```

## Setting Up Access for Team Members

### Organization Admin:

```bash
# Invite user to organization (on npmjs.com)
# Or via CLI:
npm owner add <username> @notdotmarket/dynamic-bonding-curve-sdk
```

### For Installing in Projects:

Users must be logged in to npm:
```bash
npm login
npm install @notdotmarket/dynamic-bonding-curve-sdk
```

### For CI/CD (GitHub Actions):

1. Generate npm token: https://www.npmjs.com/settings/YOUR_USERNAME/tokens/new
2. Add to GitHub Secrets as `NPM_TOKEN`
3. Use in workflow:

```yaml
- name: Install dependencies
  run: npm install
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Verifying Package

```bash
# Check published package info
npm view @notdotmarket/dynamic-bonding-curve-sdk

# Check latest version
npm view @notdotmarket/dynamic-bonding-curve-sdk version

# See all versions
npm view @notdotmarket/dynamic-bonding-curve-sdk versions
```

## Troubleshooting

```bash
# Check who's logged in
npm whoami

# Check organization members
npm org ls notdotmarket

# Check package access
npm access ls-packages notdotmarket

# Verify you can publish
npm access ls-collaborators @notdotmarket/dynamic-bonding-curve-sdk
```
