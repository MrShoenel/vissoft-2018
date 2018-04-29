import * as typedefs from '../typedefs.js';

import { LoadEvent } from './Box_Header.js';
import { Dataset } from '../Dataset.js';
import { Model } from '../Model.js';
import { ModelNode } from '../ModelNode.js';



class GraphEvent {
  /**
   * This class is propagated when the graph changed.
   * 
   * @template T the type of data
   * @param {'selection'|'links'|'nodeDisabled'|'nodeEnabled'} type the type
   * of the event that occurred
   * @param {T} data the data associated with the event
   */
  constructor(type, data) {
    this.type = type;
    this.data = data;
  };
};


class GridboxGraph {
  /**
   * @param {Rx.Observable.<LoadEvent>} dataObservable 
   */
  constructor(dataObservable) {
    /** @type {Array.<Rx.Observer.<GraphEvent>>} */
    this._observers = [];

    /** @type {Array.<string>} the IDs pf selected entities */
    this._selection = [];

    this._observable = Rx.Observable.create(observer => {
      this._observers.push(observer);
      const oldDispose = observer.dispose;
      observer.dispose = () => {
        this._unsubscribe(observer);
        oldDispose.call(observer);
      };
    });

    this.graphDiv = document.querySelector('div#graph-div');

    const dbgBtn = document.querySelector('button#debug-select');
    dataObservable.subscribe(evt => {
      this.dataset = evt.dataset;
      this.model = evt.model;

      // Initially, nothing is selected
      this._emitEvent(new GraphEvent('selection', this._selection));
      this._initGraph();
      dbgBtn.removeAttribute('disabled');
    });

    // @RAFAEL: I added this now so that you can build up the t-SNE while
    // I can improve the graph (esp. showing the distributions)
    dbgBtn.addEventListener('click', () => {
      this._emitEvent(new GraphEvent('selection', this.dataset.data.sort((a,b) => Math.random() > .5 ? 1 : -1).slice(-100).map(d => {
        return d[this.dataset.entityIdColumn];
      })));
    });
  };

  /**
   * @param {LoadEvent} event the LoadEvent to emit to all observers
   */
  _emitEvent(event) {
    this._observers.forEach(obs => obs.onNext(event));
  };

  /**
   * Can be called directly but it is recommended to call dispose()
   * on the Observer/Subscription.
   * 
   * @param {Rx.IDisposable|Rx.Observer.<LoadEvent>} subscriber 
   */
  _unsubscribe(subscriber) {
    const idx = this._observers.findIndex(o => o === subscriber);
    if (idx < 0) {
      throw new Error(`The subscriber is not currently known.`);
    }
    this._observers.splice(idx, 1);
  };

  /**
   * Obtain the Observable for this ModelNode that emits GraphEvent.
   * This Observable never drains. To save resources, call dispose() on
   * obtained Observers, when not longer needed.
   * 
   * @returns {Rx.Observable.<GraphEvent>}
   */
  get observable() {
    return this._observable;
  };


  _initGraph() {
    const options = {
      height: this.graphDiv.offsetHeight,
      width: this.graphDiv.offsetWidth,
      layerSpace: 20,
      nodeW: 60,
      nodeH: 60,
      nodeHSpace: 60,
      nodeVSpace: 15
    };
    const ml = new ModelLayout(this.model, options);

    const modelNodes = ml.calculate();

    var svg = d3.select("#graph-div").append("svg:svg")
      .attr('id', 'foo-svg')
      .attr("width", options.width)
      .attr("height", options.height);

    const rootG = svg.append('g');

    var gLink = rootG.append('g');
    var gNode = rootG.append('g');

    gNode.selectAll('rect')
      .data(modelNodes)
      .enter()
      .append('g')
      .append('rect')
      .attr('width', options.nodeW)
      .attr('height', options.nodeH)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('style', 'fill:gray;stroke:black;stroke-width:2;fill-opacity:1;stroke-opacity:0.9');

    gNode.selectAll('g')
      .append('text')
      .attr('fill', 'white')
      .attr('x', d => d.x)
      .attr('y', d => d.y + 20)
      .attr('font-size', 10)
      .text(d => d.modelNode.name);

    // Set the zoom so that the whole tree is visible:
    rootG.attr('transform', `scale(${options.height / ml.totalHeight})`);
    svg.call(d3.zoom().scaleExtent([options.height / ml.totalHeight, 5]).on('zoom', () => {
      rootG.attr('transform', d3.event.transform);
    }));



    const lineGen = d3.line().curve(d3.curveCardinal);
    gLink.selectAll('path')
      .data(ml.allEdges)
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('d', d => {
        return lineGen([
          [d.from.center.x, d.from.center.y],[d.to.center.x, d.to.center.y]
        ]);
      });
  };
};



