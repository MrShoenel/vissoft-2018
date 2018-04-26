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
 * @property {Array.<string>} entityId
 * @property {Array.<JsonModelNode>} model
 */


const Enum_Event_Types = Object.freeze({
  /**
   * When emitted, the corresponding value is in the range [0,1]
   */
  Progress: 'Progress'
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
  constructor(dataset) {
    /** @type {Object.<string, ModelNode>} */
    this.allNodes = {};

    /** @type {Array.<Rx.Observer.<ModelEvent>>} */
    this._observers = [];

    this._initAllNodes(dataset);
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
   * @param {(value: ModelEvent) => void} onNext
   * @param {(exception: any) => void} onError
   * @returns {Rx.IDisposable|Rx.Observer.<ModelEvent>}
   */
  subscribe(onNext, onError = void 0) {
    const obs = Rx.Observer.create(onNext, onError);
    this._observers.push(obs);
    return obs;
  };

  /**
   * @param {Rx.IDisposable|Rx.Observer.<ModelEvent>} subscriber 
   */
  unsubscribe(subscriber) {
    const idx = this._observers.findIndex(o => o === subscriber);
    if (idx < 0) {
      throw new Error(`The subscriber is not currently known.`);
    }
    this._observers.splice(idx, 1);
    subscriber.dispose();
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
    this._emitEvent(new ModelEvent(this, Enum_Event_Types.Progress, 0))

    Object.keys(this.allNodes).map(key => this.allNodes[key]).forEach(node => {
      const costBefore = node.recomputeCost;
      const obs = node.subscribe(evt => {
        if (evt.type === Enum_Event_Types.Progress) {
          if (evt.data === 1) {
            // node is done!
            costDone += costBefore;
            node.unsubscribe(obs);
            this._emitEvent(new ModelEvent(
              this, Enum_Event_Types.Progress, costDone / totalCost));
          }
        }
      });
    });

    for (const rootNode of this.rootNodes) {
      await rootNode.recompute();
    }
  };

  /**
   * @param {(string?, ...optionalParams: Array) => any} fn 
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
};


export {
  Enum_Event_Types,
  Model,
  ModelEvent
};