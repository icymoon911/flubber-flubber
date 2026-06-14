import { polygonLength } from "d3-polygon";
import { distance, pointAlong } from "./math.js";

export function addPoints(ring, numPoints) {
  const len = polygonLength(ring);

  // Zero-length ring: all points coincide, just duplicate the existing point
  if (!len) {
    for (let i = 0; i < numPoints; i++) {
      ring.splice(ring.length, 0, ring[0].slice(0));
    }
    return;
  }

  const desiredLength = ring.length + numPoints,
    step = len / numPoints;

  let i = 0,
    cursor = 0,
    insertAt = step / 2;

  while (ring.length < desiredLength) {
    let a = ring[i],
      b = ring[(i + 1) % ring.length],
      segment = distance(a, b);

    if (insertAt <= cursor + segment) {
      ring.splice(
        i + 1,
        0,
        segment ? pointAlong(a, b, (insertAt - cursor) / segment) : a.slice(0)
      );
      insertAt += step;
      continue;
    }

    cursor += segment;
    i++;
  }
}

export function bisect(ring, maxSegmentLength = Infinity) {
  for (let i = 0; i < ring.length; i++) {
    let a = ring[i],
      b = i === ring.length - 1 ? ring[0] : ring[i + 1];

    // Could splice the whole set for a segment instead, but a bit messy
    while (distance(a, b) > maxSegmentLength) {
      b = pointAlong(a, b, 0.5);
      ring.splice(i + 1, 0, b);
    }
  }
}
