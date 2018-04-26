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
 * @property {boolean} useColumn
 * @property {Array.<CSVColumn|JsonModelNode>} sources
 */

/**
 * @typedef JsonModel
 * @type {Object}
 * @property {{ generateColName: string, from: Array.<string>}} entityId
 * @property {Array.<JsonModelNode>} model
 */


/**
 * @typedef EntityData
 * @type {Object}
 * @property {string} id
 * @property {number} val
 */


/**
 * @typedef Column
 * @type {Object}
 * @property {string} colName
 * @property {Array.<EntityData>} data
 */
