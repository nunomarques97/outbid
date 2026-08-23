import { describe, it, expect } from 'vitest'
import { extractEdgeFunctionErrorMessage } from './edgeFunctionError'

// Mirrors supabase-js's real FunctionsHttpError shape closely enough for
// this test: an Error subclass carrying the actual Response on `.context`.
class FakeFunctionsHttpError extends Error {
  context: Response
  constructor(context: Response, message = 'Edge Function returned a non-2xx status code') {
    super(message)
    this.context = context
  }
}

function makeHttpError(body: unknown, message?: string) {
  return new FakeFunctionsHttpError(new Response(JSON.stringify(body), { status: 409 }), message)
}

describe('extractEdgeFunctionErrorMessage', () => {
  it('returns the response body\'s error message when present', async () => {
    const error = makeHttpError({ error: 'You manage a company. Account deletion requires a manual request.' })
    expect(await extractEdgeFunctionErrorMessage(error)).toBe(
      'You manage a company. Account deletion requires a manual request.',
    )
  })

  it('falls back to the error\'s own message when the body has no error field', async () => {
    const error = makeHttpError({ ok: false })
    expect(await extractEdgeFunctionErrorMessage(error)).toBe('Edge Function returned a non-2xx status code')
  })

  it('falls back to the error\'s own message when the body is not JSON', async () => {
    const error = new FakeFunctionsHttpError(new Response('not json', { status: 500 }))
    expect(await extractEdgeFunctionErrorMessage(error)).toBe('Edge Function returned a non-2xx status code')
  })

  it('falls back to the given default when there is no context and the error has no message', async () => {
    expect(await extractEdgeFunctionErrorMessage('not an error object', 'Could not complete request')).toBe(
      'Could not complete request',
    )
  })

  it('uses a plain Error\'s message when there is no context at all', async () => {
    expect(await extractEdgeFunctionErrorMessage(new Error('network failure'))).toBe('network failure')
  })
})
