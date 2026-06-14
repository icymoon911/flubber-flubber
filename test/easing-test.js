import { supertape } from "./utils.js";
import * as shapes from "./shapes.js";
import { toPathString } from "../src/svg.js";
import { interpolatePoints } from "../src/math.js";
import { interpolateRing } from "../src/interpolate.js";
import interpolate from "../src/interpolate.js";
import { fromCircle, toCircle, fromRect, toRect } from "../src/shape.js";
import { separate, combine, interpolateAll } from "../src/multiple.js";
import { resolveEasing } from "../src/easing.js";

let tape = supertape();

// ---------------------------------------------------------------------------
// resolveEasing
// ---------------------------------------------------------------------------

tape("resolveEasing: undefined returns identity", function(test) {
  let ease = resolveEasing();
  test.equal(ease(0), 0);
  test.equal(ease(0.5), 0.5);
  test.equal(ease(1), 1);
  test.end();
});

tape("resolveEasing: string names resolve correctly", function(test) {
  let easeIn = resolveEasing("easeIn");
  test.equal(easeIn(0), 0, "easeIn(0) = 0");
  test.equal(easeIn(1), 1, "easeIn(1) = 1");
  test.ok(easeIn(0.5) < 0.5, "easeIn(0.5) < 0.5 (slow start)");

  let easeOut = resolveEasing("easeOut");
  test.equal(easeOut(0), 0, "easeOut(0) = 0");
  test.equal(easeOut(1), 1, "easeOut(1) = 1");
  test.ok(easeOut(0.5) > 0.5, "easeOut(0.5) > 0.5 (fast start)");

  let easeInOut = resolveEasing("easeInOut");
  test.equal(easeInOut(0), 0, "easeInOut(0) = 0");
  test.equal(easeInOut(1), 1, "easeInOut(1) = 1");
  test.ok(easeInOut(0.5) > 0.49 && easeInOut(0.5) < 0.51, "easeInOut(0.5) ≈ 0.5");

  let linear = resolveEasing("linear");
  test.equal(linear(0.25), 0.25);
  test.equal(linear(0.75), 0.75);

  test.end();
});

tape("resolveEasing: custom function passes through", function(test) {
  let custom = t => t * t;
  test.equal(resolveEasing(custom), custom);
  test.end();
});

tape("resolveEasing: unknown string throws", function(test) {
  test.throws(function() { resolveEasing("bounce"); }, /Unknown easing/);
  test.end();
});

tape("resolveEasing: non-function non-string throws", function(test) {
  test.throws(function() { resolveEasing(42); }, /TypeError/);
  test.end();
});

// ---------------------------------------------------------------------------
// interpolatePoints with easing
// ---------------------------------------------------------------------------

tape("interpolatePoints with easing: easeIn differs from linear at t=0.5", function(test) {
  let sq1 = shapes.square1(),
    sq2 = shapes.square2(),
    linear = interpolatePoints(sq1, sq2, false),
    eased  = interpolatePoints(sq1, sq2, false, "easeIn");

  let linearMid = linear(0.5),
    easedMid    = eased(0.5);

  test.ok(
    linearMid[0][0] !== easedMid[0][0] || linearMid[0][1] !== easedMid[0][1],
    "easeIn at t=0.5 should differ from linear"
  );
  test.end();
});

tape("interpolatePoints with easing: t=0 and t=1 are unchanged", function(test) {
  let sq1 = shapes.square1(),
    sq2 = shapes.square2(),
    eased = interpolatePoints(sq1, sq2, false, "easeInOut");

  test.deepEqual(eased(0), sq1, "t=0 returns start shape regardless of easing");
  test.deepEqual(eased(1), sq2, "t=1 returns end shape regardless of easing");
  test.end();
});

tape("interpolatePoints with custom easing function", function(test) {
  let sq1 = shapes.square1(),
    sq2 = shapes.square2(),
    customEase = t => t * t,   // quadratic ease-in
    eased = interpolatePoints(sq1, sq2, false, customEase);

  // At t=0.5, eased t should be 0.25, so point [0,0] → [100,0] should be at 25%
  // sq1[0]=[0,0], sq2[0]=[100,0]: x = 0 + 0.25*(100-0) = 25
  let result = eased(0.5);
  test.equal(result[0][0], 25, "custom easing t*t at t=0.5 gives et=0.25");
  test.end();
});

