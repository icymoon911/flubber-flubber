import { distance } from "./math.js";

// Threshold below which brute force is used (guarantees identical results for small rings)
var BRUTE_FORCE_THRESHOLD = 64;

export default function (ring, vs) {
  var len = ring.length;

  if (len < 2) return;

  var bestOffset;

  if (len <= BRUTE_FORCE_THRESHOLD) {
    bestOffset = findBestOffsetBruteForce(ring, vs, len);
  } else {
    bestOffset = findBestOffsetHeuristic(ring, vs, len);
  }

  if (bestOffset) {
    var spliced = ring.splice(0, bestOffset);
    ring.splice(ring.length, 0, ...spliced);
  }
}

/**
 * Brute-force O(n*m) search over every possible rotation offset.
 * Used for small rings to guarantee exact results.
 */
function findBestOffsetBruteForce(ring, vs, len) {
  var min = Infinity,
    bestOffset = 0;

  for (var offset = 0; offset < len; offset++) {
    var sumOfSquares = computeSumOfSquares(ring, vs, offset, len);
    if (sumOfSquares < min) {
      min = sumOfSquares;
      bestOffset = offset;
    }
  }

  return bestOffset;
}

/**
 * Heuristic O(sqrt(n)*m) search: coarse sparse sampling followed by local
 * refinement around the top candidates. Much faster for large rings while
 * producing results very close to brute force in practice.
 */
function findBestOffsetHeuristic(ring, vs, len) {
  var step = Math.max(1, Math.floor(Math.sqrt(len)));
  var candidates = [];
  var min = Infinity;

  // Phase 1: Sparse sampling at intervals of ~sqrt(n)
  for (var offset = 0; offset < len; offset += step) {
    var ss = computeSumOfSquares(ring, vs, offset, len);
    candidates.push({ offset: offset, ss: ss });
    if (ss < min) {
      min = ss;
    }
  }

  // Phase 2: Refine around the top candidates (those within 10% of the best)
  var threshold = min * 1.1;
  var bestOffset = 0;
  var bestSS = Infinity;

  for (var c = 0; c < candidates.length; c++) {
    if (candidates[c].ss > threshold) continue;

    var center = candidates[c].offset;
    var start = Math.max(0, center - step);
    var end = Math.min(len - 1, center + step);

    for (var off = start; off <= end; off++) {
      var ss2 = computeSumOfSquares(ring, vs, off, len);
      if (ss2 < bestSS) {
        bestSS = ss2;
        bestOffset = off;
      }
    }
  }

  return bestOffset;
}

/**
 * Compute the sum of squared distances between ring[(offset+i) % len] and vs[i]
 * for all i in [0, vs.length).
 */
function computeSumOfSquares(ring, vs, offset, len) {
  var sumOfSquares = 0;
  for (var i = 0; i < vs.length; i++) {
    var d = distance(ring[(offset + i) % len], vs[i]);
    sumOfSquares += d * d;
  }
  return sumOfSquares;
}
