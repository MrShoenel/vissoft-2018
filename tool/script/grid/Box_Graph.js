import * as typedefs from '../typedefs.js';

import { LoadEvent } from './Box_Header.js';
import { Dataset } from '../Dataset.js';
import { Model } from '../Model.js';



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

    dataObservable.subscribe(evt => {
      this.dataset = evt.dataset;
      this.model = evt.model;

      // Initially, nothing is selected
      this._emitEvent(new GraphEvent('selection', this._selection));
      this._testGraph();
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



  _testGraph() {
    this._testJson = this._testJson || {
      "nodes": [
        {"name": "d3"},
        {"name": "d3.svg"},
        {"name": "d3.svg.area"},
        {"name": "d3.svg.line"},
        {"name": "d3.scale"},
        {"name": "d3.scale.linear"},
        {"name": "d3.scale.ordinal"}
      ],
      "links": [
        {"source": 0, "target": 1},
        {"source": 1, "target": 2},
        {"source": 1, "target": 3},
        {"source": 0, "target": 4},
        {"source": 4, "target": 5},
        {"source": 4, "target": 6}
      ]
    };

    var width = 600,
      height = 600,
      radius = 6;


    var fill = d3.scaleOrdinal(
      ["#A07A19", "#AC30C0", "#EB9A72", "#BA86F5", "#EA22A8"]);

    var mb = d3.forceManyBody().strength(-120).distanceMin(30);

    var force = d3.forceSimulation(this._testJson.nodes)
      .force('charge', mb)
      .force('link', d3.forceLink(this._testJson.links))
      .force('center', d3.forceCenter(width / 2, height / 2));

    var svg = document.querySelector('#foo-svg') ?
      d3.select('#foo-svg') : d3.select("#graph-div").append("svg:svg")
      .attr('id', 'foo-svg')
      .attr('style', 'transform:rotate(90deg)')
      .attr("width", width)
      .attr("height", height);

    var link = svg.selectAll("line")
      .data(this._testJson.links)
      .enter().append("line").style('stroke', 'rgb(0,0,0');

    var node = svg.selectAll("circle")
      .data(this._testJson.nodes)
      .enter().append("circle")
      .attr("r", radius - .75)
      .style("fill", function(d) { return fill(d.group); })
      .style("stroke", function(d) { return d3.rgb(fill(d.group)).darker(); });

    force.on("tick", () => {
      var k = 6 * force.alpha();

      // Push sources up and targets down to form a weak tree.
      link
        .each(function(d) { d.source.y -= k, d.target.y += k; })
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

      node
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
    });
  };
};


// class ModelToGraphConverter {
//   constr
// };


export {
  GraphEvent,
  GridboxGraph
};