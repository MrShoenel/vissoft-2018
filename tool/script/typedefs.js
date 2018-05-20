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
 * @property {number} [x] an optional x-coordinate
 * @property {number} [y] an optional y-coordinate
 */

/**
 * @typedef JsonModelLayout
 * @type {Object}
 * @property {number} translateX
 * @property {number} translateY
 * @property {number} scale
 */

/**
 * @typedef JsonModel
 * @type {Object}
 * @property {{ generateColName: string, from: Array.<string>}} entityId
 * @property {Array.<JsonModelNode>} model
 * @property {JsonModelLayout} modelLayout
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


/**
 * @typedef Range
 * @type {Object}
 * @property {number} start
 * @property {number} length
 */


/**
 * @typedef ModelLayoutOptions
 * @type {Object}
 * @property {number} width
 * @property {number} height
 * @property {number} nodeW
 * @property {number} nodeH
 * @property {number} nodeVSpace
 * @property {number} nodeHSpace
 * @property {number} layerSpace
 */

/**
 * @typedef Point
 * @type {Object}
 * @param {number} x
 * @param {number} y
 */

/**
 * @typedef Edge
 * @type {Object}
 * @template T
 * @property {T} from
 * @property {T} to
 */

/**
 * @typedef Link
 * @type {Object}
 * @property {number} source
 * @property {number} target
 */