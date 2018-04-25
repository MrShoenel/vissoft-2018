import { Dataset } from './Dataset.js';
import { ModelNode } from './ModelNode.js';


/**
 * @typedef JsonModelNode
 * @type {Object}
 * @property {string} name
 * @property {boolean} isColumn
 * @property {Array.<string>} sources
 */

/**
 * @typedef JsonModel
 * @type {Object}
 * @property {Array.<JsonModelNode>} model
 */


class Model {
  /**
   * @param {Dataset} dataset 
   */
  constructor(dataset) {
    /** @type {Object.<string, ModelNode>} */
    this.allNodes = {};

    this._initAllNodes(dataset);
  };

  /**
   * @returns {Array.<ModelNode>} all nodes that do not have any parents (thus rootnodes)
   */
  get rootNodes() {
    return Object.keys(this.allNodes)
      .map(key => this.allNodes[key])
      .filter(n => n._parents.length === 0 && n.isAggregate);
  };

  async recompute() {
    for (const rootNode of this.rootNodes) {
      await rootNode.recompute();
    }
  };

  print() {
    let indent = 1;

    /** @param {Array.<ModelNode>} nodes */
    const walk = nodes => {
      nodes.forEach(node => {
        console.log(`${Array(indent).join('  ')}|- ${node.name}`);
        if (node._children.length > 0) {
          indent++;
          walk(node._children);
        }
        if (nodes.indexOf(node) === nodes.length - 1) {
          indent--;
        }
      })  
    };

    walk(this.rootNodes);
  };

  /**
   * @param {Dataset} dataset 
   */
  _initAllNodes(dataset) {
    const model = dataset.model.model;
    const hop = n => this.allNodes.hasOwnProperty(n);

    for (const jNode of model) {
      if (hop(jNode.name)) {
        throw new Error(`Duplicate node in model: '${jNode.name}'!`);
      }
      this.allNodes[jNode.name] = new ModelNode(dataset, jNode);
    }

    for (const jNode of model) {
      const parent = this.allNodes[jNode.name];
      for (const source of jNode.sources) {
        if (!hop(source)) {
          throw new Error(`Cannot connect to source '${source}' (not found)!`);
        }
        this.addEdge(this.allNodes[source], parent);
      }
    }
  };

  /**
   * 
   * @param {ModelNode} fromChildNode 
   * @param {ModelNode} toParentNode 
   */
  addEdge(fromChildNode, toParentNode) {
    fromChildNode.addParent(toParentNode);
    toParentNode.addChild(fromChildNode);
  };

  /**
   * 
   * @param {ModelNode} fromChildNode 
   * @param {ModelNode} toParentNode 
   */
  removeEdge(fromChildNode, toParentNode) {
    fromChildNode.removeParent(toParentNode);
    toParentNode.removeChild(fromChildNode);
  };
};


export {
  Model
};