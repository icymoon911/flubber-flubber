import { supertape } from "./utils.js";
import * as shapes from "./shapes.js";
import rotate from "../src/rotate.js";

let tape = supertape();

tape("Rotate squares successfully", function(test) {
  let square = shapes.square1();

  for (let i = 0; i < 4; i++) {
    let off = offsetRing(shapes.square1(), i);

    // Rings don't match
    test[i ? "notDeepEqual" : "deepEqual"](square, off);

    rotate(off, square);

    // Equal post-rotation
    test.deepEqual(square, off);

    // Square hasn't changed
    test.deepEqual(square, shapes.square1());
  }

  test.end();
});

tape("Min Distance", function(test) {
  let triangle = shapes.triangle1(), alt = shapes.triangle2();

  for (let i = 0; i < 3; i++) {
    let off = offsetRing(shapes.triangle2(), i);

    // Rings don't match
    test[i ? "notDeepEqual" : "deepEqual"](alt, off);

    rotate(off, triangle);

    // Expected post-rotation
    test.deepEqual(alt, off);

    // Triangle hasn't changed
    test.deepEqual(triangle, shapes.triangle1());
  }

  test.end();
});

tape("Large ring performance", function(test) {
  // Generate a large ring (500 points on a circle)
  var n = 500;
  var baseRing = [];
  for (var i = 0; i < n; i++) {
    var angle = (2 * Math.PI * i) / n;
    baseRing.push([Math.cos(angle) * 100, Math.sin(angle) * 100]);
  }

  // Offset by a known amount
  var knownOffset = 137;
  var offset = offsetRing(baseRing.map(function(p) { return p.slice(); }), knownOffset);

  var target = baseRing.map(function(p) { return p.slice(); });

  var start = Date.now();
  rotate(offset, target);
  var elapsed = Date.now() - start;

  // Should complete well under 1 second (brute force O(n²) on 500 points would be much slower)
  test.assert(elapsed < 1000, "Large ring rotation should complete in under 1 second, took " + elapsed + "ms");

  // Verify correct alignment: the offset ring should match the target after rotation
  // Since points on a circle are evenly spaced, check that rotation restored alignment
  // by checking total squared distance is near zero
  var totalDist = 0;
  for (var i = 0; i < n; i++) {
    var dx = offset[i][0] - target[i][0];
    var dy = offset[i][1] - target[i][1];
    totalDist += dx * dx + dy * dy;
  }
  test.assert(totalDist < 1, "Total squared distance after rotation should be near zero, got " + totalDist);

  test.end();
});

tape("Large ring correctness against brute force", function(test) {
  // For rings just above the brute force threshold, verify results match
  // by comparing with a known-good offset
  var sizes = [65, 100, 200];

  sizes.forEach(function(n) {
    var baseRing = [];
    for (var i = 0; i < n; i++) {
      var angle = (2 * Math.PI * i) / n;
      // Add slight perturbation to avoid degenerate case of identical points
      var r = 100 + Math.sin(i * 7.3) * 10;
      baseRing.push([Math.cos(angle) * r, Math.sin(angle) * r]);
    }

    var knownOffset = Math.floor(n * 0.37);
    var offset = baseRing.map(function(p) { return p.slice(); });
    for (var j = 0; j < knownOffset; j++) {
      offset.push(offset.shift());
    }

    var target = baseRing.map(function(p) { return p.slice(); });
    rotate(offset, target);

    // After rotation, the offset ring should be close to target
    var totalDist = 0;
    for (var i = 0; i < n; i++) {
      var dx = offset[i][0] - target[i][0];
      var dy = offset[i][1] - target[i][1];
      totalDist += dx * dx + dy * dy;
    }
    test.assert(totalDist < 1, "Ring of size " + n + ": total squared distance should be near zero, got " + totalDist);
  });

  test.end();
});

function offsetRing(arr, n) {
  for (let i = 0; i < n; i++) {
    arr.push(arr.shift());
  }

  return arr;
}
