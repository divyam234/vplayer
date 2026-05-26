/**
 * NativeVideoEngine — MediaEngine backed by an HTMLVideoElement.
 *
 * The default engine used by createPlayer() when no custom engine is provided.
 * Delegates all playback to the native <video> element.
 */

import { BaseMediaEngine } from './base-engine'

export class NativeVideoEngine extends BaseMediaEngine {}
