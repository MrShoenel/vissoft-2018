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

    var mb = d3.forceManyBody().strength(-100);

    var force = d3.forceSimulation(this._testJson.nodes)
      .force('charge', mb)
      .force('link', d3.forceLink(this._testJson.links))
      .force('center', d3.forceCenter(width / 2, height / 2));

    var svg = document.querySelector('#foo-svg') ?
      d3.select('#foo-svg') : d3.select("#graph-div").append("svg:svg")
      .attr('id', 'foo-svg')
      // .attr('style', 'transform:rotate(90deg)')
      .attr("width", width)
      .attr("height", height)
      .call(d3.zoom().scaleExtent([.5, 2]).on('zoom', () => {
        svg.attr('transform', d3.event.transform);
      }))

    var gLink = svg.append('g');
    var gNode = svg.append('g');




    let ranAlready = false;
    const update = data => {
      force.nodes(data.nodes);
      force.force('link').links(data.links);
      force.force('charge').initialize(data.nodes);

      var link = gLink.selectAll("line")
        .data(data.links);

      link.attr('class', 'update');

      // Update old, then

      // Create new:
      link.enter()
        .append("line")
        .attr('class', 'enter')
        .style('stroke', 'rgb(0,0,0')
        .merge(link);
      
      link.exit().remove();


      

      var node = gNode.selectAll("circle")
        .data(data.nodes);
      
      node.attr('class', 'update');

      node
        .enter()
        .append("circle")
        .attr('class', 'enter')
        .attr("r", radius - .75)
        .style("fill", function(d) { return fill(d.group); })
        .style("stroke", function(d) { return d3.rgb(fill(d.group)).darker(); })
        .merge(node);

      node.exit().remove();

      force.alpha(ranAlready ? .5 : 1);
      force.restart();
      ranAlready = true;
    };

    force.on("tick", () => {
      var k = 10 * force.alpha();

      // Push sources up and targets down to form a weak tree.
      gLink.selectAll("line")
        // .each(function(d) { d.source.y -= k, d.target.y += k; })
        .each(function(d) { d.target.x -= k, d.source.x += k; })
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

      gNode.selectAll("circle")
        .attr("cx", function(d) { return Math.max(5, Math.min(d.x, width - 5)); })
        .attr("cy", function(d) { return Math.max(5, Math.min(d.y, width - 5)); });
    });

    setTimeout(() => {
      this._testJson.nodes.push({name:'xx'});
      this._testJson.links.push({source:0, target:7});
      update(this._testJson);

      setTimeout(() => {
        this._testJson.links.splice(6,1);
        update(this._testJson);
      }, 2000);
    }, 2500);

    update(this._testJson);
  };
};


// class ModelToGraphConverter {
//   constr
// };


export {
  GraphEvent,
  GridboxGraph
};