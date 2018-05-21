import * as typedefs from './typedefs.js';
import { ModelNode } from './ModelNode.js';

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
   * @param {string} [dataSource] A string representing the source where the
   * data came from
   * @param {string} [modelSource] A string representing the source where the
   * model came from
   */
  constructor(data, model, dataSource = '', modelSource = '') {
    this.data = data;
    this.model = model;
    this.dataSource = dataSource;
    this.modelSource = modelSource;

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

  /**
   * 
   * @param {string} name 
   */
  addNewNode(name) {
    const newNode = new ModelNode(this, {
      name: name,
      useColumn: false,
      sources: [],
      x: 1,
      y: 1
    });

    this.model.model.push(newNode.node);
    return newNode; // To be added to an instance of Model
  };

  /**
   * Load a Dataset from stringified data.
   * 
   * @param {string} csvString the CSV-data as string
   * @param {string} jsonQmString the QM's JSON as string
   */
  static fromDataStringAndQmJson(csvString, jsonQmString) {
    return new Dataset(
      d3.csvParse(csvString),
      JSON.parse(jsonQmString)
    );
  };

  /**
   * Load a Dataset from files that are hosted from within
   * the application.
   * 
   * @param {string} pathToData a relative HTTP-path to
   * a file containing CSV-data
   * @param {string} pathToQm a relative HTTP path to a
   * file containing a QM-model as JSON
   */
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