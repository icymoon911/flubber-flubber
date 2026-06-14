const ENDPOINT_EPSILON = 1e-4;

/**
 * Parse common options for single-shape operations (interpolate, fromShape).
 * Returns { maxSegmentLength, string }.
 */
export function parseOptions(options = {}) {
  let { maxSegmentLength = 10, string = true } = options;
  return { maxSegmentLength, string };
}

/**
 * Parse common options for multi-shape operations (separate, combine, interpolateAll).
 * Returns { maxSegmentLength, string, single }.
 */
export function parseMultiOptions(options = {}) {
  let { maxSegmentLength = 10, string = true, single = false } = options;
  return { maxSegmentLength, string, single };
}

/**
 * Wrap an interpolator so that t near 0 returns fromOriginal and t near 1
 * returns toOriginal, preserving the exact original strings at the endpoints.
 * If neither endpoint value is provided, returns the interpolator as-is.
 */
export function withEndpointPreservation(interpolator, fromOriginal, toOriginal) {
  if (!fromOriginal && !toOriginal) {
    return interpolator;
  }
  return function (t) {
    if (t < ENDPOINT_EPSILON && fromOriginal) return fromOriginal;
    if (1 - t < ENDPOINT_EPSILON && toOriginal) return toOriginal;
    return interpolator(t);
  };
}

/**
 * Normalize endpoint values for the single=true path.
 * If single, joins the array into a string (only if all elements are strings).
 * If not single, passes the array through as-is.
 * Returns false if no endpoint preservation is possible.
 */
export function prepareEndpointValues(values, single) {
  if (!values) return false;
  if (single) {
    // Already a string (e.g. from separate where t0 is the source path string)
    if (typeof values === "string") return values;
    // Array of strings → join them
    return Array.isArray(values) && values.every(function (s) { return typeof s === "string"; })
      ? values.join(" ")
      : false;
  }
  return values;
}

/**
 * Wrap each interpolator in an array with endpoint preservation using
 * corresponding t0[i] / t1[i] values. Only wraps when at least one
 * endpoint value is a string.
 */
export function wrapInterpolators(interpolators, t0, t1) {
  t0 = Array.isArray(t0) ? t0 : [];
  t1 = Array.isArray(t1) ? t1 : [];

  return interpolators.map(function (fn, i) {
    var from = typeof t0[i] === "string" ? t0[i] : false;
    var to = typeof t1[i] === "string" ? t1[i] : false;
    return withEndpointPreservation(fn, from, to);
  });
}
