
# `@darkhorseone/x402-next`

## Phase 0 — Technical Design & Development Document

### Version: 1.0.0

### License: MIT (© DarkhorseOne Limited)

---

# 1. Project Overview

`@darkhorseone/x402-next` provides the **Next.js adapter** for the DarkhorseOne x402 Middleware ecosystem.
It allows developers to protect Next.js API routes—both **App Router** (recommended) and **Pages Router**—using the x402 payment protocol.

It exposes simple helpers such as:

* `x402Route(config, handler)`
* `withX402(config)(handler)` (for Pages Router)

The adapter integrates the stateless core implementation (`@darkhorseone/x402-core`) into Next.js' request/response lifecycle.

### The adapter handles:

1. Extracting payment credentials from `Request` / `NextRequest`
2. Generating x402 Payment Requirements when payment is missing
3. Calling the facilitator to verify payment before executing handlers
4. Returning proper HTTP 402 responses
5. Strict “deny on failure” fallback (Phase 0)

**Phase 0 is intentionally minimal and strictly stateless:**

❌ No database
❌ No Redis
❌ No background workers
❌ No credit fallback

---

# 2. Phase 0 Scope & Objectives

## 2.1 Included in Phase 0

* Next.js App Router support (`app/api/**/route.ts`)
* Next.js Pages Router support (`pages/api/*.ts`)
* Helper functions for wrapping route handlers
* Strict-mode x402 enforcement (`fallbackMode = "deny"`)
* Error translation to HTTP 402 and 503
* Minimal logging hooks
* JSDoc + TypeScript definitions

## 2.2 Excluded from Phase 0 (Future Phases)

* Usage metering
* Persistent logs
* Redis caching
* Server Actions billing helpers
* Edge runtime crypto verification bypass
* Credit-based fallback
* Middleware (advanced use case)

---

# 3. Package Architecture

```
@darkhorseone/x402-next
│
├── adapters/
│   ├── NextRequestAdapter.ts
│   └── NextResponseBuilder.ts
│
├── handlers/
│   ├── x402Route.ts          (App Router)
│   └── withX402.ts           (Pages Router)
│
├── errors/
│   └── X402NextErrorMapper.ts
│
├── types/
│   └── NextContextTypes.ts
│
└── index.ts
```

This package depends on:

* Next.js (`next/server` and/or `next`)
* `@darkhorseone/x402-core`

---

# 4. Technical Requirements

## 4.1 Next.js Version Support

Fully supports **Next.js 14+ and 15+**.

### App Router

* `export const GET = x402Route(config, handler);`
* `export const POST = ...`

### Pages Router

* `export default withX402(config)(handler);`

## 4.2 Node.js Requirement

* Node.js **20+**

## 4.3 Dependencies

| Type     | Packages                          |
| -------- | --------------------------------- |
| Required | `next`, `@darkhorseone/x402-core` |
| Optional | None                              |

---

# 5. Public API Overview

```
x402Route(config, handler)       // for App Router
withX402(config)(handler)        // for Pages Router
```

Both wrappers ensure:

* Payment credential extraction
* Payment verification
* Returning 402 / 503 correctly
* Passing control to the developer's handler upon success

---

# 6. Detailed Component Design

---

# 6.1 `x402Route(config, handler)` — App Router Wrapper

### Usage Example

```ts
import { x402Route } from "@darkhorseone/x402-next";

export const POST = x402Route(
  {
    price: "0.01",
    asset: "USDC",
    network: "base-mainnet",
    description: "AI text generation"
  },
  async (req: Request) => {
    return new Response(JSON.stringify({ text: "Hello" }), {
      headers: { "content-type": "application/json" }
    });
  }
);
```

### Responsibilities

1. Parse API-specific config (price, asset, etc.)
2. Transform `NextRequest` → generic request object
3. Extract payment credentials
4. Build payment requirement (if missing)
5. Verify payment via core
6. On failure:

   * return **402 with requirement**
   * or **503** on facilitator errors
7. On success:

   * call developer handler
   * optionally attach billing context to request

---

### Internal Flow (Pseudocode)

