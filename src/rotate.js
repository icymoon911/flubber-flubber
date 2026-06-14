import { distance } from "./math.js";

// For small rings, brute force is fast enough and guarantees exact results.
var BRUTE_FORCE_THRESHOLD = 64;

export default function(ring, vs) {
  var len = ring.length,
    bestOffset = len <= BRUTE_FORCE_THRESHOLD
      ? bruteForce(ring, vs, len)
      : sparseRefine(ring, vs, len);

  if (bestOffset) {
    var spliced = ring.splice(0, bestOffset);
    ring.splice(ring.length, 0, ...spliced);
  }
}

// O(n²) exhaustive search — used for small rings to guarantee identical results
function bruteForce(ring, vs, len) {
  var min = Infinity,
    bestOffset = 0;

  for (var offset = 0; offset < len; offset++) {
    var sumOfSquares = sumSq(ring, vs, offset, len);
    if (sumOfSquares < min) {
      min = sumOfSquares;
      bestOffset = offset;
    }
  }

  return bestOffset;
}

// O(n√n) sparse-then-refine heuristic for large rings.
// 1. Sample every √n offsets to find a coarse best.
// 2. Refine by exhaustive search in ±√n window around the coarse best.
function sparseRefine(ring, vs, len) {
  var step = Math.max(1, Math.ceil(Math.sqrt(len)));

  // Coarse pass
  var min = Infinity,
    bestCoarse = 0;

  for (var offset = 0; offset < len; offset += step) {
    var ss = sumSq(ring, vs, offset, len);
    if (ss < min) {
      min = ss;
      bestCoarse = offset;
    }
  }

  // Refine pass: search ±step around the coarse winner
  var bestOffset = bestCoarse,
    lo = bestCoarse - step + 1,
    hi = bestCoarse + step - 1;

  for (var offset = lo; offset <= hi; offset++) {
    // Wrap into [0, len)
    var wrapped = ((offset % len) + len) % len;
    var ss = sumSq(ring, vs, wrapped, len);
    if (ss < min) {
      min = ss;
      bestOffset = wrapped;
    }
  }

  return bestOffset;
}

function sumSq(ring, vs, offset, len) {
  var sumOfSquares = 0;
  for (var i = 0; i < vs.length; i++) {
    var d = distance(ring[(offset + i) % len], vs[i]);
    sumOfSquares += d * d;
  }
  return sumOfSquares;
}
