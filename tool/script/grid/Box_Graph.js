import * as typedefs from '../typedefs.js';

import { LoadEvent } from './Box_Header.js';
import { Dataset } from '../Dataset.js';
import { Model, Enum_Event_Types } from '../Model.js';
import { ModelNode } from '../ModelNode.js';
import { GridboxStatus } from './Box_Status.js';


/**
 * OuterHtml Plug-In by Sebastian Hönel, Copyright 2012
 */
(function ($, undefined) {
  $.fn.outerHtml = function (html) {
    var e;

    if (html === undefined) { // getter
      if (this.length === 0) {
        return null; // standard behaviour
      }

      e = this[0]; // collection has > 0 elements, we use the first

      // Return the outer HTML of the first element in the set
      // regardless of how many may be in there. Try the native
      // outerHTML property first.
      if ('outerHTML' in e) {
        return e.outerHTML;
      }

      // Wrap a dummy node around the element and return its
      // inner Html by using jQuery's html()-method.
      return $(e.cloneNode(true)).wrap('<p/>').parent().html();
    }

    // used as setter, we can apply replaceWith()
    return this.replaceWith(html);
  };
}(jQuery));



class GraphEvent {
  /**
   * This class is propagated when the graph changed.
   * 
   * @template T the type of data
   * @param {'modelRecomputed'|'nodeSelected'|'edgeAdded'|'edgeRemoved'} type the type
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
   * @param {GridboxStatus} gbStatus
   */
  constructor(dataObservable, gbStatus) {
    this.gbStatus = gbStatus;
    this.btnExport = document.querySelector('button#btn-export-model');
    this.btnExport.addEventListener('click', () => this.export());
    this.btnExport.setAttribute('disabled', 'disabled');

    this.btnRecomp = document.querySelector('button#btn-recomp-model');
    this.btnRecomp.setAttribute('disabled', 'disabled');
    this.btnRecomp.addEventListener('click', async() => {
      this.btnRecomp.setAttribute('disabled', 'disabled');
      await this.recompute();
    });

    this.btnCreateNode = document.querySelector('button#create-node');
    this.btnCreateNode.addEventListener('click', () => {
      const $input = $('input#newnode-name');
      const newName = $input.val();
      const newNode = this.dataset.addNewNode(newName);
      $input.val('');

      this.model.addNode(newNode);
      this.graph.createGraph(false);

      this.gbStatus.logger(`Created new aggregate-node with name '${newName}'.`);
    });


    /** @type {Array.<Rx.Observer.<GraphEvent>>} */
    this._observers = [];

    this._observable = Rx.Observable.create(observer => {
      this._observers.push(observer);
      const oldDispose = observer.dispose;
      observer.dispose = () => {
        this._unsubscribe(observer);
        oldDispose.call(observer);
      };
    });

    dataObservable.subscribe(async evt => {
      this.dataset = evt.dataset;
      this.model = evt.model;
      this.model.observable.subscribe(evt => {
        if (evt.type === Enum_Event_Types.RequiresRecompute) {
          this.btnRecomp.removeAttribute('disabled');
        }
      });
      
      this.btnExport.removeAttribute('disabled');
      this.btnRecomp.removeAttribute('disabled');

      this._initGraph();
    });

    this.$graphDiv = $('div#graph-div');
    this.svgHeight = this.$graphDiv.height()
      - $('div#svg-controls').outerHeight();
    $('div#svg-wrapper').height(`${this.svgHeight}px`);
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
    const enableForce = this.model.allNodesArray.length > 0 &&
      !this.model.allNodesArray[0].node.hasOwnProperty('x');
    
    this.graph = new VisSoft2018Graph2(this);
    this.graph.createGraph(enableForce);
  };

