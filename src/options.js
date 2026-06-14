// Shared option parsing for public API functions.
// Consolidates the repeated { maxSegmentLength, string, single } destructuring.

const DEFAULTS = {
  maxSegmentLength: 10,
  string: true,
  single: false
};

export function parseOptions(options, includeSingle) {
  let opts = options || {};
  let result = {
    maxSegmentLength:
      opts.maxSegmentLength !== undefined
        ? opts.maxSegmentLength
        : DEFAULTS.maxSegmentLength,
    string: opts.string !== undefined ? opts.string : DEFAULTS.string
  };
  if (includeSingle) {
    result.single =
      opts.single !== undefined ? opts.single : DEFAULTS.single;
  }
  return result;
}
