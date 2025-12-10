# x402-next

https://github.com/DarkhorseOne/x402-next

## Compatibility and security

This adapter now requires patched Next.js releases that address CVE-2025-66478 in the React Server Components protocol. Use `next@>=15.0.5 <16` or `next@>=16.0.7 <17` (or the canaries `15.6.0-canary.58` / `16.1.0-canary.12`). There is no workaround—upgrade before integrating.

## Local development with x402-core

If `@darkhorseone/x402-core` is not published, link the local sibling before installing dev deps:

```bash
npm link ../x402-core
npm install
```

When core is published and you want to switch back:

```bash
npm unlink ../x402-core
npm install @darkhorseone/x402-core --save
npm install
```