  export() {
    // Make a copy of the current model and attach all information

    /** @type {JsonModel} */
    const copy = JSON.parse(JSON.stringify(this.dataset.model));

    const g = this.graph.$svg.find('g')[0],
      gTrans = /translate\((-?[\.0-9]+),(-?[\.0-9]+)\)/i.exec($(g).attr('transform'));
    copy.modelLayout = {
      scale: g.getBoundingClientRect().width / this.graph.$svg.width(),
      translateX: parseInt(gTrans[1], 10),
      translateY: parseInt(gTrans[2], 10)
    };

    this.graph.nodes.forEach(node => {
      const jmNode = copy.model.find(x => x.name === node.name);
      jmNode.x = Math.round(node.x);
      jmNode.y = Math.round(node.y);
    });


    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(copy, null, "\t")));
    element.setAttribute('download', `model-${+new Date}.json`);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  };

  /**
   * Broadcasts an event where data is an object with keys 'dataset' and
   * 'model' with their respective instances.
   */
  async recompute() {
    const start = +new Date;
    await this.model.recompute();
    this._emitEvent(new GraphEvent('modelRecomputed', {
      dataset: this.dataset,
      model: this.model
    }));

    this.gbStatus.logger(
      `Model is computed and up-2-date! Computation took ${(+new Date) - start}ms`);
    this.gbStatus.logger(
      `Model recomputation cost is: ${this.model.recomputeCost} (should be 0 now)`);
  };
};



class VisSoft2018Graph2 {
  /**
   * 
   * @param {GridboxGraph} gridBox 
   */
  constructor(gridBox) {
    const that = this;
    this.gridBox = gridBox;
    this.model = this.gridBox.model;

    this.$wrap = $('div#svg-wrapper');
    this.$zoomIndicator = $('span#zoom-indicator');
    this.$panel = $('div#zoom-panel');
    this.$innerPanel = $('div#zoom-inner');
    this.$aggNodes = $('select#aggregate-nodes');
    this.$edges = $('select#edges');
    this.$edgeFrom = $('select#edge-from');
    this.$edgeTo = $('select#edge-to');

    this.$btnRemoveNode = $('button#remove-node').on('click', _ => {
      const nodeId = this.$aggNodes.find('option:selected').val(),
        node = this.nodes.find(n => n.id === nodeId);
      
      this.model.removeNode(node);
      this.createGraph(false);
    });

    this.$btnCreateEdge = $('button#create-edge').on('click', _ => {
      const fromId = this.$edgeFrom.find('option:selected').val().split('_')[1],
        toId = this.$edgeTo.find('option:selected').val().split('_')[1];

      const nodeFrom = this.nodes.find(n => n.id === fromId),
        nodeTo = this.nodes.find(n => n.id === toId);
      
      try {
        this.model.addEdge(nodeFrom, nodeTo);
        // Add to underlying model:
        nodeTo.node.sources.push(nodeFrom.name);
        
        this.createGraph(false);
      } catch (e) {
        alert(e);
        this.gridBox.gbStatus.logger(e);
      }
    });

    this.$btnRemoveEdge = $('button#remove-edge').on('click', _ => {
      const fromId = this.$edges.find('option:selected').val().split('_')[0],
        toId = this.$edges.find('option:selected').val().split('_')[1];

      const nodeFrom = this.nodes.find(n => n.id === fromId),
        nodeTo = this.nodes.find(n => n.id === toId);

      try {
        this.model.removeEdge(nodeFrom, nodeTo);
        // Remove from underlying model:
        nodeTo.node.sources.splice(
          nodeTo.node.sources.findIndex(n => n === nodeFrom), 1);

        this.createGraph(false);
      } catch (e) {
        alert(e);
        this.gridBox.gbStatus.logger(e);
      }
    });
    
    this.options = {
      height: this.$wrap.height(),
      width: this.$wrap.width(),
      layerSpace: 20,
      nodeW: 60,
      nodeH: 60,
      nodeHSpace: 60,
      nodeVSpace: 15
    };


    this.rectW = 80;
    this.rectH = 50;
    this.currentScale = .5;
    this.currentTranslate = [0, 0];
    

    this.svg = d3.select("div#svg-wrapper").append("svg:svg")
      .attr('id', 'foo-svg')
      .attr("width", this.options.width)
      .attr("height", this.options.height)
      .append('g');
      
    
    const zoom = d3.zoom().scaleExtent([.1, 10]).on('zoom', () => {
      const e = d3.event;

      this.currentScale = e.transform.k;
      this.currentTranslate = [e.transform.x, e.transform.y];

      this.svg.attr('transform', e.transform);
      
      this.zoomPanelController();
    });

    d3.select('svg#foo-svg')
      .call(zoom)
      .call(zoom.transform, d3.zoomIdentity.scale(this.currentScale));

    this.$svg = $('svg#foo-svg');

    this.nodes = [];
    this.links = [];

    this.force = d3.forceSimulation()
      .force('link', d3.forceLink().distance(125))
      .force('charge', d3.forceManyBody().strength(-10000))
      .force('gravityX', d3.forceX().strength(.5).x(this.options.width))
      .force('gravityY', d3.forceY().strength(.5).y(this.options.height));

    /**
     * There is only one marker in the SVG contained within a 'defs'-section.
     * This marker is being referenced by all lines (that represent a connection,
     * as a sideline).
     */
    this.svg.append('svg:defs').selectAll('marker')
      .data(['black'])
      .enter()
      .insert('svg:marker', ':first-child')
      .attr('id', String)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('fill', 'darkblue')
      .attr('markerWidth', 11)
      .attr('markerHeight', 11)
      .attr('orient', 'auto')
      .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');

    this.force.on('tick', e => {
      this.svg.selectAll('foreignObject[id^=node-fo]')
        .attr("transform", function (d) {
          that.calcBounds(d);
          return "translate(" + d.x + "," + d.y + ")";
        });

      this._updateLines(this.svg.selectAll('line[id^=line-]'));
    });


    this._createBindings();
  };

