import { supertape } from "./utils.js";
import * as shapes from "./shapes.js";
import { toPathString } from "../src/svg.js";
import interpolate from "../src/interpolate.js";
import { fromCircle, toCircle, fromRect, toRect } from "../src/shape.js";
import { separate, combine, interpolateAll } from "../src/multiple.js";
import { easings, resolveEasing } from "../src/easing.js";

let tape = supertape();

// ---- resolveEasing ----

tape("resolveEasing: returns null for falsy input", function(test) {
  test.equal(resolveEasing(undefined), null);
  test.equal(resolveEasing(null), null);
  test.equal(resolveEasing(false), null);
  test.end();
});

tape("resolveEasing: returns the function directly", function(test) {
  var fn = function(t) { return t * t; };
  test.equal(resolveEasing(fn), fn);
  test.end();
});

tape("resolveEasing: resolves string names", function(test) {
  test.equal(resolveEasing("easeIn"), easings.easeIn);
  test.equal(resolveEasing("easeOut"), easings.easeOut);
  test.equal(resolveEasing("easeInOut"), easings.easeInOut);
  test.end();
});

tape("resolveEasing: throws on unknown string", function(test) {
  test.throws(function() { resolveEasing("bogus"); }, /Unknown easing/);
  test.end();
});

tape("resolveEasing: throws on invalid type", function(test) {
  test.throws(function() { resolveEasing(42); }, /must be a function or a string/);
  test.end();
});

// ---- built-in easing curves ----

tape("built-in easings: boundary values", function(test) {
  ["easeIn", "easeOut", "easeInOut"].forEach(function(name) {
    test.inDelta(easings[name](0), 0, 1e-10);
    test.inDelta(easings[name](1), 1, 1e-10);
  });
  test.end();
});

tape("built-in easings: easeIn at 0.5 differs from linear", function(test) {
  // cubic easeIn: 0.5^3 = 0.125
  test.inDelta(easings.easeIn(0.5), 0.125, 1e-10);
  test.ok(easings.easeIn(0.5) !== 0.5);
  test.end();
});

tape("built-in easings: easeOut at 0.5 differs from linear", function(test) {
  // cubic easeOut: 1 - (1-0.5)^3 = 1 - 0.125 = 0.875
  test.inDelta(easings.easeOut(0.5), 0.875, 1e-10);
  test.ok(easings.easeOut(0.5) !== 0.5);
  test.end();
});

tape("built-in easings: easeInOut at 0.5 equals 0.5", function(test) {
  // cubic easeInOut is symmetric: f(0.5) = 0.5
  test.inDelta(easings.easeInOut(0.5), 0.5, 1e-10);
  // but at 0.25 it should differ from linear
  test.ok(Math.abs(easings.easeInOut(0.25) - 0.25) > 0.01);
  test.end();
});

// ---- interpolate with easing ----

tape("interpolate: easing option as function", function(test) {
  var square1 = shapes.square1(),
    square2 = shapes.square2(),
    linear = interpolate(square1, square2, { string: false }),
    eased = interpolate(square1, square2, { string: false, easing: function(t) { return t * t; } });

  // at t=0 and t=1, results should be the same
  test.deepEqual(eased(0), linear(0));
  test.deepEqual(eased(1), linear(1));

  // at t=0.5, eased should use t=0.25 internally
  test.deepEqual(eased(0.5), linear(0.25));

  // at t=0.5, eased should differ from linear(0.5)
  var linearMid = linear(0.5);
  var easedMid = eased(0.5);
  test.ok(linearMid[0][0] !== easedMid[0][0] || linearMid[0][1] !== easedMid[0][1],
    "eased midpoint should differ from linear midpoint");

  test.end();
});

tape("interpolate: easing option as string", function(test) {
  var square1 = shapes.square1(),
    square2 = shapes.square2(),
    linear = interpolate(square1, square2, { string: false }),
    eased = interpolate(square1, square2, { string: false, easing: "easeIn" });

  // easeIn(0.5) = 0.125, so eased(0.5) should equal linear(0.125)
  test.deepEqual(eased(0.5), linear(0.125));
  test.end();
});

tape("interpolate: t=0 and t=1 unaffected by easing", function(test) {
  var square1 = shapes.square1(),
    square2 = shapes.square2(),
    linear = interpolate(square1, square2, { string: false }),
    eased = interpolate(square1, square2, { string: false, easing: "easeInOut" });

  test.deepEqual(eased(0), linear(0));
  test.deepEqual(eased(1), linear(1));
  test.end();
});

