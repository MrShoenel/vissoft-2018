import * as typedefs from './typedefs.js';

// Cannot import crossfilter normally due to the fact that 'dc-canvas' was built with browserify as
// a bundle with outdated dependencies. Not sure if there is a better way to do this?
const crossfilter = require('dc-canvas').crossfilter;

/**
 * This class will load an entire dataset and the Model.
 */
class Dataset {
  /**
   * @param {CSVNumericData|d3.DSVParsedArray.<d3.DSVRowString>} data The data as returned by d3.csv(..)
   * @param {JsonModel} model The model for the data
   */
  constructor(data, model) {
    this.data = data;
    this.model = model;
    this.entityIdColumn = model.entityId.generateColName;

    for (const row of data) {
      this.computeEntityId(row);
    }

    // Notice that no dimensions are created for now; they will be created on demand later.
    this.crossfilter = crossfilter(this.data);
  };

  /**
   * 
   * @param {d3.DSVRowString} rowString 
   * @returns {string}
   */
  computeEntityId(rowString) {
    rowString[this.entityIdColumn] = this.model.entityId.from.map(
      f => rowString[f]).join('-');
  };

  /**
   * @returns {Array.<string>}
   */
  get columns() {
    return this.data.columns;
  };

  /**
   * @returns {number}
   */
  get length() {
    return this.data.length;
  };

  /**
   * @param {string} colName
   * @returns {Column}
   */
  getColumn(colName) {
    if (!this.hasColumn(colName)) {
      throw new Error(`The column '${colName}' is not known.`);
    }

    return {
      colName,
      data: this.data.map(d => {
        return {
          id: d[this.entityIdColumn],
          val: d[colName]
        };
      })
    };
  };

  /**
   * @param {string} name
   * @returns {boolean}
   */
  hasColumn(name) {
    return this.columns.findIndex(c => c === name) >= 0;
  };

  static async fromDataAndQm(pathToData, pathToQm) {
    return new Dataset(...(await Promise.all([
      d3.csv(pathToData),
      fetch(pathToQm).then(val => val.json())
    ])));
  };
};


export {
  Dataset
};