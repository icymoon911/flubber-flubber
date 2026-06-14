import { interpolateRing } from "./interpolate.js";
import { addPoints } from "./add.js";
import normalizeRing from "./normalize.js";
import triangulate from "./triangulate.js";
import pieceOrder from "./order.js";
import { INVALID_INPUT_ALL } from "./errors.js";
import {
  parseMultiOptions,
  withEndpointPreservation,
  prepareEndpointValues,
  wrapInterpolators
} from "./utils.js";

export function separate(fromShape, toShapes, options) {
  var opts = parseMultiOptions(options),
    fromRing = normalizeRing(fromShape, opts.maxSegmentLength);

  if (fromRing.length < toShapes.length + 2) {
    addPoints(fromRing, toShapes.length + 2 - fromRing.length);
  }

  var fromRings = triangulate(fromRing, toShapes.length),
    toRings = toShapes.map(function (d) { return normalizeRing(d, opts.maxSegmentLength); }),
    t0 = typeof fromShape === "string" ? fromShape : false,
    t1;

  if (!opts.single || toShapes.every(function (s) { return typeof s === "string"; })) {
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
  var opts = parseMultiOptions(options),
    interpolators = separate(toShape, fromShapes, {
      maxSegmentLength: opts.maxSegmentLength,
      string: opts.string,
      single: opts.single
    });

  return opts.single
    ? function (t) { return interpolators(1 - t); }
    : interpolators.map(function (fn) { return function (t) { return fn(1 - t); }; });
}

export function interpolateAll(fromShapes, toShapes, options) {
  if (
    !Array.isArray(fromShapes) ||
    !Array.isArray(toShapes) ||
    fromShapes.length !== toShapes.length ||
    !fromShapes.length
  ) {
    throw new TypeError(INVALID_INPUT_ALL);
  }

  var opts = parseMultiOptions(options),
    normalize = function (s) { return normalizeRing(s, opts.maxSegmentLength); },
    fromRings = fromShapes.map(normalize),
    toRings = toShapes.map(normalize),
    t0,
    t1;

  if (opts.single) {
    if (fromShapes.every(function (s) { return typeof s === "string"; })) {
      t0 = fromShapes.slice(0);
    }
    if (toShapes.every(function (s) { return typeof s === "string"; })) {
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

// --- Internal helpers for interpolateSets ---

/**
 * Create per-pair interpolators, optionally reordering the fromRings to
 * best match the toRings.
 */
function createInterpolators(fromRings, toRings, match, string) {
  var order = match
    ? pieceOrder(fromRings, toRings)
    : fromRings.map(function (d, i) { return i; });

  return {
    order: order,
    interpolators: order.map(function (d, i) {
      return interpolateRing(fromRings[d], toRings[i], string);
    })
  };
}

/**
 * Build the final return value for single=true mode: a single function
 * that returns all interpolated paths (as a joined string or an array).
 */
function buildSingleInterpolator(interpolators, string, t0, t1) {
  var multiInterpolator = string
    ? function (t) { return interpolators.map(function (fn) { return fn(t); }).join(" "); }
    : function (t) { return interpolators.map(function (fn) { return fn(t); }); };

  return withEndpointPreservation(multiInterpolator, t0, t1);
}

/**
 * Orchestrates the creation of interpolators from sets of rings, handling
 * ordering, endpoint preservation, and single vs. array return modes.
 */
function interpolateSets(fromRings, toRings, config) {
  var match = config.match,
    string = config.string,
    single = config.single,
    t0 = config.t0,
    t1 = config.t1;

  var result = createInterpolators(fromRings, toRings, match, string),
    interpolators = result.interpolators,
    order = result.order;

  // Reorder t0 according to the matching order when t0 is an array
  if (match && Array.isArray(t0)) {
    t0 = order.map(function (d) { return t0[d]; });
  }

  if (single) {
    var singleT0 = prepareEndpointValues(t0, true);
    var singleT1 = prepareEndpointValues(t1, true);

    if (string) {
      return buildSingleInterpolator(interpolators, true, singleT0, singleT1);
    }
    return buildSingleInterpolator(interpolators, false, false, false);
  }

  if (string) {
    return wrapInterpolators(interpolators, t0, t1);
  }

  return interpolators;
}
