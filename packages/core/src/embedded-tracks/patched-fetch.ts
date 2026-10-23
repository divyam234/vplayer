/**
 * A `fetch` for Mediabunny's UrlSource that hands it the file with some bytes changed.
 *
 * Mediabunny leaves out every Matroska track that is marked disabled (FlagEnabled = 0), with no
 * option to keep it. Some releases mark their alternate-language audio that way (players list it
 * but do not start on it), so the audio menu would offer only one language. The bytes that say
 * "disabled" are changed to "enabled" as they stream past; nothing is written anywhere.
 */

/** Wraps `base` so that the byte at each of `offsets` that is 0 reads as 1. */
export function fetchWithEnabledFlags(
  offsets: readonly number[],
  base: typeof fetch = (...args) => fetch(...args),
): typeof fetch {
  const sorted = [...offsets].toSorted((a, b) => a - b)
  const last = sorted.at(-1)
  if (last === undefined) return base
  return async (input, init) => {
    const response = await base(input, init)
    if (!response.body || !(response.status === 200 || response.status === 206)) return response
    // Where the body starts in the file: a range answer says so, a whole file starts at 0.
    const range = /^bytes\s+(\d+)-/.exec(response.headers.get('Content-Range') ?? '')
    const start = response.status === 206 ? (range ? Number(range[1]) : undefined) : 0
    if (start === undefined || start > last) return response
    let position = start
    const body = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          const end = position + chunk.length
          let patched: Uint8Array | undefined
          for (const offset of sorted) {
            if (offset < position || offset >= end) continue
            const at = offset - position
            if (chunk[at] !== 0) continue
            patched ??= chunk.slice()
            patched[at] = 1
          }
          position = end
          controller.enqueue(patched ?? chunk)
        },
      }),
    )
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers })
  }
}
