import { interpolateRing } from "./interpolate.js";
import { addPoints } from "./add.js";
import normalizeRing from "./normalize.js";
import triangulate from "./triangulate.js";
import pieceOrder from "./order.js";
import { INVALID_INPUT_ALL } from "./errors.js";
import { parseOptions } from "./options.js";
import { endpointOptimize } from "./endpoint.js";

export function separate(fromShape, toShapes, options) {
  var opts = parseOptions(options, true);
  var fromRing = normalizeRing(fromShape, opts.maxSegmentLength);

  if (fromRing.length < toShapes.length + 2) {
    addPoints(fromRing, toShapes.length + 2 - fromRing.length);
  }

  var fromRings = triangulate(fromRing, toShapes.length),
    toRings = toShapes.map(function(d) { return normalizeRing(d, opts.maxSegmentLength); }),
    t0 = typeof fromShape === "string" && fromShape,
    t1;

  if (!opts.single || toShapes.every(function(s) { return typeof s === "string"; })) {
    t1 = toShapes.slice(0);
  }

  return interpolateSets(fromRings, toRings, {
    match: true,
    string: opts.string,
    single: opts.single,
    t0: t0,
    t1: t1
  });
}

export function combine(fromShapes, toShape, options) {
  var opts = parseOptions(options, true);
  var interpolators = separate(toShape, fromShapes, opts);
  return opts.single
    ? function(t) { return interpolators(1 - t); }
    : interpolators.map(function(fn) { return function(t) { return fn(1 - t); }; });
}

export function interpolateAll(fromShapes, toShapes, options) {
  var opts = parseOptions(options, true);

  if (
    !Array.isArray(fromShapes) ||
    !Array.isArray(toShapes) ||
    fromShapes.length !== toShapes.length ||
    !fromShapes.length
  ) {
    throw new TypeError(INVALID_INPUT_ALL);
  }

  var normalize = function(s) { return normalizeRing(s, opts.maxSegmentLength); },
    fromRings = fromShapes.map(normalize),
    toRings = toShapes.map(normalize),
    t0,
    t1;

  if (opts.single) {
    if (fromShapes.every(function(s) { return typeof s === "string"; })) {
      t0 = fromShapes.slice(0);
    }
    if (toShapes.every(function(s) { return typeof s === "string"; })) {
      t1 = toShapes.slice(0);
    }
  } else {
    t0 = fromShapes.slice(0);
    t1 = toShapes.slice(0);
  }

  return interpolateSets(fromRings, toRings, {
    string: opts.string,
    single: opts.single,
    t0: t0,
    t1: t1,
    match: false
  });
}

// --- Decomposed interpolateSets ---

function interpolateSets(fromRings, toRings, opts) {
  var string = opts.string,
    single = opts.single,
    t0 = opts.t0,
    t1 = opts.t1,
    match = opts.match;

  // Determine ordering and build per-ring interpolators
  var order = match
      ? pieceOrder(fromRings, toRings)
      : fromRings.map(function(d, i) { return i; }),
    interpolators = order.map(function(d, i) {
      return interpolateRing(fromRings[d], toRings[i], string);
    });

  // Reorder t0 to match the new ordering when matching
  if (match && Array.isArray(t0)) {
    t0 = order.map(function(d) { return t0[d]; });
  }

  return single
    ? wrapSingle(interpolators, string, t0, t1)
    : wrapArray(interpolators, string, t0, t1);
}

// Single mode: combine all interpolators into one function, then apply endpoint optimization
function wrapSingle(interpolators, string, t0, t1) {
  if (string) {
    if (Array.isArray(t0)) {
      t0 = t0.join(" ");
    }
    if (Array.isArray(t1)) {
      t1 = t1.join(" ");
    }
  }

  var multiInterpolator = string
    ? function(t) { return interpolators.map(function(fn) { return fn(t); }).join(" "); }
    : function(t) { return interpolators.map(function(fn) { return fn(t); }); };

  // Endpoint optimization only applies in string mode (preserving original path strings)
  if (!string) {
    return multiInterpolator;
  }
  return endpointOptimize(multiInterpolator, t0 || null, t1 || null);
}

// Array mode: wrap each interpolator individually with endpoint optimization
function wrapArray(interpolators, string, t0, t1) {
  if (!string) {
    return interpolators;
  }

  t0 = Array.isArray(t0)
    ? t0.map(function(d) { return typeof d === "string" && d; })
    : [];
  t1 = Array.isArray(t1)
    ? t1.map(function(d) { return typeof d === "string" && d; })
    : [];

  return interpolators.map(function(fn, i) {
    return endpointOptimize(fn, t0[i] || null, t1[i] || null);
  });
}