tape("interpolatePoints with string output and easing", function(test) {
  let sq1 = shapes.square1(),
    sq2 = shapes.square2(),
    linearStr = interpolatePoints(sq1, sq2, true),
    easedStr  = interpolatePoints(sq1, sq2, true, "easeIn");

  test.notEqual(linearStr(0.5), easedStr(0.5), "string outputs differ with easing");
  test.equal(linearStr(0), easedStr(0), "t=0 same");
  test.equal(linearStr(1), easedStr(1), "t=1 same");
  test.end();
});

// ---------------------------------------------------------------------------
// interpolate (high-level) with easing
// ---------------------------------------------------------------------------

tape("interpolate with easing option", function(test) {
  let sq1 = "M0,0L100,0L100,100L0,100Z",
    sq2 = "M100,0L200,0L200,100L100,100Z",
    linear = interpolate(sq1, sq2),
    eased  = interpolate(sq1, sq2, { easing: "easeIn" });

  test.notEqual(linear(0.5), eased(0.5), "eased result differs from linear at t=0.5");
  test.equal(linear(0), sq1, "t=0 returns original string (linear)");
  test.equal(eased(0), sq1, "t=0 returns original string (eased)");
  test.equal(linear(1), sq2, "t=1 returns target string (linear)");
  test.equal(eased(1), sq2, "t=1 returns target string (eased)");
  test.end();
});

tape("interpolate: easing preserves string short-circuit at boundaries", function(test) {
  let sq1 = "M0,0L100,0L100,100L0,100Z",
    sq2 = "M100,0L200,0L200,100L100,100Z",
    // easeIn: very small t stays very small, still short-circuits to fromShape
    eased = interpolate(sq1, sq2, { easing: "easeIn" });

  // t=0.00001 is already < 1e-4, and easeIn(0.00001) = 1e-15, still < 1e-4
  test.equal(eased(0.00001), sq1, "near-zero t still short-circuits with easeIn");
  // t=0.99999 is already close to 1, and easeIn(0.99999) ≈ 0.99997, 1-0.99997 < 1e-4
  test.equal(eased(0.99999), sq2, "near-one t still short-circuits with easeIn");
  test.end();
});

tape("interpolate: easing maps small t to large value, skipping short-circuit", function(test) {
  // A custom easing that maps any t > 0 to 0.5
  let sq1 = "M0,0L100,0L100,100L0,100Z",
    sq2 = "M100,0L200,0L200,100L100,100Z",
    weirdEase = t => (t > 0 && t < 1) ? 0.5 : t,
    eased = interpolate(sq1, sq2, { easing: weirdEase });

  // t=0.00001 is < 1e-4 but eased to 0.5, so it should NOT short-circuit
  let result = eased(0.00001);
  test.notEqual(result, sq1, "easing mapping small t to 0.5 skips fromShape short-circuit");
  test.notEqual(result, sq2, "easing mapping small t to 0.5 skips toShape short-circuit");
  test.equal(typeof result, "string", "still returns a string");
  test.end();
});

// ---------------------------------------------------------------------------
// fromCircle / toCircle / fromRect / toRect with easing
// ---------------------------------------------------------------------------

tape("fromCircle with easing", function(test) {
  let sq = shapes.square1(),
    linear = fromCircle(50, 50, 50, sq),
    eased  = fromCircle(50, 50, 50, sq, { easing: "easeIn" });

  test.notEqual(linear(0.5), eased(0.5), "eased fromCircle differs from linear at t=0.5");
  test.end();
});

tape("toCircle with easing", function(test) {
  let sq = shapes.square1(),
    linear = toCircle(sq, 50, 50, 50),
    eased  = toCircle(sq, 50, 50, 50, { easing: "easeOut" });

  test.notEqual(linear(0.5), eased(0.5), "eased toCircle differs from linear at t=0.5");
  test.end();
});

tape("fromRect with easing", function(test) {
  let tri = shapes.triangle1(),
    linear = fromRect(0, 0, 100, 100, tri),
    // Use easeIn (easeIn(0.5)=0.125 ≠ 0.5) so interpolation at t=0.5 differs
    eased  = fromRect(0, 0, 100, 100, tri, { easing: "easeIn" });

  test.notEqual(linear(0.5), eased(0.5), "eased fromRect differs from linear at t=0.5");
  test.end();
});

tape("toRect with easing", function(test) {
  let tri = shapes.triangle1(),
    linear = toRect(tri, 0, 0, 100, 100),
    eased  = toRect(tri, 0, 0, 100, 100, { easing: "easeIn" });

  test.notEqual(linear(0.5), eased(0.5), "eased toRect differs from linear at t=0.5");
  test.end();
});

