import * as typedefs from '../typedefs.js';
import { LoadEvent } from './Box_Header.js';
import { Dataset } from '../Dataset.js';


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

    dataObservable.subscribe(evt => {
      tsne(evt);

      this.dataset = evt.dataset;
      if (!bound) {
        evt.dataset.crossfilter.onChange(this._changeCallback.bind(this));
        bound = true;
      }
    });
  };

  /**
   * @param {'filtered'|string} evt 
   * @returns {void}
   */
  _changeCallback(evt) {
    console.log(evt);
    /** @type {CSVNumericData|d3.DSVParsedArray.<d3.DSVRowString>} */
    const items = this.dataset.crossfilter.allFiltered();

    if (items.length < this.dataset.data.length) {
      // Debouncing
      clearTimeout(this._timeout);
      this._timeout = setTimeout(() => {
        const $table = $('table#ranking-content'),
          $thead = $table.find('thead'),
          $tbody = $table.find('tbody');

        // Render the header for the columns
        $thead.empty();
        const headers = ['ID'];
        headers.forEach(head => $('<th/>').text(head).appendTo($thead));


        // Now, for each element, attach a row
        $tbody.empty();
        items.forEach(item => {
          const $tr = $('<tr/>');
          headers.forEach(head => $('<td/>').text(item[this.dataset.entityIdColumn]).appendTo($tr));
          $tr.appendTo($tbody);
        });


        $table.tablesorter();


        // const rankingElem = document.getElementById("ranking");
        // const numSelElem = document.getElementById("ranking-num-sel");
        // const contentElem = document.getElementById("ranking-content");

        // numSelElem.innerHTML = "# of selected elements: " + items.length;
        // contentElem.innerHTML = "";
        // const ul = document.createElement("ul");
        // contentElem.appendChild(ul);
        // for (let item of items) {
        //   const li = document.createElement("li");
        //   li.appendChild(document.createTextNode(item.name));
        //   ul.appendChild(li);
        // }
      }, 500);
    }
  };
};


export { GridboxList };
