/**
 * Creates a pseudo-random value generator. The seed must be an integer.
 *
 * Uses an optimized version of the Park-Miller PRNG.
 * http://www.firstpr.com.au/dsp/rand31/
 */
class Random {
  /**
   * @param {number} seed
   */
  constructor(seed = 42) {
    this._seed = seed % 2147483647;
    if (this._seed <= 0) this._seed += 2147483646;
  };

  /**
   * @returns {number} Returns a pseudo-random value between 1 and 2^32 - 2.
   */
  next() {
    return this._seed = this._seed * 16807 % 2147483647;
  };

  /**
   * Returns a pseudo-random floating point number in range [0, 1).
   * 
   * @deprecated This method's implementation is not returning what it's
   * supposed to; also, it's not using its parameters.
   * 
   * @param {number} [opt_minOrMax]
   * @param {number} [opt_max]
   */
  nextFloat(opt_minOrMax, opt_max) {
    // We know that result of next() will be 1 to 2147483646 (inclusive).
    return (this.next() - 1) / 2147483646;
  };
};