tape("shape functions: t=0 and t=1 are unchanged by easing", function(test) {
  let sq = shapes.square1(),
    eased = fromCircle(50, 50, 50, sq, { easing: "easeInOut" });

  // At t=0, fromCircle should return the original circle path string
  test.equal(typeof eased(0), "string", "fromCircle eased t=0 returns string");
  // At t=1, it should have morphed to the square (not equal to t=0 result)
  test.notEqual(eased(0), eased(1), "fromCircle t=0 != t=1");
  test.end();
});

// ---------------------------------------------------------------------------
// separate / combine / interpolateAll with easing
// ---------------------------------------------------------------------------

tape("separate with easing: each sub-interpolator is eased", function(test) {
  let sq = "M0,0L100,0L100,100L0,100Z",
    targets = ["M0,0L50,0L50,50L0,50Z", "M50,50L100,50L100,100L50,100Z"],
    linear = separate(sq, targets),
    eased  = separate(sq, targets, { easing: "easeIn" });

  test.equal(linear.length, eased.length, "same number of interpolators");
  test.notEqual(linear[0](0.5), eased[0](0.5), "first sub-interpolator differs with easing");
  test.notEqual(linear[1](0.5), eased[1](0.5), "second sub-interpolator differs with easing");
  test.end();
});

tape("combine with easing", function(test) {
  let sq = "M0,0L100,0L100,100L0,100Z",
    parts = ["M0,0L50,0L50,50L0,50Z", "M50,50L100,50L100,100L50,100Z"],
    linear = combine(parts, sq),
    eased  = combine(parts, sq, { easing: "easeOut" });

  test.notEqual(linear[0](0.5), eased[0](0.5), "combine first interpolator differs with easing");
  test.notEqual(linear[1](0.5), eased[1](0.5), "combine second interpolator differs with easing");
  test.end();
});

tape("interpolateAll with easing", function(test) {
  let from = ["M0,0L50,0L50,50L0,50Z", "M50,50L100,50L100,100L50,100Z"],
    to   = ["M0,0L100,0L100,100L0,100Z", "M100,0L200,0L200,100L100,100Z"],
    linear = interpolateAll(from, to),
    // Use easeIn (easeIn(0.5)=0.125 ≠ 0.5) to guarantee difference at t=0.5
    eased  = interpolateAll(from, to, { easing: "easeIn" });

  test.notEqual(linear[0](0.5), eased[0](0.5), "interpolateAll first differs with easing");
  test.notEqual(linear[1](0.5), eased[1](0.5), "interpolateAll second differs with easing");
  test.end();
});

tape("separate single with easing", function(test) {
  let sq = "M0,0L100,0L100,100L0,100Z",
    targets = ["M0,0L50,0L50,50L0,50Z", "M50,50L100,50L100,100L50,100Z"],
    linear = separate(sq, targets, { single: true }),
    eased  = separate(sq, targets, { single: true, easing: "easeIn" });

  test.notEqual(linear(0.5), eased(0.5), "separate single differs with easing");
  test.end();
});

tape("separate: t=0 and t=1 preserve strings with easing", function(test) {
  let sq = "M0,0L100,0L100,100L0,100Z",
    targets = ["M0,0L50,0L50,50L0,50Z", "M50,50L100,50L100,100L50,100Z"],
    eased = separate(sq, targets, { easing: "easeIn" });

  test.equal(eased[0](1), targets[0], "first target preserved at t=1 with easing");
  test.equal(eased[1](1), targets[1], "second target preserved at t=1 with easing");
  test.end();
});

// ---------------------------------------------------------------------------
// Built-in easing values sanity check
// ---------------------------------------------------------------------------

tape("built-in easing: easeIn is cubic", function(test) {
  let ease = resolveEasing("easeIn");
  test.inDelta(ease(0.5), 0.125, 1e-9, "easeIn(0.5) = 0.125");
  test.inDelta(ease(0.25), 0.015625, 1e-9, "easeIn(0.25) = 0.015625");
  test.end();
});

tape("built-in easing: easeOut is cubic", function(test) {
  let ease = resolveEasing("easeOut");
  test.inDelta(ease(0.5), 0.875, 1e-9, "easeOut(0.5) = 0.875");
  test.end();
});

tape("built-in easing: easeInOut is cubic", function(test) {
  let ease = resolveEasing("easeInOut");
  test.inDelta(ease(0.5), 0.5, 1e-9, "easeInOut(0.5) = 0.5");
  test.inDelta(ease(0.25), 0.0625, 1e-9, "easeInOut(0.25) = 0.0625");
  test.inDelta(ease(0.75), 0.9375, 1e-9, "easeInOut(0.75) = 0.9375");
  test.end();
});
