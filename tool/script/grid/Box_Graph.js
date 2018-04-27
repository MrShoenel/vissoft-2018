import * as typedefs from '../typedefs.js';

import { LoadEvent } from './Box_Header.js';
import { Dataset } from '../Dataset.js';
import { Model } from '../Model.js';



class GridboxGraph {
  /**
   * @param {Rx.Observable.<LoadEvent>} dataObservable 
   */
  constructor(dataObservable) {
    dataObservable.subscribe(evt => {
      this.dataset = evt.dataset;
      this.model = evt.model;
    });
  };
};

export {
  GridboxGraph
};