```ts
export const x402Route = (chargeConfig, handler) => {
  return async function nextHandler(req) {
    const adaptReq = NextRequestAdapter.from(req);

    const metadata = resolveChargeConfig(chargeConfig);
    const requirement = core.buildRequirement(metadata);

    const credential = extractor.extract(adaptReq);

    if (!credential) {
      return NextResponseBuilder.paymentRequired(requirement);
    }

    const result = await verifier.verify(credential, requirement);

    if (result.status !== "success") {
      return NextResponseBuilder.paymentRequired(requirement);
    }

    return handler(req);
  };
};
```

---

# 6.2 `withX402(config)(handler)` — Pages Router Wrapper

### Usage Example

```ts
import { withX402 } from "@darkhorseone/x402-next";

export default withX402(
  { price: "0.02" },
  async (req, res) => {
    res.status(200).json({ ok: true });
  }
);
```

This wrapper adapts the Node.js-style request/response into the same flow used by App Router.

---

# 6.3 Request Adapter

```ts
export class NextRequestAdapter {
  static from(req: Request | NextRequest): GenericRequest;
}
```

Must extract:

* headers
* method
* URL
* request body (if needed)
* search params

---

# 6.4 Response Builder: `NextResponseBuilder`

Handles:

* 402 Payment Required (JSON)
* 503 Service Unavailable
* JSON formatting
* Correct headers

### Example

```ts
static paymentRequired(requirement: PaymentRequirement): Response {
  return new Response(
    JSON.stringify({
      error: "payment_required",
      payment: requirement
    }),
    { status: 402, headers: { "content-type": "application/json" } }
  );
}
```

---

# 6.5 Error Mapping (`X402NextErrorMapper`)

### Error → HTTP Status Mapping

| Error                | HTTP Code |
| -------------------- | --------- |
| PaymentRequiredError | 402       |
| PaymentInvalidError  | 402       |
| PaymentExpiredError  | 402       |
| PaymentNetworkError  | 503       |
| Any other            | 500       |

---

# 7. Development Tasks (Codex-Ready)

## 7.1 Implement Request Adapter

* Map `NextRequest` → `GenericRequest`

## 7.2 Implement Response Builder

* paymentRequired()
* serviceUnavailable()
* json()

## 7.3 Implement App Router Wrapper

* x402Route()

## 7.4 Implement Pages Router Wrapper

* withX402()

## 7.5 Implement Error Mapping

## 7.6 Inject core components

* RequirementBuilder
* CredentialExtractor
* FacilitatorClient

## 7.7 Add TypeScript Types

* Charge config
* Handler types
* Extended request context (optional)

## 7.8 Testing

* Missing payment → requires 402
* Invalid payment → 402
* Facilitator down → 503
* Valid payment → handler executes
* Both router types behave identically

---

# 8. Example: Full App Router Route

```ts
import { x402Route } from "@darkhorseone/x402-next";

export const GET = x402Route(
  {
    price: "0.03",
    network: "base-mainnet",
    asset: "USDC",
    description: "Query database"
  },
  async (req) => {
    return Response.json({ data: [1, 2, 3] });
  }
);
```

---

# 9. Example: Full Pages Router Route

```ts
import { withX402 } from "@darkhorseone/x402-next";

export default withX402(
  {
    price: "0.05",
    asset: "USDC"
  },
  async (req, res) => {
    res.status(200).json({ message: "paid access granted" });
  }
);
```

---

# 10. File Structure

```
/src
  /adapters
  /handlers
  /errors
  /types
  index.ts
/tests
README.md
package.json
tsconfig.json
```

---

# 11. License

MIT License
© DarkhorseOne Limited

---

# 12. Phase 0 Status

* ✔ Design complete
* ✔ Architecture stable
* ✔ Approval-ready
* ✔ Implementation can begin immediately

---

## ✔ Next Steps

If you want, I can now generate:

### 1. A **top-level monorepo folder structure** for `x402-core`, `x402-nest`, `x402-next`

### 2. A **root README** for the entire x402 middleware project

### 3. A **Codex-ready task breakdown** (Kanban-style) for Phase 0

### 4. A **full TypeScript interface and file skeleton** for all 3 packages

Just tell me:

**“Generate monorepo structure”**
or
**“Generate implementation skeletons”**
or
**“Generate Codex task board”**
