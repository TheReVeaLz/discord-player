// based on https://github.com/amishshah/prism-media/blob/4ef1d6f9f53042c085c1f68627e889003e248d77/src/opus/OggDemuxer.js

import { Transform, TransformCallback } from 'node:stream';

const OGG_PAGE_HEADER_SIZE = 26;
const STREAM_STRUCTURE_VERSION = 0;

const charCode = (x: string) => x.charCodeAt(0);
const OGGS_HEADER = Buffer.from([...'OggS'].map(charCode));
const OPUS_HEAD = Buffer.from([...'OpusHead'].map(charCode));
const OPUS_TAGS = Buffer.from([...'OpusTags'].map(charCode));

/**
 * Demuxes an Ogg stream (containing Opus audio) to output an Opus stream.
 */
export class OggDemuxer extends Transform {
  private _remainder: Buffer | null = null;
  private _head: Buffer | null = null;
  private _bitstream: number | null = null;

  /**
   * Creates a new OggOpus demuxer.
   * @param {Object} [options] options that you would pass to a regular Transform stream.
   * @memberof opus
   */
  public constructor(options = {}) {
    super(Object.assign({ readableObjectMode: true }, options));
    this._remainder = null;
    this._head = null;
    this._bitstream = null;
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, done: TransformCallback) {
    if (this._remainder) {
      chunk = Buffer.concat([this._remainder, chunk]);
      this._remainder = null;
    }

    try {
      while (chunk) {
        const result = this._readPage(chunk);
        if (result) chunk = result;
        else break;
      }
    } catch (error) {
      done(error as Error);
      return;
    }

    this._remainder = chunk;
    done();
  }

  /**
   * Reads a page from a buffer
   * @private
   * @param {Buffer} chunk the chunk containing the page
   * @returns {boolean|Buffer} if a buffer, it will be a slice of the excess data of the original, otherwise it will be
   * false and would indicate that there is not enough data to go ahead with reading this page.
   */
  _readPage(chunk: Buffer) {
    if (chunk.length < OGG_PAGE_HEADER_SIZE) {
      return false;
    }
    if (!chunk.subarray(0, 4).equals(OGGS_HEADER)) {
      throw Error(`capture_pattern is not ${OGGS_HEADER}`);
    }
    if (chunk.readUInt8(4) !== STREAM_STRUCTURE_VERSION) {
      throw Error(
        `stream_structure_version is not ${STREAM_STRUCTURE_VERSION}`,
      );
    }

    if (chunk.length < 27) return false;
    const pageSegments = chunk.readUInt8(26);
    if (chunk.length < 27 + pageSegments) return false;
    const table = chunk.subarray(27, 27 + pageSegments);
    const bitstream = chunk.readUInt32BE(14);

    const sizes: number[] = [];
    let totalSize = 0;

    for (let i = 0; i < pageSegments; ) {
      let size = 0,
        x = 255;
      while (x === 255) {
        if (i >= table.length) return false;
        x = table.readUInt8(i);
        i++;
        size += x;
      }
      sizes.push(size);
      totalSize += size;
    }

    if (chunk.length < 27 + pageSegments + totalSize) return false;

    let start = 27 + pageSegments;
    for (const size of sizes) {
      const segment = chunk.subarray(start, start + size);
      const header = segment.subarray(0, 8);
      if (this._head) {
        if (header.equals(OPUS_TAGS)) this.emit('tags', segment);
        else if (this._bitstream === bitstream) this.push(segment);
      } else if (header.equals(OPUS_HEAD)) {
        this.emit('head', segment);
        this._head = segment;
        this._bitstream = bitstream;
      } else {
        this.emit('unknownSegment', segment);
      }
      start += size;
    }
    return chunk.subarray(start);
  }

  _destroy(err: Error, cb: (error: Error | null) => void) {
    this._cleanup();
    return cb ? cb(err) : undefined;
  }

  _final(cb: TransformCallback) {
    this._cleanup();
    cb();
  }

  /**
   * Cleans up the demuxer when it is no longer required.
   * @private
   */
  _cleanup() {
    this._remainder = null;
    this._head = null;
    this._bitstream = null;
  }
}