  /**
   * 
   * @param {d3.Selection} lines 
   */
  _updateLines(lines) {
    const that = this;

    lines.attr('x1', function (d) {
      var deg = that.angle(d.source.x, d.source.y, d.target.x, d.target.y),
        sideB = that.rectH * .5 / Math.tan((90 - deg) * Math.PI / 180),
        sideA = that.rectW * .5 / Math.tan(deg * Math.PI / 180);
      
      d.offset = d.offset || {};
      d.offset.x = Math.min(sideB, that.rectW * .5);
      d.offset.y = Math.min(sideA, that.rectH * .5);
      d.offset.xpos = d.source.x >= d.target.x ? -1 : 1;
      d.offset.ypos = d.source.y >= d.target.y ? -1 : 1;

      return (d.source.x + that.rectW * .5) + d.offset.xpos * d.offset.x;
    })
    .attr('y1', function (d) {
      return (d.source.y + that.rectH * .5) + d.offset.ypos * d.offset.y;
    })
    .attr('x2', function (d) {
      return (d.target.x + that.rectW * .5) - d.offset.xpos * d.offset.x;
    })
    .attr('y2', function (d) {
      return (d.target.y + that.rectH * .5) - d.offset.ypos * d.offset.y;
    });
  };

  _createBindings() {
    const that = this;

    $(window).bind('resize', function () {
      that.zoomPanelController();
    }).trigger('resize');
  
    /**
     * Frees all nodes when this button is clicked.
     */
    $('#ctrl-free').bind('click', function () {
      that.fixOrSetFree(false);
    });
  
    /**
     * Parses the value of gravity-input and applies it to the force. If the value cannot
     * be parsed, sets the former value again.
     */
    $('#ctrl-gravity').bind('click', function () {
      that.force.resume();
    });
  };

  

