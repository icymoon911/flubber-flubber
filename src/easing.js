// Built-in easing functions (cubic curves)
var easings = {
  easeIn: function(t) {
    return t * t * t;
  },
  easeOut: function(t) {
    return 1 - Math.pow(1 - t, 3);
  },
  easeInOut: function(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
};

export function resolveEasing(easing) {
  if (!easing) {
    return null;
  }
  if (typeof easing === "function") {
    return easing;
  }
  if (typeof easing === "string") {
    if (easings[easing]) {
      return easings[easing];
    }
    throw new Error("Unknown easing: " + easing + ". Valid options: " + Object.keys(easings).join(", "));
  }
  throw new TypeError("easing must be a function or a string");
}

export { easings };
