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

  /**
   * @param {Symbol|string} type
   * @param {Array.<Column>} chunks
   * @returns {ComputedData}
   */
  static fromChunks(type, ...chunks) {
    const data = [];
    chunks.forEach(chunk => data.push.apply(data, chunk.data));
    return new ComputedData(type, data);
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


/**
 * Compute the CDF or CCDF of multi-criteria data.
 * 
 * @param {Array.<Column>} data all the columns to compute (C)CDF for
 * @param {number} partOffset index to start computation from
 * @param {number} partSize the size of the part to compute
 * @param {boolean} doCCDF set this to true to compute CCDF instead of CDF
 * 
 * @returns {Column} a column where the colName is either CDF or CCDF
 */
const computeCDF = (data, partOffset = 0, partSize = void 0, doCCDF = false) => {
  if (Object.prototype.toString.call(data) !== '[object Array]') {
    throw new Error(`Data must be an array of Column-objects.`);
  }
  if (data.length === 0 || data.filter(col => {
    return !col || !col.hasOwnProperty('colName') || !col.hasOwnProperty('data')
      || Object.prototype.toString.call(col.data) !== '[object Array]'
      || col.data.length === 0
  }) > 0) {
    throw new Error(`One or more columns were empty or not properly defined.`);
  }
  const length = data[0].data.length;
  if (data.filter(col => col.data.length !== length) > 0) {
    throw new Error(`Not all columns are of equal length (${length}).`);
  }

  if (partSize === void 0) {
    partSize = length - partOffset;
  }
  const idxUntil = partOffset + partSize;
  if (partOffset > idxUntil || partOffset > (length - 1) || idxUntil > length) {
    throw new Error(`The indexes [${partOffset},${idxUntil}) are out of range.`);
  }



  /** @type {Object.<string, Array.<EntityData>>} */
  const colsSorted = {};
  data.forEach(column => {
    colsSorted[column.colName] =
      column.data.sort((a, b) => a.id.localeCompare(b.id));
  });

  const colNames = Object.keys(colsSorted);

  /**
   * @param {number} idx index of the row to get from sorted data
   * @returns {Array.<number>} where each value corresponds to one column.
   * This array always has the same deterministic order.
   */
  const getRow = idx => colNames.map(colName => colsSorted[colName][idx].val);

  const countRows = idx => {
    let count = 0;
    const row = getRow(idx);
    for (let i = 0; i < length; i++) {
      if (i === idx) { continue; }
      let failed = false;
      const checkRow = getRow(i);

      for (let j = 0; j < row.length; j++) {
        /**
         * Here we flip requirements:
         * - CDF requires a value less than or equal.
         *   - So if the value is greater, we continue
         * - CCDF requires a value greater than
         *   - So if the value is less than or equal, we continue
         */
        if ((doCCDF && checkRow[j] <= row[j]) || (!doCCDF && checkRow[j] > row[j])) {
          failed = true;
          break;
        }
      }

      // If early fail, we will not have passed by this statement.
      if (!failed) {
        count++;
      }
    }

    return count;
  };

  /* Now let's do the computation. For each row within range, we do the CDF
   * or CCDF calculation.
   */
  /** @type {Column}  */
  const result = { colName: doCCDF ? 'CCDF' : 'CDF', data: [] };
  for (; partOffset < idxUntil; partOffset++) {
    result.data.push({
      id: colsSorted[colNames[0]][partOffset].id,
      val: countRows(partOffset) / length
    });
  }

  return result;
};


export {
  Enum_Computation_Types,
  ComputedData,
  computeCDF
};