// Built-in easing functions
const builtInEasings = {
  linear: t => t,
  easeIn: t => t * t * t,
  easeOut: t => 1 - Math.pow(1 - t, 3),
  easeInOut: t => t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
};

/**
 * Resolve an easing parameter to a function.
 * Accepts a string name ("easeIn", "easeOut", "easeInOut", "linear")
 * or a custom function (t) => t.
 * Returns the identity function when easing is undefined/null.
 */
export function resolveEasing(easing) {
  if (easing == null) {
    return t => t;
  }
  if (typeof easing === "function") {
    return easing;
  }
  if (typeof easing === "string") {
    let fn = builtInEasings[easing];
    if (!fn) {
      throw new Error(
        "Unknown easing \"" + easing + "\". " +
        "Valid options are: " + Object.keys(builtInEasings).join(", ")
      );
    }
    return fn;
  }
  throw new TypeError("easing must be a function or a string name");
}
