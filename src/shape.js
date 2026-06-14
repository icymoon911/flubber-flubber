import { polygonLength } from "d3-polygon";
import {
  polygonCentroid,
  interpolatePoints,
  distance,
  isFiniteNumber
} from "./math.js";
import normalizeRing from "./normalize.js";
import { addPoints } from "./add.js";

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
  let interpolator = fromCircle(x, y, radius, fromShape, options);
  return t => interpolator(1 - t);
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
  let interpolator = fromRect(x, y, width, height, fromShape, options);
  return t => interpolator(1 - t);
}

function fromShape(
  fromFn,
  toShape,
  original,
  perimeter,
  { maxSegmentLength = 10, string = true } = {}
) {
  let toRing = normalizeRing(toShape, maxSegmentLength),
    fromRing,
    interpolator;

  // Enforce maxSegmentLength on circle/rect perimeter too
  if (
    isFiniteNumber(perimeter) &&
    toRing.length < perimeter / maxSegmentLength
  ) {
    addPoints(toRing, Math.ceil(perimeter / maxSegmentLength - toRing.length));
  }

  fromRing = fromFn(toRing);
  interpolator = interpolatePoints(fromRing, toRing, string);

  if (string) {
    return t => (t < 1e-4 ? original : interpolator(t));
  }

  return interpolator;
}

export function circlePoints(x, y, radius) {
  return function(ring) {
    let centroid = polygonCentroid(ring),
      perimeter = polygonLength([...ring, ring[0]]),
      startingAngle = Math.atan2(
        ring[0][1] - centroid[1],
        ring[0][0] - centroid[0]
      ),
      along = 0;

    return ring.map((point, i) => {
      let angle;
      if (i) {
        along += distance(point, ring[i - 1]);
      }
      angle =
        startingAngle +
        2 * Math.PI * (perimeter ? along / perimeter : i / ring.length);
      return [Math.cos(angle) * radius + x, Math.sin(angle) * radius + y];
    });
  };
}

export function rectPoints(x, y, width, height) {
  return function(ring) {
    let centroid = polygonCentroid(ring),
      perimeter = polygonLength([...ring, ring[0]]),
      startingAngle = Math.atan2(
        ring[0][1] - centroid[1],
        ring[0][0] - centroid[0]
      ),
      along = 0;

    if (startingAngle < 0) {
      startingAngle = 2 * Math.PI + startingAngle;
    }

    let startingProgress = startingAngle / (2 * Math.PI);

    // Perimeter-based proportions so each side gets its fair share
    let rectPerimeter = 2 * width + 2 * height,
      hFrac = height / rectPerimeter,
      wFrac = width / rectPerimeter;

    // Corner progress values (starting from right-middle, going CW in screen coords)
    // p1 = bottom-right, p2 = bottom-left, p3 = top-left, p4 = top-right
    let p1 = 0.5 * hFrac,
      p2 = p1 + wFrac,
      p3 = p2 + hFrac,
      p4 = p3 + wFrac;

    let cornerData = [
      { p: p1, coords: [x + width, y + height] },
      { p: p2, coords: [x, y + height] },
      { p: p3, coords: [x, y] },
      { p: p4, coords: [x + width, y] }
    ];

    // Build entries: ring points + corners, each with their progress
    let entries = [];

    ring.forEach(function(point, i) {
      if (i) {
        along += distance(point, ring[i - 1]);
      }
      let progress =
        (startingProgress +
          (perimeter ? along / perimeter : i / ring.length)) %
        1;
      entries.push({ progress: progress, type: "ring" });
    });

    // Splice in exact corners
    cornerData.forEach(function(c) {
      entries.push({ progress: c.p, type: "corner", coords: c.coords });
    });

    // Sort by progress
    entries.sort(function(a, b) {
      return a.progress - b.progress;
    });

    // Map each entry to its rect position
    return entries.map(function(entry) {
      if (entry.type === "corner") {
        return entry.coords;
      }
      return mapToRect(entry.progress, x, y, width, height, p1, p2, p3, p4, hFrac, wFrac);
    });
  };
}

function mapToRect(progress, x, y, width, height, p1, p2, p3, p4, hFrac, wFrac) {
  // Lower half of right edge: 0 to p1
  if (progress <= p1) {
    var t = progress / p1;
    return [x + width, y + height * (0.5 + t * 0.5)];
  }
  // Bottom edge: p1 to p2
  if (progress <= p2) {
    var t = (progress - p1) / wFrac;
    return [x + width * (1 - t), y + height];
  }
  // Left edge: p2 to p3
  if (progress <= p3) {
    var t = (progress - p2) / hFrac;
    return [x, y + height * (1 - t)];
  }
  // Top edge: p3 to p4
  if (progress <= p4) {
    var t = (progress - p3) / wFrac;
    return [x + width * t, y];
  }
  // Upper half of right edge: p4 to 1
  var t = (progress - p4) / (0.5 * hFrac);
  return [x + width, y + height * t * 0.5];
}

export function circlePath(x, y, radius) {
  let l = x - radius + "," + y,
    r = x + radius + "," + y,
    pre = "A" + radius + "," + radius + ",0,1,1,";

  return "M" + l + pre + r + pre + l + "Z";
}

export function rectPath(x, y, width, height) {
  let r = x + width,
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
