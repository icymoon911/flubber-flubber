import { polygonLength } from "d3-polygon";
import {
  polygonCentroid,
  interpolatePoints,
  distance,
  isFiniteNumber
} from "./math.js";
import normalizeRing from "./normalize.js";
import { addPoints } from "./add.js";
import { parseOptions, withEndpointPreservation } from "./utils.js";

export function fromCircle(x, y, radius, toShape, options) {
  return fromShape(
    circlePoints(x, y, radius),
    toShape,
    circlePath(x, y, radius),
    2 * Math.PI * radius,
    options
  );
}

export function toCircle(fromShape, x, y, radius, options) {
  var interpolator = fromCircle(x, y, radius, fromShape, options);
  return function (t) { return interpolator(1 - t); };
}

export function fromRect(x, y, width, height, toShape, options) {
  return fromShape(
    rectPoints(x, y, width, height),
    toShape,
    rectPath(x, y, width, height),
    2 * width + 2 * height,
    options
  );
}

export function toRect(fromShape, x, y, width, height, options) {
  var interpolator = fromRect(x, y, width, height, fromShape, options);
  return function (t) { return interpolator(1 - t); };
}

function fromShape(
  fromFn,
  toShape,
  original,
  perimeter,
  options
) {
  var opts = parseOptions(options),
    toRing = normalizeRing(toShape, opts.maxSegmentLength),
    fromRing,
    interpolator;

  // Enforce maxSegmentLength on circle/rect perimeter too
  if (
    isFiniteNumber(perimeter) &&
    toRing.length < perimeter / opts.maxSegmentLength
  ) {
    addPoints(toRing, Math.ceil(perimeter / opts.maxSegmentLength - toRing.length));
  }

  fromRing = fromFn(toRing);
  interpolator = interpolatePoints(fromRing, toRing, opts.string);

  return withEndpointPreservation(interpolator, opts.string ? original : false, false);
}

/**
 * Generic framework for mapping a source ring onto a target shape by
 * walking along the ring's perimeter. The mapFn receives (angle, progress)
 * for circle targets or (progress) for rect targets, and returns an [x, y] point.
 */
function mapAlongPerimeter(ring, mapFn) {
  var centroid = polygonCentroid(ring),
    perimeter = polygonLength([].concat(ring, [ring[0]])),
    startingAngle = Math.atan2(
      ring[0][1] - centroid[1],
      ring[0][0] - centroid[0]
    ),
    along = 0;

  return ring.map(function (point, i) {
    if (i) {
      along += distance(point, ring[i - 1]);
    }
    var progress = perimeter ? along / perimeter : i / ring.length;
    return mapFn(startingAngle, progress, i);
  });
}

export function circlePoints(x, y, radius) {
  return function (ring) {
    return mapAlongPerimeter(ring, function (startingAngle, progress) {
      var angle = startingAngle + 2 * Math.PI * progress;
      return [Math.cos(angle) * radius + x, Math.sin(angle) * radius + y];
    });
  };
}

// TODO splice in exact corners?
export function rectPoints(x, y, width, height) {
  return function (ring) {
    return mapAlongPerimeter(ring, function (startingAngle, progress) {
      var angle = startingAngle;
      if (angle < 0) {
        angle = 2 * Math.PI + angle;
      }
      var startingProgress = angle / (2 * Math.PI);
      var relative = rectPoint((startingProgress + progress) % 1);
      return [x + relative[0] * width, y + relative[1] * height];
    });
  };
}

// TODO don't do this
function rectPoint(progress) {
  if (progress <= 1 / 8) {
    return [1, 0.5 + progress * 4];
  }
  if (progress <= 3 / 8) {
    return [1.5 - 4 * progress, 1];
  }
  if (progress <= 5 / 8) {
    return [0, 2.5 - 4 * progress];
  }
  if (progress <= 7 / 8) {
    return [4 * progress - 2.5, 0];
  }
  return [1, 4 * progress - 3.5];
}

export function circlePath(x, y, radius) {
  var l = x - radius + "," + y,
    r = x + radius + "," + y,
    pre = "A" + radius + "," + radius + ",0,1,1,";

  return "M" + l + pre + r + pre + l + "Z";
}

export function rectPath(x, y, width, height) {
  var r = x + width,
    b = y + height;
  return (
    "M" +
    x +
    "," +
    y +
    "L" +
    r +
    "," +
    y +
    "L" +
    r +
    "," +
    b +
    "L" +
    x +
    "," +
    b +
    "Z"
  );
}
