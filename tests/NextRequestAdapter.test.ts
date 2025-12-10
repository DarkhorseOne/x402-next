import { describe, expect, it } from 'vitest';
import { NextRequestAdapter } from '../src/adapters/NextRequestAdapter';

describe('NextRequestAdapter', () => {
  it('adapts App Router Request with query and JSON body', async () => {
    const adapter = new NextRequestAdapter();
    const request = new Request('https://example.com/api?foo=bar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test': 'abc' },
      body: JSON.stringify({ payment: 'token123', extra: true }),
    });

    const adapted = await adapter.adapt(request);

    expect(adapted.method).toBe('POST');
    expect(adapted.query).toEqual({ foo: 'bar' });
    expect((adapted.headers as Headers).get('x-test')).toBe('abc');
    expect(adapted.body).toEqual({ payment: 'token123', extra: true });
    expect(adapted.raw).toBe(request);
  });

  it('adapts Pages Router request shape', () => {
    const adapter = new NextRequestAdapter();
    const req = {
      method: 'GET',
      url: '/api/test?foo=baz',
      headers: { 'x-custom': 'ok' },
      query: { foo: 'baz', multi: ['one', 'two'] },
      body: { payment: 'abc' },
    } as any;

    const adapted = adapter.adaptApiRequest(req);

    expect(adapted.method).toBe('GET');
    expect(adapted.query).toEqual({ foo: 'baz', multi: 'one' });
    expect((adapted.headers as Headers).get('x-custom')).toBe('ok');
    expect(adapted.body).toEqual({ payment: 'abc' });
    expect(adapted.raw).toBe(req);
  });
});
