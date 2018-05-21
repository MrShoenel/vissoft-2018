import * as typedefs from './typedefs.js';
import { Dataset } from './Dataset.js';
import { Enum_Event_Types } from './Model.js';
import { ComputedData, Enum_Computation_Types, computeCDF, partitionToRanges } from './ComputedData.js';



/**
 * 
 */
class ModelNodeEvent {
  /**
   * @template T a generic type to represent data associated with the event's type
   * @param {ModelNode} node the node this event was emitted from
   * @param {string} type a string to designate the type of this event
   * @param {T} data
   * @see {Enum_Event_Types}
   */
  constructor(model, type, data) {
    this.model = model;
    this.type = type;
    this.data = data;
  };
};


class ModelNode {
  /**
   * @param {Dataset} dataset 
   * @param {JsonModelNode} node
   */
  constructor(dataset, node) {
    this.dataset = dataset;
    this.length = dataset.length;
    this.node = node;
    this.name = node.name;
    this.desc = node.desc || '';
    this.id = sha1(this.name);

    /** @type {Array.<ModelNode>} */
    this._children = [];

    /** @type {Array.<ModelNode>} */
    this._parents = [];

    /** @type {Object.<string, Array.<ComputedData>>} */
    this._states = {};

    this.isMetric = node.useColumn && dataset.hasColumn(node.name);
    this.isAggregate = !this.isMetric;

    /** @type {Array.<Rx.Observer.<ModelNodeEvent>>} */
    this._observers = [];

    this._observable = Rx.Observable.create(observer => {
      this._observers.push(observer);
      const oldDispose = observer.dispose;
      observer.dispose = () => {
        this._unsubscribe(observer);
        oldDispose.call(observer);
      };
    });
  };

  /**
   * @param {ModelNodeEvent} event the ModelNodeEvent to emit to all observers
   */
  _emitEvent(event) {
    this._observers.forEach(obs => obs.onNext(event));
  };

  /**
   * Can be called directly but it is recommended to call dispose()
   * on the Observer/Subscription.
   * 
   * @param {Rx.IDisposable|Rx.Observer.<ModelNodeEvent>} subscriber 
   */
  _unsubscribe(subscriber) {
    const idx = this._observers.findIndex(o => o === subscriber);
    if (idx < 0) {
      throw new Error(`The subscriber is not currently known.`);
    }
    this._observers.splice(idx, 1);
  };

  /**
   * Obtain the Observable for this ModelNode that emits ModelNodeEvents.
   * This Observable never drains. To save resources, call dispose() on
   * obtained Observers, when not longer needed.
   * 
   * @returns {Rx.Observable.<ModelNodeEvent>}
   */
  get observable() {
    return this._observable;
  };
  
  /**
   * @see {Enum_Computation_Types}
   * @param {Symbol} type one of {Enum_Computation_Types}
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

  /**
   * @returns {boolean} true if this is an aggregation node without any
   * children. In that case, no CDF will be available.
   */
  get isEmptyAggregation() {
    return this.isAggregate && this._children.length === 0;
  };

  /**
   * @param {ModelNode} node 
   * @returns {boolean}
   */
  hasChild(node) {
    return this._children.find(n => n === node) instanceof ModelNode;
  };

  /**
   * Returns the cost of recomputing this node, expressed as worst-case
   * amount of operations, which is O=mn², with m being the number of
   * columns (here: children) and n being the number of rows. If this
   * node already has the current state, the returned cost is zero.
   * 
   * @returns {number} a positive integer
   */
  get recomputeCost() {
    if (this.hasState(this.state)) {
      return 0;
    }

    return this._children.length * this.length**2;
  };

  /**
   * @returns {number} the depth in the model's tree. Returns 0 if this
   * node is a metric.
   */
  get depth() {
    if (this.isMetric) {
      return 0;
    }

    return 1 + Math.max.apply(null, this._children.map(c => c.depth));
  };

  async _recomputeMetric() {
    const column = this.dataset.getColumn(this.name);
    const parallel = new Parallel([
      { column, cdf: true },
      { column, cdf: false }
    ], {
      maxWorkers: 2
    }).require({
      fn: computeCDF, name: computeCDF.name
    });

    const raw = await parallel.map(columnDesc => {
      return computeCDF(
        [columnDesc.column], 0, columnDesc.column.data.length, !columnDesc.cdf);
    });

    this._states[this.state] = raw.map(r => {
      return new ComputedData(r.colName, r.data);
    });

    return this;
  };

  async _recomputeAggregate() {
    if (this._children.length === 0) {
      // Then this node is an aggregation without any current children
      // (free floating). So we cannot compute anything.
      this._states[this.state] = [];
      return;
    }

    // Depth first: Recompute all children, then this node:
    for (const child of this._children) {
      await child.recompute();
    }

    // We need to transform the children's data to Column-objects
    const childData_CDF = this._children.map(
      c => {
        return /** @type {Column} */ {
          colName: c.name,
          data: c.getComputedData(Enum_Computation_Types.CDF)[0].data
        };
      });
    // const childData_CCDF = this._children.map(
    //   c => {
    //     return /** @type {Column} */ {
    //       colName: c.name,
    //       data: c.getComputedData(Enum_Computation_Types.CCDF)[0].data
    //     };
    //   });

    // In this method, we parallelize over the rows. Every worker will do
    // a computation for one chunk of CDF and one chunk of CCDF.
    const ranges = partitionToRanges(
      childData_CDF[0].data.length, navigator.hardwareConcurrency || 4);
    
    const parallel = new Parallel(ranges.map(range => {
      return {
        childData_CDF,
        // childData_CCDF,
        range
      }
    }), {
      maxWorkers: ranges.length
    }).require({
      fn: computeCDF, name: computeCDF.name
    });

    const raw = await parallel.map(rangeObj => {
      const cdfChunk = computeCDF(
        rangeObj.childData_CDF, rangeObj.range.start, rangeObj.range.length, false);
      // const ccdfChunk = computeCDF(
      //   rangeObj.childData_CCDF, rangeObj.range.start, rangeObj.range.length, true);

      return { cdfChunk, /*ccdfChunk*/ };
    });


    // Now we have to merge the chunks into one ComputedData:
    this._states[this.state] = [
      ComputedData.fromChunks(
        Enum_Computation_Types.CDF, ...raw.map(r => r.cdfChunk)),
      // ComputedData.fromChunks(
      //   Enum_Computation_Types.CCDF, ...raw.map(r => r.ccdfChunk))
    ];

    return this;
  };

  async recompute() {
    const currentState = this.state;

    // Now this node:
    if (!this.hasState(currentState)) {
      if (this.isMetric) {
        await this._recomputeMetric();
      } else {
        await this._recomputeAggregate();
      }

      this._emitEvent(new ModelNodeEvent(this, Enum_Event_Types.Progress, 1));
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


export {
  ModelNode,
  ModelNodeEvent
};