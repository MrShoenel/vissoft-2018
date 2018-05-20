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

    let bound = false;

    this.$table = $('table#ranking-content').tablesorter();
    this.$select = $('select#ranking-by-node').empty();

    dataObservable.subscribe(evt => {
      this.dataset = evt.dataset;
      this.model = evt.model;
      this.model.observable.subscribe(evt => {
        if (evt.type === Enum_Event_Types.RequiresRecompute) {
          this.$select.empty();

          this.model.allNodesArray.forEach(node => {
            const $opt = $('<option/>').text(node.name).attr('option', node.name);
            if (node.isEmptyAggregation) {
              $opt.attr('disabled', 'disabled');
              $opt.text($opt.text() + ' (empty aggregate)');
            }
            this.$select.append($opt);
          });
          
          // Select first root node, if any:
          if (this.model.rootNodes.length > 0) {
            this.$select.find('option').filter((_idx, opt) => $(opt).text() === this.model.rootNodes[0].name).attr('selected', 'selected');
          }
        }
      });

      if (!bound) {
        evt.dataset.crossfilter.onChange(this._changeCallback.bind(this));
        this.$select.on('change', _ => {
          this._renderList(this.selectedNode);
        });
        bound = true;
      }
    });
  };

  /**
   * @returns {ModelNode}
   */
  get selectedNode() {
    const selected = this.$select.find('option:selected').val();
    return this.model.allNodesArray.find(node => node.name === selected);
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

    // Now, for each element, attach a row
    $tbody.empty();
    items.forEach(item => {
      const $tr = $('<tr/>'), itemId = item[this.dataset.entityIdColumn],
        itemCdfVal = cdf.data.find(d => d.id === itemId).val;

      $tr.append($('<td/>').text(itemId));
      $tr.append($('<td/>').text(itemCdfVal.toFixed(4)));

      $tr.appendTo($tbody);
    });

    this.$table.trigger('update');
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
