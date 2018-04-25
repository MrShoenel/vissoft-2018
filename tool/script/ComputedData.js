


const Enum_Computation_Types = Object.freeze({
  CDF: Symbol('CDF'),
  CCDF: Symbol('CCDF')
});


class ComputedData {
  /**
   * @param {Symbol|string} type
   * @param {Array.<number>} data the computed data as 1-dimensional vector
   */
  constructor(type, data) {
    this.type = typeof type === 'symbol' ? type : Enum_Computation_Types[type];
    this.data = data;
  };

  /**
   * @returns {Object.<string, Symbol>}
   */
  static get types() {
    return Enum_Computation_Types;
  };
};


/**
 * @param {{symbol: string, data: Array.<Array.<number>>}} symbAndData
 * @returns {{symbol: string, result: Array.<number>}} the 1-dimensional, computed data
 */
const compute = symbAndData => {
  const doCdf = symbAndData.symbol === 'CDF';
  // TODO: Implement this..
  return {
    symbol: symbAndData.symbol,
    result: doCdf ? [1,2] : [3,4]
  };
};


export {
  Enum_Computation_Types,
  ComputedData,
  compute
};