import * as typedefs from './typedefs.js';


const Enum_Computation_Types = Object.freeze({
  CDF: Symbol('CDF'),
  CCDF: Symbol('CCDF')
});



class ComputedData {
  /**
   * @param {Symbol|string} type
   * @param {Array.<EntityData>} data the computed data as 1-dimensional vector
   */
  constructor(type, data) {
    this.type = typeof type === 'symbol' ? type : Enum_Computation_Types[type];
    this.data = data.sort((a, b) => a.val - b.val);

    this.min = data.length === 0 ? void 0 : this.data[0].val;
    this.max = data.length === 0 ? void 0 : this.data[this.data.length - 1].val;
  };

  get range() {
    return this.max - this.min;
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