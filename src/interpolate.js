import normalizeRing from "./normalize.js";
import { addPoints } from "./add.js";
import rotate from "./rotate.js";
import { interpolatePoints } from "./math.js";
import { parseOptions, withEndpointPreservation } from "./utils.js";

export default function (fromShape, toShape, options) {
  var opts = parseOptions(options),
    fromRing = normalizeRing(fromShape, opts.maxSegmentLength),
    toRing = normalizeRing(toShape, opts.maxSegmentLength),
    interpolator = interpolateRing(fromRing, toRing, opts.string);

  if (!opts.string) {
    return interpolator;
  }

  return withEndpointPreservation(
    interpolator,
    typeof fromShape === "string" ? fromShape : false,
    typeof toShape === "string" ? toShape : false
  );
}

export function interpolateRing(fromRing, toRing, string) {
  var diff = fromRing.length - toRing.length;

  addPoints(fromRing, diff < 0 ? diff * -1 : 0);
  addPoints(toRing, diff > 0 ? diff : 0);

  rotate(fromRing, toRing);

  return interpolatePoints(fromRing, toRing, string);
}
