import * as typedefs from './typedefs.js';
import { Dataset } from './Dataset.js';
import { ModelNode } from './ModelNode.js';




const Enum_Event_Types = Object.freeze({
  /**
   * When emitted, the corresponding value is in the range [0,1]
   */
  Progress: 'Progress',

  /**
   * When emitted, signals that the model needs to be re-computed.
   */
  RequiresRecompute: 'RequiresRecompute'
});


class ModelEvent {
  /**
   * @template T a generic type to represent data associated with the event's type
   * @param {Model} model the model this event was emitted from
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



class Model {
  /**
   * @param {Dataset} dataset 
   */
  constructor(dataset = void 0) {
    /** @type {Object.<string, ModelNode>} */
    this.allNodes = {};

    /** @type {Array.<Rx.Observer.<ModelEvent>>} */
    this._observers = [];

    if (dataset instanceof Dataset) {
      this.load(dataset);
    }
  };

  /**
   * @returns {Array.<ModelNode>}
   */
  get allNodesArray() {
    return Object.keys(this.allNodes).map(k => this.allNodes[k]);
  };

  /**
   * @returns {number} the maximum depth across all nodes
   */
  get maxDepth() {
    return Math.max(...this.allNodesArray.map(n => n.depth));
  };

  /**
   * Initializes this Model from the Dataset given. If this Model had
   * been initialized earlier, then its entire current state and all
   * associated nodes are discarded.
   * 
   * @param {Dataset} dataset 
   */
  load(dataset) {
    this.allNodes = {};

    this._observable = Rx.Observable.create(observer => {
      this._observers.push(observer);
      const oldDispose = observer.dispose;
      observer.dispose = () => {
        this._unsubscribe(observer);
        oldDispose.call(observer);
      };
    });

    this._initAllNodes(dataset);

    this._checkRecompute();

    return this;
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
   * @param {ModelEvent} event the ModelEvent to emit to all observers
   */
  _emitEvent(event) {
    this._observers.forEach(obs => obs.onNext(event));
  };

  /**
   * Can be called directly but it is recommended to call dispose()
   * on the Observer/Subscription.
   * 
   * @param {Rx.IDisposable|Rx.Observer.<ModelEvent>} subscriber 
   */
  _unsubscribe(subscriber) {
    const idx = this._observers.findIndex(o => o === subscriber);
    if (idx < 0) {
      throw new Error(`The subscriber is not currently known.`);
    }
    this._observers.splice(idx, 1);
  };

  /**
   * Will trigger an event if re-computation is required. Should be called
   * whenever the model is modified. The data of the event is the cost as number.
   */
  _checkRecompute() {
    if (this.needsRecompute) {
      this._emitEvent(new ModelEvent(this, Enum_Event_Types.RequiresRecompute, this.recomputeCost));
    }
  };

  /**
   * Obtain the Observable for this ModelNode that emits ModelEvent.
   * This Observable never drains. To save resources, call dispose() on
   * obtained Observers, when not longer needed.
   * 
   * @returns {Rx.Observable.<ModelEvent>}
   */
  get observable() {
    return this._observable;
  };

  /**
   * @returns {Array.<ModelNode>} all nodes that do not have any parents (thus rootnodes)
   */
  get rootNodes() {
    return Object.keys(this.allNodes)
      .map(key => this.allNodes[key])
      .filter(n => n._parents.length === 0 && n.isAggregate);
  };

  /**
   * @returns {boolean}
   */
  get needsRecompute() {
    return this.recomputeCost > 0;
  };

  /**
   * Returns the entire recomputation cost of the whole model, by aggregating
   * all children's cost.
   * 
   * @see {ModelNode::recomputeCost}
   * @return {number} a positive integer
   */
  get recomputeCost() {
    /** @type {ModelNode} node */
    const calcCost = node => {
      let cost = node.recomputeCost;
      if (node._children.length) {
        for (const child of node._children) {
          cost += calcCost(child);
        }
      }
      return cost;
    };

    return this.rootNodes.map(calcCost).reduce((n1, n2) => n1 + n2, 0);
  };

  async recompute() {
    const totalCost = this.recomputeCost;
    let costDone = 0;
    this._emitEvent(new ModelEvent(this, Enum_Event_Types.Progress, 0));

    this.allNodesArray.forEach(node => {
      const costBefore = node.recomputeCost;
      const obs = node.observable.subscribe(evt => {
        if (evt.type === Enum_Event_Types.Progress) {
          if (evt.data === 1) {
            // node is done!
            costDone += costBefore;
            this._emitEvent(new ModelEvent(
              this, Enum_Event_Types.Progress, costDone / totalCost));
            obs.dispose();
          }
        }
      });
    });

    for (const rootNode of this.rootNodes) {
      await rootNode.recompute();
    }
  };

  /**
   * @param {((string) => any)} fn 
   */
  print(fn = console.log) {
    let indent = 1;

    /** @param {Array.<ModelNode>} nodes */
    const walk = nodes => {
      nodes.forEach(node => {
        fn(`${Array(indent).join('  ')}|- ${node.name}`);
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
   * 
   * @param {ModelNode} node 
   */
  addNode(node) {
    this.allNodes[node.name] = node;
    this._checkRecompute();
    return this;    
  };

  /**
   * 
   * @param {ModelNode} fromChildNode 
   * @param {ModelNode} toParentNode 
   */
  addEdge(fromChildNode, toParentNode) {
    if (fromChildNode === toParentNode) {
      throw new Error('Parent and Child must not be the same node!');
    }
    if (toParentNode.hasChild(fromChildNode)) {
      throw new Error('The given Parent already has the given Child!');
    }
    if (fromChildNode.hasChild(toParentNode)) {
      throw new Error('There is already a connection from the given Child to the given Parent!');
    }
    if (toParentNode.isMetric) {
      throw new Error('You must not add a child to a data-node (metric)!');
    }

    fromChildNode.addParent(toParentNode);
    toParentNode.addChild(fromChildNode);

    this._checkRecompute();
  };

  /**
   * 
   * @param {ModelNode} fromChildNode 
   * @param {ModelNode} toParentNode 
   */
  removeEdge(fromChildNode, toParentNode) {
    if (!toParentNode.hasChild(fromChildNode)) {
      throw new Error('The given Parent does not have the given Child!');
    }

    fromChildNode.removeParent(toParentNode);
    toParentNode.removeChild(fromChildNode);

    this._checkRecompute();
  };

  /**
   * 
   * @param {ModelNode} node 
   * @returns {this}
   */
  removeNode(node) {
    node._children.slice(0).forEach(child => {
      this.removeEdge(child, node);
    });
    node._parents.slice(0).forEach(parent => {
      this.removeEdge(node, parent);
    });

    delete this.allNodes[node.name];
    return this;
  };

  /**
   * @returns {Array.<Edge.<ModelNode>>}
   */
  get edges() {
    const edges = [];
    this.allNodesArray.map(n => {
      return n._children.forEach(child => edges.push({ from: child, to: n }));
    });
    return edges
  };
};


export {
  Enum_Event_Types,
  Model,
  ModelEvent
};