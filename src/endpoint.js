// Shared endpoint optimization: at t≈0 return startValue, at t≈1 return endValue,
// otherwise delegate to the interpolator.  Used by interpolate.js, shape.js, multiple.js.

const EPSILON = 1e-4;

export function endpointOptimize(interpolator, startValue, endValue) {
  if (!startValue && !endValue) {
    return interpolator;
  }
  return function(t) {
    if (t < EPSILON && startValue) {
      return startValue;
    }
    if (1 - t < EPSILON && endValue) {
      return endValue;
    }
    return interpolator(t);
  };
}
