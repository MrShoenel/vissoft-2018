import { Dataset } from "./Dataset.js";
import { ComputedData, Enum_Computation_Types, compute } from './ComputedData.js';

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
 * @property {Array.<JsonModelNode>} model
 */




class ModelNode {
  /**
   * @param {Dataset} dataset 
   * @param {JsonModelNode} node
   */
  constructor(dataset, node) {
    this.name = node.name;

    /** @type {Array.<ModelNode>} */
    this._children = [];

    /** @type {Array.<ModelNode>} */
    this._parents = [];

    /** @type {Object.<string, Array.<ComputedData>>} */
    this._states = {};

    this.isMetric = node.useColumn && dataset.hasColumn(node.name);
    this.isAggregate = !this.isMetric;

    if (this.isMetric) {
      // Compute all types of data based on the metrics
      this._states[this.state] = Object.keys(ComputedData.types).map(key => {
        return new ComputedData(ComputedData.types[key], dataset.getColumn(node.name));
      });
    }
  };
  
  /**
   * 
   * @param {Symbol} type 
   * @returns {Array.<ComputedData>}
   */
  getComputedData(type = void 0) {
    if (!this.hasState(this.state)) {
      throw new Error(`The current state (${this.state}) is not computed!`);
    }

    const arr = this._states[this.state];
    if (typeof type === 'symbol') {
      return arr.filter(cd => cd.type === type);
    }
    return arr;
  };

  /**
   * Returns a string that represents the state of this node within its tree. That is,
   * its configuration w.r.t. its children and their children (recursively).
   * 
   * @returns {string}
   */
  get state() {
    return `[${this.name}]--{${this._children.sort((c1, c2) => c1.name.localeCompare(c2.name)).map(c => c.state).join(';')}}`;
  };

  /**
   * 
   * @param {string} stateId 
   * @returns {boolean}
   */
  hasState(stateId) {
    return this._states.hasOwnProperty(stateId);
  };

  async recompute() {
    const currentState = this.state;

    // Depth first: Recompute all children, then this node:
    await Promise.all(this._children.map(c => c.recompute()));

    // Now this node:
    if (!this.hasState(currentState)) {
      // This node does not have
      const childData = this._children.map(c => c.getComputedData());
      const p = new Parallel(Object.keys(ComputedData.types).map(k => {
        return {
          symbol: k,
          data: childData.map(cdcd => {
            const idx = cdcd.findIndex(cd => cd.type === ComputedData.types[k]);
            return cdcd[idx].data;
          })
        };
      }));
      
      const rawResult = await p.map(compute);
      this._states[currentState] = [];
      
      for (const raw of rawResult) {
        this._states[currentState].push(new ComputedData(
          Enum_Computation_Types[raw.symbol],
          raw.result
        ));
      }
    }

    return this;
  };

  /**
   * @param {ModelNode} node The node to add (or its name)
   * @returns {this}
   */
  addChild(node) {
    return this._add(node, this._children);
  };

  /**
   * @param {ModelNode} node The node to add (or its name)
   * @returns {this}
   */
  addParent(node) {
    return this._add(node, this._parents);
  };

  /**
   * @param {string|ModelNode} nodeOrName The node to remove (or its name)
   * @returns {this}
   */
  removeChild(nodeOrName) {
    return this._remove(nodeOrName, this._children);
  };

  /**
   * @param {string|ModelNode} nodeOrName The node to remove (or its name)
   * @returns {this}
   */
  removeParent(nodeOrName) {
    return this._remove(nodeOrName, this._parents);
  };

  /**
   * @param {ModelNode} node The node to add
   * @param {Array.<ModelNode>} arr the array to add the node to
   * @returns {this}
   */
  _add(node, arr) {
    const idx = arr.findIndex(n => n.name === node.name);
    if (idx >= 0) {
      throw new Error(`The node with the name '${node.name}' is already added.`);
    }
    arr.push(node);
    return this;
  };

  /**
   * @param {string|ModelNode} nameOrNode The node to remove (or its name)
   * @param {Array.<ModelNode>} arr the array to remove the node from
   * @returns {this}
   */
  _remove(nameOrNode, arr) {
    const search = nameOrNode instanceof ModelNode ? nameOrNode.name : nameOrNode;
    const idx = arr.findIndex(n => n.name === search);
    if (idx < 0) {
      throw new Error(`Cannot remove node with name '${search}' (not found).`);
    }
    arr.splice(idx, 1);
    return this;
  };
};


export { ModelNode };