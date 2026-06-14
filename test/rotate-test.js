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

tape("Large ring rotation correctness (heuristic matches brute force)", function(test) {
  // Generate a large ring of points on a circle
  let n = 200,
    ring = [],
    target = [];

  for (let i = 0; i < n; i++) {
    let angle = 2 * Math.PI * i / n;
    ring.push([Math.cos(angle) * 100, Math.sin(angle) * 100]);
  }
  target = ring.slice(0);

  // Test multiple rotation offsets
  for (let offset = 0; offset < n; offset += 37) {
    let rotated = target.slice(0);
    for (let i = 0; i < offset; i++) {
      rotated.push(rotated.shift());
    }

    rotate(rotated, target);

    test.deepEqual(
      rotated,
      target,
      "Ring of " + n + " points should match after rotating by " + offset
    );
  }

  test.end();
});

tape("Large ring rotation performance", function(test) {
  let n = 500,
    ring = [],
    target = [];

  for (let i = 0; i < n; i++) {
    let angle = 2 * Math.PI * i / n;
    ring.push([Math.cos(angle) * 100, Math.sin(angle) * 100]);
  }
  target = ring.slice(0);

  let rotated = target.slice(0);
  // Shift by a non-trivial offset
  for (let i = 0; i < 123; i++) {
    rotated.push(rotated.shift());
  }

  let start = Date.now();
  rotate(rotated, target);
  let elapsed = Date.now() - start;

  // The heuristic approach should complete well under 1 second for 500 points.
  // Brute force O(n^2) would take noticeably longer.
  test.assert(
    elapsed < 2000,
    "Rotation of " + n + "-point ring completed in " + elapsed + "ms (< 2000ms)"
  );
  test.deepEqual(
    rotated,
    target,
    "Rotated ring should match target after heuristic rotation"
  );

  test.end();
});

function offsetRing(arr, n) {
  for (let i = 0; i < n; i++) {
    arr.push(arr.shift());
  }

  return arr;
}