  /**
   * This function shows and hides the zoom-overview panel. This panel
   * contains another, smaller panel to indicate the current position,
   * when the zoom is greater than 1 (the whole SVG is draggable). If
   * the zoom is less or equal to 1, the panel is hidden.
   */
  zoomPanelController() {
    let scale = Math.min(1, 1 / this.currentScale),
      panelW = this.$wrap.width() * .2,
      panelH = this.$wrap.height() * .2,
      currentW = this.$wrap.width() * this.currentScale,
      currentH = this.$wrap.height() * this.currentScale;

    this.$panel.stop(true).animate({
      width: panelW + 'px',
      height: panelH + 'px',
      opacity: 1 - this.currentScale > .0001 ? 0 : 1
    }, { duration: 1000 });

    this.$zoomIndicator.text(this.currentScale.toFixed(2) + 'X');
    if (this.currentScale + .0001 < 1) {
      return;
    }

    this.$innerPanel.css({
      width: panelW * scale + 'px',
      height: panelH * scale + 'px',
      top: -this.currentTranslate[1] / currentH * panelH + 'px',
      left: -this.currentTranslate[0] / currentW * panelW + 'px'
    });
  };

	/**
	 * Calculate an angle between two vectors. Specify start- and end points
	 * of one vector. The second is being built as a normalized vector out of
	 * these coords. Returns an angle <= 90° in degrees.
	 */
  angle(ax, ay, bx, by) {
		let v1, v2;
		
		v1 = { x: ax - bx, y: ay - by };
    v2 = { x: 0, y: ay <= by ? -1 : 1 };
    
    let divisor = (Math.sqrt(Math.pow(v1.x, 2) + Math.pow(v1.y, 2)) * Math.sqrt(Math.pow(v2.x, 2) + Math.pow(v2.y, 2)));
		
		let cosinus = divisor === 0 ? 0 : (v1.x * v2.x + v1.y * v2.y) / divisor;
		
		return Math.acos(cosinus) * 180 / Math.PI;
	};

  /**
   * Helper function to constrain all nodes' postions to the bounds of the
   * surrounding SVG.
   *
   * @param d Object with x- and y-properties (to be manipulated by ref)
   * @return void
   */
  calcBounds(d) {
    /**
     * - whole size is initial size * 1 / currentScale
     * - min-offset === [0,0] - translate[x,y]
     * - max-offset === whole size + translate[x,y] - [rectW,rectH]
     * ^-- all quite outdated; see implementation below ↴
     */

    let usedScale = 1 / this.currentScale,
      newSize = [this.$svg.width() * usedScale, this.$svg.height() * usedScale],
      minOffset = [-this.currentTranslate[0] * usedScale, -this.currentTranslate[1] * usedScale],
      maxOffset = [
        newSize[0] - this.currentTranslate[0] * usedScale - this.rectW,
        newSize[1] - this.currentTranslate[1] * usedScale - this.rectH
      ];

    if (!isNaN(d)) {
      console.log(d);
    }

    d.x = d.x < minOffset[0] ? minOffset[0] : (d.x >= maxOffset[0] ? maxOffset[0] : d.x);
    d.y = d.y < minOffset[1] ? minOffset[1] : (d.y >= maxOffset[1] ? maxOffset[1] : d.y);
  };

  /**
   * Creates the box the node or value is visually contained within.
   *
   * @param {ModelNode} node
   * @return {jQuery} the created div containing the elements
   */
  _createNode(node) {
    return $('<div/>')
      .append(
        $('<h4/>').text(node.name)
      ).append(
        $('<p/>').text(node.desc)
      );
  };

