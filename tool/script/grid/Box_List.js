import * as typedefs from '../typedefs.js';
import { LoadEvent } from './Box_Header.js';
import { Dataset } from '../Dataset.js';
import { Enum_Computation_Types } from '../ComputedData.js';
import { Enum_Event_Types } from '../Model.js';
import { ModelNode } from '../ModelNode.js';


class GridboxList {
  /**
   * @param {Rx.Observable.<LoadEvent>} dataObservable 
   */
  constructor(dataObservable) {
    /** @type {number} */
    this._timeout = null;

    /** @type {Dataset} */
    this.dataset = null;

    this.dim = null;

    let bound = false;

    this.$count = $('span#ranking-num-sel');
    this.$table = $('table#ranking-content').tablesorter();
    this.$select = $('select#ranking-by-node').empty();

    /** @param {Array.<ModelNode>} nodes */
    const addOptions = nodes => {
      this.$select.empty();
      nodes.sort((n1, n2) => n2.depth - n1.depth).forEach(node => {
        const $opt = $('<option/>').text(node.name).attr('option', node.name);
        if (node.isEmptyAggregation) {
          $opt.attr('disabled', 'disabled');
          $opt.text($opt.text() + ' (empty aggregate)');
        } else if (node.isMetric && node._parents.length === 0) {
          $opt.attr('disabled', 'disabled');
          $opt.text($opt.text() + ' (not connected)');
        }
        this.$select.append($opt);
      });
          
      // Select first root node, if any:
      if (this.model.rootNodes.length > 0) {
        this.$select.find('option').filter((_idx, opt) => $(opt).text() === this.model.rootNodes[0].name).attr('selected', 'selected');
      }
    };


    dataObservable.subscribe(evt => {
      this.dataset = evt.dataset;
      this.dim = this.dataset.crossfilter.dimension(d => d[this.dataset.entityIdColumn]);
      this.model = evt.model;
      this.model.observable.subscribe(evt => {
        if (evt.type === Enum_Event_Types.RequiresRecompute) {
          addOptions(this.model.allNodesArray);
        }
      });

      if (!bound) {
        evt.dataset.crossfilter.onChange(this._changeCallback.bind(this));
        this.$select.on('change', _ => {
          this._renderList(this.selectedNode);
        });
        bound = true;
      }
    
      addOptions(this.model.allNodesArray);
    });
  };

  /**
   * @returns {ModelNode}
   */
  get selectedNode() {
    const selected = this.$select.find('option:selected').val();
    return this.model.allNodesArray.find(node => node.name === selected);
  };

  // @SEBASTIAN: Please check here if you need to add the param comments, I'm not sure how to use that :)
  _rowOnClick(evt, itemId) {
    if (evt.shiftKey) {
      this.dim.filterAll();
    } else {
      this.dim.filter(itemId);
    }
    // ugly global for now; sorry! :)
    redrawAll();

    // this._renderList(this.selectedNode);
  };

  /**
   * 
   * @param {ModelNode} node 
   */
  _renderList(node) {
    const $tbody = this.$table.find('tbody').empty();
    // get CDF values for selected node:
    const cdf = node.getComputedData(Enum_Computation_Types.CDF)[0];

    /** @type {CSVNumericData|d3.DSVParsedArray.<d3.DSVRowString>} */
    const items = this.dataset.crossfilter.allFiltered();

    this.$count.text(items.length);

    // Now, for each element, attach a row
    $tbody.empty();
    items.forEach((item, idx) => {
      const $tr = $('<tr/>'), itemId = item[this.dataset.entityIdColumn],
        itemCdfVal = cdf.data.find(d => d.id === itemId).val;

      $tr.append($('<td/>').text(idx + 1));
      $tr.append($('<td/>').text(itemId));
      $tr.append($('<td/>').text(itemCdfVal.toFixed(4)));

      $tr.appendTo($tbody);

      // Using the method directly does not work, because "this" is changed
      $tr.click(evt => this._rowOnClick(evt, itemId));
    });

    this.$table.trigger('update');
    // Sort on 'Value' ascending
    this.$table.trigger("sorton", [[[2,0]]]);
  };

  /**
   * @param {'filtered'|string} evt 
   * @returns {void}
   */
  _changeCallback(evt) {
    /** @type {CSVNumericData|d3.DSVParsedArray.<d3.DSVRowString>} */
    const items = this.dataset.crossfilter.allFiltered();

    if (items.length < this.dataset.data.length) {
      // Debouncing
      clearTimeout(this._timeout);
      this._timeout = setTimeout(() => {
        this._renderList(this.selectedNode);
      }, 500);
    }
  };
};


export { GridboxList };
