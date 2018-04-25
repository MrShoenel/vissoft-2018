/**
 * There is also DSVParsedArray and DSVRowString in d3 but we use this:
 * @typedef CSVNumericData
 * @type {Array.<Object.<string, number>>}
 */

/**
 * @typedef CSVColumn
 * @type {string}
 */

/**
 * @typedef JsonModelNode
 * @type {Object}
 * @property {string} name
 * @property {Array.<CSVColumn|JsonModelNode>} sources
 */

/**
 * @typedef JsonModel
 * @type {Object}
 * @property {Array.<JsonModelNode>} model
 */


/**
 * Used when the Dataset emits some kind of event.
 */
class DatasetEvent {
  constructor(dataset) {
    this.dataset = dataset;
  };
};

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

    /** @type {Array.<Rx.Observer.<DatasetEvent>>} */
    this._observers = [];
  };

  /**
   * @returns {Array.<string>}
   */
  get columns() {
    return this.data.columns;
  };

  /**
   * @param {string} colName
   * @returns {Array.<number>}
   */
  getColumn(colName) {
    if (!this.hasColumn(colName)) {
      throw new Error(`The column '${colName}' is not known.`);
    }
    return this.data.map(d => d[colName]);
  };

  /**
   * @param {string} name
   * @returns {boolean}
   */
  hasColumn(name) {
    return this.columns.findIndex(c => c === name) >= 0;
  };

  /**
   * @param {DatasetEvent} event The DatasetEvent to emit to all observers
   */
  _emitEvent(event) {
    this._observers.forEach(obs => obs.onNext(event));
  };

  /**
   * @param {(value: DatasetEvent) => void} onNext
   * @param {(exception: any) => void} onError
   * @returns {Rx.Observer.<DatasetEvent>}
   */
  subscribe(onNext, onError = void 0) {
    const obs = Rx.Observer.create(onNext, onError);
    this._observers.push(obs);
    return obs;
  };

  static async fromDataAndQm(pathToData, pathToQm) {
    return new Dataset(...(await Promise.all([
      d3.csv(pathToData),
      fetch(pathToQm).then(val => val.json())
    ])));
  };
};


export {
  DatasetEvent,
  Dataset
};