  /**
   * Function to redraw the whole SVG. That means, all rectangles, lines, text,
   * markers etc. Should be called upon changes to the sets of nodes and/or links.
   *
   * @return void
   */
  redraw() {
    const that = this;
    // Restart the layout.
    this.force.restart();

    this.svg.selectAll('foreignObject')
      .data(this.nodes)
      .enter()
      .append('svg:foreignObject')
        .attr('id', d => 'node-fo-' + d.id)
        .attr('width', this.rectW)
        .attr('height', this.rectH)
        .on('click', d => {
          this.gridBox._emitEvent(new GraphEvent('nodeSelected', d));
        })
        .each(function(d) {
          if (!isNaN(d.node.x)) {
            $(this).attr('transform', `translate(${d.node.x}, ${d.node.y})`);
          }
          const $t = $(this);
          if (d.isMetric) {
            $t.addClass('metric');
          }

          $t.css('outline-width', 1 + d.depth * 3);
        })
        .append('xhtml:body')
          .html(d => that._createNode(d).outerHtml());

    this.svg.selectAll('foreignObject')
      .call(d3.drag().on('drag', function(d) {
        d.x = d3.event.x, d.y = d3.event.y;
        
        that.svg
          .select(`foreignObject#node-fo-${d.id}`)
          .each(d => that.calcBounds(d))
          .attr('transform', `translate(${d.x}, ${d.y})`);

        that._updateLines(that.link.filter(l => l.source === d));
        that._updateLines(that.link.filter(l => l.target === d));
      }));

    this.link = this.svg.selectAll('line')
      .data(this.links)
      .enter()
      .insert('svg:line', ':first-child')
        .attr('id', d => 'line-' + d.source.id + '_' + d.target.id)
        .attr('marker-end', 'url(#black)');
  };

  /**
   * Creates all nodes necessary for the scenario.
   */
  createGraph(enableForce = true) {
    let that = this, $fix = $('select#ctrl-fix-after'),
      fixAfter = parseFloat($fix.val()), timer = $fix.data('timer');

    if (fixAfter > 0) {
      window.clearTimeout(timer);
      $fix.data('timer', window.setTimeout(function () {
        that.fixOrSetFree(true);
      }, fixAfter * 1000));
    }

    this.$svg.children('g').children(':not(defs)').remove();

    this.nodes = this.model.allNodesArray.map(n => {
      n.x = isNaN(n.x) ? (isNaN(n.node.x) ? 0 : n.node.x) : n.x;
      n.y = isNaN(n.y) ? (isNaN(n.node.y) ? 0 : n.node.y) : n.y;
      return n;
    });

    this.links = [];
    this.nodes.forEach(node => {
      node._children.forEach(child => {
        this.links.push({
          source: child,
          target: node
        });
      });
    });


    this.$edges.empty();
    this.links
      .sort((l1, l2) => l2.target.depth - l1.target.depth)
      .forEach(link => {
        this.$edges.append($('<option/>')
          .attr('value', `${link.source.id}_${link.target.id}`)
          .html(`${link.source.name}&nbsp;&nbsp;⇒&nbsp;&nbsp;${link.target.name}`));
      });

    this.$aggNodes.empty();
    this.$edgeFrom.empty();
    this.$edgeTo.empty();
    this.nodes.sort((n1, n2) => n2.depth - n1.depth).forEach(node => {
      if (node.isAggregate) {
        this.$aggNodes.append($('<option/>').text(node.name)
          .attr('value', node.id));
      }

      this.$edgeFrom.append(
        $('<option/>').text(node.name).attr('value', `nid-from_${node.id}`)
      );
      this.$edgeTo.append(
        $('<option/>').text(node.name).attr('value', `nid-to_${node.id}`)
      );
    });

    this.fixOrSetFree(!enableForce);
    this.redraw();
  };

  /**
   * Fixes or frees all nodes. Fixing firstly stops the force, freeing resumes it.
   * Then iteratively (un-)fixes all nodes the force would apply to.
   *
   * @param Boolean fix true to fix all nodes, false to free them
   * @return void
   */
  fixOrSetFree(fix) {
    if (fix) {
      this.force.nodes([]).force('link').links([]);
      this.force.stop();
    } else {
      this.force.nodes(this.nodes).force('link').links(this.links);
      this.force.alpha(.9).restart();
    }

    this.nodes.forEach(node => {
      node.fixed = fix;
    });
  };
};



export {
  GraphEvent,
  GridboxGraph
};
