// Verification script for all 5 fixes
// Run with: babel-tape-runner test/verify-fixes.js

import { supertape } from "./utils.js";
import { addPoints } from "../src/add.js";
import { toRect, fromRect } from "../src/shape.js";
import { separate } from "../src/multiple.js";
import { createTopology, collapseTopology } from "../src/topology.js";
import { pathStringToRing } from "../src/svg.js";
import { cut } from "../src/triangulate.js";

let tape = supertape();

// =============================================================
// Fix 1: toRect corners should be exact (not rounded)
// =============================================================
tape("Fix 1: toRect produces exact corner coordinates", function(test) {
  // Create a from-shape with many points (circle-like)
  let fromShape = [];
  for (let i = 0; i < 32; i++) {
    let angle = (2 * Math.PI * i) / 32;
    fromShape.push([Math.cos(angle) * 50 + 50, Math.sin(angle) * 50 + 50]);
  }

  let interpolator = toRect(fromShape, 0, 0, 100, 100, { string: false });
  let result = interpolator(1); // at t=1, should be the rectangle

  // Check that the four exact corner coordinates appear in the result
  let corners = [[100, 100], [0, 100], [0, 0], [100, 0]];
  let foundCorners = 0;

  for (let c = 0; c < corners.length; c++) {
    let corner = corners[c];
    for (let i = 0; i < result.length; i++) {
      if (
        Math.abs(result[i][0] - corner[0]) < 1e-9 &&
        Math.abs(result[i][1] - corner[1]) < 1e-9
      ) {
        foundCorners++;
        break;
      }
    }
  }

  test.equal(foundCorners, 4, "All 4 exact corners should be present in the result");

  // Also verify that all result points lie on the rectangle boundary
  let allOnBoundary = true;
  for (let i = 0; i < result.length; i++) {
    let px = result[i][0], py = result[i][1];
    let onLeft = Math.abs(px) < 1e-9;
    let onRight = Math.abs(px - 100) < 1e-9;
    let onTop = Math.abs(py - 100) < 1e-9;
    let onBottom = Math.abs(py) < 1e-9;
    if (!(onLeft || onRight || onTop || onBottom)) {
      allOnBoundary = false;
      break;
    }
  }
  test.ok(allOnBoundary, "All result points should lie on the rectangle boundary");

  test.end();
});

// =============================================================
// Fix 2: addPoints handles zero-length ring without NaN
// =============================================================
tape("Fix 2: addPoints with zero-length ring produces no NaN", function(test) {
  // All points coincide => polygonLength returns 0
  let ring = [[5, 5], [5, 5], [5, 5]];
  addPoints(ring, 5);

  test.equal(ring.length, 8, "Should have 3 + 5 = 8 points");

  let hasNaN = false;
  for (let i = 0; i < ring.length; i++) {
    if (isNaN(ring[i][0]) || isNaN(ring[i][1])) {
      hasNaN = true;
      break;
    }
  }
  test.ok(!hasNaN, "No NaN values should appear in the result");

  // All points should still be at [5, 5] since the ring has zero length
  for (let i = 0; i < ring.length; i++) {
    test.inDelta(ring[i], [5, 5]);
  }

  // Also test with a single point
  let single = [[10, 20]];
  addPoints(single, 3);
  test.equal(single.length, 4);
  hasNaN = false;
  for (let i = 0; i < single.length; i++) {
    if (isNaN(single[i][0]) || isNaN(single[i][1])) {
      hasNaN = true;
    }
  }
  test.ok(!hasNaN, "Single-point ring should also have no NaN");

  test.end();
});

// =============================================================
// Fix 3: collapseTopology graceful degradation
// =============================================================
tape("Fix 3: collapseTopology does not throw when triangles < numPieces", function(test) {
  let square = [[0, 0], [100, 0], [100, 100], [0, 100]];
  let cuts = cut(square);
  let topology = createTopology(cuts, square);

  // Collapse to 1 piece
  let collapsed1 = collapseTopology(topology, 1);
  test.equal(collapsed1.length, 1, "Should have 1 piece after collapse");

  // Now try to collapse to more pieces than available (only 1 left)
  // This used to throw RangeError, now it should gracefully return what's available
  let collapsed2;
  test.doesNotThrow(function() {
    collapsed2 = collapseTopology(topology, 5);
  }, "Should not throw when requesting more pieces than available");

  test.equal(collapsed2.length, 1, "Should return the 1 available piece");

  test.end();
});

// =============================================================
// Fix 4: exactRing preserves line segments before curves
// =============================================================
tape("Fix 4: exactRing keeps line segments when mixed with curves", function(test) {
  // Path with M + L commands followed by a C (curve) command
  let mixedPath = "M0,0 L100,0 L100,50 L50,50 C100,100 50,100 0,100 Z";
  let result = pathStringToRing(mixedPath, 10);

  // The exact ring should include the line segments before the curve: [0,0], [100,0], [100,50], [50,50]
  test.ok(result.ring.length >= 4, "Should keep at least the 4 line-segment points");

  test.inDelta(result.ring[0], [0, 0]);
  test.inDelta(result.ring[1], [100, 0]);
  test.inDelta(result.ring[2], [100, 50]);
  test.inDelta(result.ring[3], [50, 50]);

  // Path that starts with M then immediately has a curve (only 1 line point)
  // Should fall back to approximation since 1 point is not a valid polygon
  let curveOnly = "M636.5,315 C584.5,315 536.5,255 536.5,185 C536.5,107 608.5,50 636.5,50 Z";
  let result2 = pathStringToRing(curveOnly, 50);
  test.ok(result2.ring.length >= 3, "Curve-only path should fall back to approximation with >= 3 points");

  test.end();
});

// =============================================================
// Fix 5: separate validates toShapes input
// =============================================================
tape("Fix 5: separate throws clear errors for invalid toShapes", function(test) {
  let fromShape = [[0, 0], [100, 0], [100, 100], [0, 100]];

  // Empty array in toShapes
  test.throws(
    function() { separate(fromShape, [[]]); },
    /index 0.*empty array/,
    "Should throw for empty array at index 0"
  );

  // Empty string in toShapes
  test.throws(
    function() { separate(fromShape, [""]); },
    /index 0.*empty string/,
    "Should throw for empty string at index 0"
  );

  // Invalid type in toShapes
  test.throws(
    function() { separate(fromShape, [null]); },
    /index 0/,
    "Should throw for null at index 0"
  );

  test.throws(
    function() { separate(fromShape, [42]); },
    /index 0/,
    "Should throw for number at index 0"
  );

  // Invalid element at index 1
  test.throws(
    function() {
      separate(fromShape, [
        [[10, 10], [20, 10], [20, 20]],
        []
      ]);
    },
    /index 1.*empty array/,
    "Should throw for empty array at index 1"
  );

  // Empty toShapes array
  test.throws(
    function() { separate(fromShape, []); },
    /non-empty array/,
    "Should throw for empty toShapes array"
  );

  // Valid toShapes should NOT throw
  test.doesNotThrow(
    function() {
      separate(fromShape, [[[10, 10], [20, 10], [20, 20]]]);
    },
    "Should not throw for valid toShapes"
  );

  test.end();
});