class ModelVizNode {
  /**
   * 
   * @param {ModelNode} modelNode 
   * @param {ModelLayout} layout
   */
  constructor(modelNode, layout) {
    this.modelNode = modelNode;
    this.layout = layout;
    this.x = 0;
    this.y = 0;
  };

  /**
   * @returns {Point}
   */
  get center() {
    return {
      x: this.x + .5 * this.layout.options.nodeW,
      y: this.y + .5 * this.layout.options.nodeH
    };
  };
};

class ModelVizLayer {
  constructor(layerId) {
    this.layerId = `${layerId}`;
    /** @type {Array.<ModelVizNode>} */
    this.nodes = [];
  };

  /**
   * @param {ModelVizNode} node
   */
  addNode(node) {
    this.nodes.push(node);
  };

  /**
   * @param {ModelLayoutOptions} options
   * @returns {this}
   */
  alignNodes(options) {
    // horizontal alignment:
    this.nodes.forEach((node, idx) => {
      const d = node.modelNode.depth;
      node.x = d * (options.layerSpace + options.nodeW + options.nodeHSpace);

      // TODO: Improve this
      node.y = idx * (options.nodeH + options.nodeVSpace);
    });

    return this;
  };

  /**
   * @param {ModelLayoutOptions} options
   * @returns {number}
   */
  getTotalHeight(options) {
    return this.nodes.length === 0 ? 0 :
      this.nodes.length * (options.nodeH + options.nodeVSpace) - options.nodeVSpace;
  };

  /**
   * @param {number} totalHeight
   * @param {ModelLayoutOptions} options
   * @returns {this}
   */
  vCenterNodes(totalHeight, options) {
    const remainingSpace = .5 * (totalHeight - this.getTotalHeight(options));

    if (remainingSpace > 0) {
      this.nodes.forEach(n => n.y += remainingSpace);
    }

    return this;
  };
};


class ModelLayout {
  /**
   * @param {Model} model
   * @param {ModelLayoutOptions} options
   */
  constructor(model, options) {
    this.model = model;
    this.options = options;
  };

  /**
   * @returns {Array.<ModelVizNode>} an array that contains all ModelVizNodes
   */
  calculate() {
    /** @type {ModelVizLayer} */
    this.rootLayer = new ModelVizLayer(0);

    /** @type {Object.<string, ModelVizLayer>} */
    this.aggLayers = {};

    this.model.allNodesArray.forEach(node => {
      if (node.isMetric) {
        this.rootLayer.addNode(new ModelVizNode(node, this));
      } else {
        // put the node in the right horizontal layer
        const depthKey = `${node.depth}`;
        if (!this.aggLayers.hasOwnProperty(depthKey)) {
          this.aggLayers[depthKey] = new ModelVizLayer(node.depth);
        }
        this.aggLayers[depthKey].addNode(new ModelVizNode(node, this));
      }
    });


    this.allLayers.forEach(layer => {
      layer.alignNodes(this.options);
    });
    this.allLayers.forEach(l => {
      l.vCenterNodes(this.totalHeight, this.options);
    });

    return this.allNodes;
  };

  get allLayers() {
    return [this.rootLayer].concat(Object.keys(this.aggLayers).map(k => this.aggLayers[k]));
  };

  /**
   * @returns {Array.<ModelVizNode>}
   */
  get allNodes() {
    /** @type {Array.<ModelVizNode>} */
    const allNodes = [];
    this.allLayers.forEach(layer => {
      allNodes.push.apply(allNodes, layer.nodes);
    });
    return allNodes;
  };

  get totalHeight() {
    return Math.max.apply(null,
      this.allLayers.map(l => l.getTotalHeight(this.options)));
  };

  get allEdges() {
    const allNodes = this.allNodes;

    const findVizNode = node => {
      return allNodes[allNodes.findIndex(n => n.modelNode === node)];
    };

    return this.model.edges.map(edge => {
      return {
        from: findVizNode(edge.from),
        to: findVizNode(edge.to)
      };
    })
  };
};


// class ModelToGraphConverter {
//   constr
// };


export {
  GraphEvent,
  GridboxGraph
};