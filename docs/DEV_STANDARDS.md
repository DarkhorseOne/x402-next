# 1. Language & Runtime

### **Language**

* TypeScript only

### **Next.js Versions**

* Fully supports **Next.js 14+ and 15+**
* Must support:

  * App Router (`app/api/**/route.ts`)
  * Pages Router (`pages/api/*.ts`)

### **Runtime**

* Node.js 20+
* Must work in:

  * Node.js runtime
  * (Optional) Edge runtime (Phase 1+, not required in Phase 0)

---

# 2. Coding Style

### **General Style**

* Functional design, avoid class-based wrappers
* Prefer small, composable utility functions
* Keep adapters thin
* Keep no state in wrappers

### **Naming Conventions**

* Functions: `camelCase`
* Helpers: `PascalCase` only if acting as a factory
* Filenames: lowercase dashed (e.g., `x402-route.ts`)

### **Wrapper Functions**

* Must always return a valid Next.js handler
* Must always return a Response object in App Router

---

# 3. Documentation Standards

### **DocBlocks**

Each exported function must describe:

* Parameters
* Expected behavior
* Error behavior (especially 402/503)
* Example usage

Example:

```ts
/**
 * Wraps a Next.js App Router handler with x402 payment enforcement.
 * Returns a 402 Payment Required response when needed.
 */
```

### **README Requirements**

* Usage examples for both routers
* Explanation of strict fallback mode
* Example error responses

---

# 4. Testing Standards

### **Framework**

* Vitest preferred (lightweight)
* Can use Next.js Request mocks

### **Required Tests**

* Wrapper returns 402 when missing payment
* Wrapper returns 402 when payment invalid
* Wrapper returns 503 when facilitator fails
* Wrapper correctly passes execution to handler on success
* Both App Router and Pages Router tested

### **Mocking Requirements**

* Mock facilitator client
* Mock NextRequest/Response for App Router
* Use supertest-like wrapper for Pages Router

---

# 5. Package Boundaries

### **Forbidden**

* Do NOT import NestJS packages
* Do NOT depend on Next.js internals (only `next/server` APIs allowed)
* No persistence logic
* No usage tracking

### **Allowed**

* Import:

  * `NextRequest`
  * `NextResponse`
  * Node.js standard libs
  * x402-core utilities

---

# 6. Error Handling Rules

* PaymentRequiredError → Return 402 JSON
* PaymentNetworkError → Return 503 JSON
* Any other unexpected error → Return 500

### Response Format (strict)

```json
{
  "error": "payment_required",
  "payment": { ... },
  "message": "Payment required to access this resource."
}
```

---

# 7. AI Coding Agent Notes

### **When implementing wrappers:**

* Always extract credentials using core extraction logic
* Always generate requirements using core builder
* Never manually construct PaymentRequirement
* Do not rethrow errors → convert to HTTP Responses

### **When generating code:**

* Provide full Next.js examples
* Ensure wrapper preserves original handler behavior
* Ensure `Response` is always returned
* Keep code minimal and deterministic
