import type { NextApiRequest } from 'next';
import type { NextRequest } from 'next/server';
import type { GenericRequest } from '../types/NextContextTypes';

/**
 * Adapter to normalise Next.js Request / NextRequest / NextApiRequest into a shape
 * that x402-core's credential extractor can work with.
 */
export class NextRequestAdapter {
  async adapt(req: Request | NextRequest): Promise<GenericRequest> {
    const parsedUrl = this.safeUrl(req.url);
    const query = parsedUrl ? Object.fromEntries(parsedUrl.searchParams.entries()) : {};
    const body = await this.tryParseBody(req);

    return {
      method: req.method ?? 'GET',
      url: req.url,
      headers: req.headers,
      query,
      body,
      raw: req,
    };
  }

  adaptApiRequest(req: NextApiRequest): GenericRequest {
    const headers = new Headers();
    Object.entries(req.headers ?? {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        headers.set(key, value.join(','));
      } else if (typeof value === 'string') {
        headers.set(key, value);
      }
    });

    const url = req.url ? this.ensureAbsoluteUrl(req.url) : undefined;
    const query: Record<string, string> = {};
    Object.entries(req.query ?? {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query[key] = value[0] ?? '';
      } else if (value != null) {
        query[key] = String(value);
      }
    });

    return {
      method: req.method ?? 'GET',
      url,
      headers,
      query,
      body: (req as { body?: unknown }).body,
      raw: req,
    };
  }

  private async tryParseBody(req: Request): Promise<unknown> {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType) return undefined;

    // Only attempt to parse JSON or urlencoded bodies to avoid consuming streams unnecessarily.
    if (contentType.includes('application/json')) {
      try {
        return await req.clone().json();
      } catch {
        return undefined;
      }
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = new URLSearchParams(await req.clone().text());
        return Object.fromEntries(formData.entries());
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  private safeUrl(url?: string): URL | null {
    if (!url) return null;
    try {
      return new URL(url);
    } catch {
      return null;
    }
  }

  private ensureAbsoluteUrl(url: string): string {
    try {
      return new URL(url).toString();
    } catch {
      return new URL(url, 'http://localhost').toString();
    }
  }
}