tape("interpolate: easing with string path optimization", function(test) {
  var pathA = "M0,0L100,0L100,100L0,100Z",
    pathB = "M100,0L200,0L200,100L100,100Z",
    eased = interpolate(pathA, pathB, { easing: "easeIn" });

  // t=0 should return original pathA (eased 0 = 0, still < 1e-4)
  test.equal(eased(0), pathA);

  // t=1 should return original pathB (eased 1 = 1, 1-eased < 1e-4)
  test.equal(eased(1), pathB);

  // t=0.5 with easeIn -> eased=0.125, should NOT return original strings
  var mid = eased(0.5);
  test.notEqual(mid, pathA);
  test.notEqual(mid, pathB);
  test.ok(typeof mid === "string");

  test.end();
});

tape("interpolate: easing maps small t to large value skips optimization", function(test) {
  var pathA = "M0,0L100,0L100,100L0,100Z",
    pathB = "M100,0L200,0L200,100L100,100Z",
    // This easing maps everything to 0.5 — even t=0.00001 becomes 0.5
    constantEasing = function() { return 0.5; },
    eased = interpolate(pathA, pathB, { easing: constantEasing });

  // At t=0.00001 (which is < 1e-4), without easing we'd return pathA,
  // but since easing maps it to 0.5, we should get interpolated result
  var result = eased(0.00001);
  test.notEqual(result, pathA);
  test.notEqual(result, pathB);

  test.end();
});

// ---- fromCircle / toCircle with easing ----

tape("fromCircle: easing works", function(test) {
  var target = shapes.square1(),
    linear = fromCircle(50, 50, 30, target, { string: false }),
    eased = fromCircle(50, 50, 30, target, { string: false, easing: "easeIn" });

  // t=0 and t=1 should be the same
  test.deepEqual(eased(0), linear(0));
  test.deepEqual(eased(1), linear(1));

  // t=0.5 with easeIn should equal linear at 0.125
  test.deepEqual(eased(0.5), linear(0.125));

  test.end();
});

tape("toCircle: easing works with correct direction", function(test) {
  var source = shapes.square1(),
    linear = toCircle(source, 50, 50, 30, { string: false }),
    eased = toCircle(source, 50, 50, 30, { string: false, easing: "easeIn" });

  // t=0 and t=1 should match
  test.deepEqual(eased(0), linear(0));
  test.deepEqual(eased(1), linear(1));

  // t=0.5 should differ from linear midpoint
  var linearMid = linear(0.5);
  var easedMid = eased(0.5);
  test.ok(
    linearMid[0][0] !== easedMid[0][0] || linearMid[0][1] !== easedMid[0][1],
    "eased toCircle midpoint should differ from linear"
  );

  test.end();
});

// ---- fromRect / toRect with easing ----

tape("fromRect: easing works", function(test) {
  var target = shapes.square1(),
    linear = fromRect(0, 0, 50, 50, target, { string: false }),
    eased = fromRect(0, 0, 50, 50, target, { string: false, easing: "easeOut" });

  // t=0 and t=1 should be the same
  test.deepEqual(eased(0), linear(0));
  test.deepEqual(eased(1), linear(1));

  // t=0.5 with easeOut should equal linear at easeOut(0.5) = 0.875
  test.deepEqual(eased(0.5), linear(0.875));

  test.end();
});

tape("toRect: easing works", function(test) {
  var source = shapes.square1(),
    linear = toRect(source, 0, 0, 50, 50, { string: false }),
    eased = toRect(source, 0, 0, 50, 50, { string: false, easing: "easeOut" });

  // t=0 and t=1 should match
  test.deepEqual(eased(0), linear(0));
  test.deepEqual(eased(1), linear(1));

  // t=0.5 should differ from linear midpoint (check any point differs)
  var linearMid = linear(0.5);
  var easedMid = eased(0.5);
  var differs = false;
  for (var k = 0; k < linearMid.length; k++) {
    if (linearMid[k][0] !== easedMid[k][0] || linearMid[k][1] !== easedMid[k][1]) {
      differs = true;
      break;
    }
  }
  test.ok(differs, "eased toRect midpoint should differ from linear");

  test.end();
});

// ---- separate / combine / interpolateAll with easing ----

