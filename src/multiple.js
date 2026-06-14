import { interpolateRing } from "./interpolate.js";
import { addPoints } from "./add.js";
import normalizeRing from "./normalize.js";
import triangulate from "./triangulate.js";
import pieceOrder from "./order.js";
import { INVALID_INPUT_ALL } from "./errors.js";
import { resolveEasing } from "./easing.js";

export function separate(
  fromShape,
  toShapes,
  { maxSegmentLength = 10, string = true, single = false, easing } = {}
) {
  let fromRing = normalizeRing(fromShape, maxSegmentLength);

  if (fromRing.length < toShapes.length + 2) {
    addPoints(fromRing, toShapes.length + 2 - fromRing.length);
  }

  let fromRings = triangulate(fromRing, toShapes.length),
    toRings = toShapes.map(d => normalizeRing(d, maxSegmentLength)),
    t0 = typeof fromShape === "string" && fromShape,
    t1;

  if (!single || toShapes.every(s => typeof s === "string")) {
    t1 = toShapes.slice(0);
  }

  return interpolateSets(fromRings, toRings, {
    match: true,
    string,
    single,
    t0,
    t1,
    easing
  });
}

export function combine(
  fromShapes,
  toShape,
  { maxSegmentLength = 10, string = true, single = false, easing } = {}
) {
  var easingFn = resolveEasing(easing);

  let interpolators = separate(toShape, fromShapes, {
    maxSegmentLength,
    string,
    single
    // intentionally no easing — we apply it on the outer level
  });

  if (single) {
    if (!easingFn) {
      return function(t) { return interpolators(1 - t); };
    }
    return function(t) { return interpolators(1 - easingFn(t)); };
  }

  if (!easingFn) {
    return interpolators.map(function(fn) { return function(t) { return fn(1 - t); }; });
  }
  return interpolators.map(function(fn) { return function(t) { return fn(1 - easingFn(t)); }; });
}

export function interpolateAll(
  fromShapes,
  toShapes,
  { maxSegmentLength = 10, string = true, single = false, easing } = {}
) {
  if (
    !Array.isArray(fromShapes) ||
    !Array.isArray(toShapes) ||
    fromShapes.length !== toShapes.length ||
    !fromShapes.length
  ) {
    throw new TypeError(INVALID_INPUT_ALL);
  }

  let normalize = s => normalizeRing(s, maxSegmentLength),
    fromRings = fromShapes.map(normalize),
    toRings = toShapes.map(normalize),
    t0,
    t1;

  if (single) {
    if (fromShapes.every(s => typeof s === "string")) {
      t0 = fromShapes.slice(0);
    }
    if (toShapes.every(s => typeof s === "string")) {
      t1 = toShapes.slice(0);
    }
  } else {
    t0 = fromShapes.slice(0);
    t1 = toShapes.slice(0);
  }

  return interpolateSets(fromRings, toRings, {
    string,
    single,
    t0,
    t1,
    match: false,
    easing
  });
}

function interpolateSets(
  fromRings,
  toRings,
  { string, single, t0, t1, match, easing } = {}
) {
  var easingFn = resolveEasing(easing);

  let order = match
      ? pieceOrder(fromRings, toRings)
      : fromRings.map((d, i) => i),
    interpolators = order.map((d, i) =>
      interpolateRing(fromRings[d], toRings[i], string)
    );

  if (match && Array.isArray(t0)) {
    t0 = order.map(d => t0[d]);
  }

  if (single && string) {
    if (Array.isArray(t0)) {
      t0 = t0.join(" ");
    }
    if (Array.isArray(t1)) {
      t1 = t1.join(" ");
    }
  }

  if (single) {
    let multiInterpolator = string
      ? t => interpolators.map(fn => fn(t)).join(" ")
      : t => interpolators.map(fn => fn(t));

    var result;
    if (string && (t0 || t1)) {
      result = t =>
        (easingFn ? easingFn(t) : t) < 1e-4 && t0
          ? t0
          : (1 - (easingFn ? easingFn(t) : t) < 1e-4 && t1)
            ? t1
            : multiInterpolator(easingFn ? easingFn(t) : t);
    } else {
      result = multiInterpolator;
      if (easingFn) {
        var base = result;
        result = t => base(easingFn(t));
      }
    }
    return result;
  } else if (string) {
    t0 = Array.isArray(t0) ? t0.map(d => typeof d === "string" && d) : [];
    t1 = Array.isArray(t1) ? t1.map(d => typeof d === "string" && d) : [];

    return interpolators.map((fn, i) => {
      if (t0[i] || t1[i]) {
        var inner = fn;
        var wrapped = t => {
          var et = easingFn ? easingFn(t) : t;
          return (et < 1e-4 && t0[i]) || (1 - et < 1e-4 && t1[i]) || inner(et);
        };
        return wrapped;
      }
      if (easingFn) {
        return t => fn(easingFn(t));
      }
      return fn;
    });
  }

  if (easingFn) {
    return interpolators.map(fn => t => fn(easingFn(t)));
  }

  return interpolators;
}