tape("separate: easing applies to all sub-interpolators", function(test) {
  var from = shapes.square1(),
    to = [shapes.triangle1(), shapes.triangle2()],
    linear = separate(from, to, { string: false }),
    eased = separate(from, to, { string: false, easing: "easeIn" });

  // Both should return arrays of the same length
  test.equal(linear.length, eased.length);

  // Each sub-interpolator at t=0 and t=1 should match
  linear.forEach(function(fn, i) {
    test.deepEqual(eased[i](0), fn(0));
    test.deepEqual(eased[i](1), fn(1));
  });

  // Each sub-interpolator at t=0.5 should differ from linear
  linear.forEach(function(fn, i) {
    var linearMid = fn(0.5);
    var easedMid = eased[i](0.5);
    test.ok(
      linearMid[0][0] !== easedMid[0][0] || linearMid[0][1] !== easedMid[0][1],
      "separate sub-interpolator " + i + " midpoint should differ with easing"
    );
  });

  test.end();
});

tape("combine: easing applies to all sub-interpolators", function(test) {
  var from = [shapes.triangle1(), shapes.triangle2()],
    to = shapes.square1(),
    linear = combine(from, to, { string: false }),
    eased = combine(from, to, { string: false, easing: "easeIn" });

  test.equal(linear.length, eased.length);

  linear.forEach(function(fn, i) {
    test.deepEqual(eased[i](0), fn(0));
    test.deepEqual(eased[i](1), fn(1));
  });

  linear.forEach(function(fn, i) {
    var linearMid = fn(0.5);
    var easedMid = eased[i](0.5);
    test.ok(
      linearMid[0][0] !== easedMid[0][0] || linearMid[0][1] !== easedMid[0][1],
      "combine sub-interpolator " + i + " midpoint should differ with easing"
    );
  });

  test.end();
});

tape("interpolateAll: easing applies to all sub-interpolators", function(test) {
  var from = [shapes.square1(), shapes.triangle1()],
    to = [shapes.square2(), shapes.triangle2()],
    linear = interpolateAll(from, to, { string: false }),
    eased = interpolateAll(from, to, { string: false, easing: "easeInOut" });

  test.equal(linear.length, eased.length);

  linear.forEach(function(fn, i) {
    test.deepEqual(eased[i](0), fn(0));
    test.deepEqual(eased[i](1), fn(1));
  });

  // At least one sub-interpolator should differ at t=0.25
  // (easeInOut(0.5)=0.5 by symmetry, so we test at 0.25 instead)
  var anyDiffer = false;
  linear.forEach(function(fn, i) {
    var linearQ = fn(0.25);
    var easedQ = eased[i](0.25);
    for (var k = 0; k < linearQ.length; k++) {
      if (linearQ[k][0] !== easedQ[k][0] || linearQ[k][1] !== easedQ[k][1]) {
        anyDiffer = true;
        break;
      }
    }
  });
  test.ok(anyDiffer, "interpolateAll with easeInOut should differ at t=0.25");

  test.end();
});

tape("separate single: easing works", function(test) {
  var from = shapes.square1(),
    to = [shapes.triangle1(), shapes.triangle2()],
    linear = separate(from, to, { string: true, single: true }),
    eased = separate(from, to, { string: true, single: true, easing: "easeIn" });

  // Both should be functions returning strings
  test.equal(typeof linear(0.5), "string");
  test.equal(typeof eased(0.5), "string");

  // Results should differ at midpoint
  test.notEqual(linear(0.5), eased(0.5));

  test.end();
});

tape("combine single: easing works", function(test) {
  var from = [shapes.triangle1(), shapes.triangle2()],
    to = shapes.square1(),
    linear = combine(from, to, { string: true, single: true }),
    eased = combine(from, to, { string: true, single: true, easing: "easeIn" });

  test.equal(typeof linear(0.5), "string");
  test.equal(typeof eased(0.5), "string");
  test.notEqual(linear(0.5), eased(0.5));

  test.end();
});

// ---- custom easing function ----

tape("interpolate: custom easing function", function(test) {
  var square1 = shapes.square1(),
    square2 = shapes.square2(),
    linear = interpolate(square1, square2, { string: false }),
    // A step function: anything below 0.5 maps to 0, anything >= 0.5 maps to 1
    step = function(t) { return t < 0.5 ? 0 : 1; },
    stepped = interpolate(square1, square2, { string: false, easing: step });

  // At t=0.49, eased t=0, should return square1
  test.deepEqual(stepped(0.49), linear(0));

  // At t=0.5, eased t=1, should return square2
  test.deepEqual(stepped(0.5), linear(1));

  // At t=0.99, eased t=1, should return square2
  test.deepEqual(stepped(0.99), linear(1));

  test.end();
});
