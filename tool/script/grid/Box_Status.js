import * as typedefs from '../typedefs.js';

import { LoadEvent } from './Box_Header.js';
import { Dataset } from '../Dataset.js';
import { Model, Enum_Event_Types } from '../Model.js';



class GridboxStatus {
  /**
   * @param {Rx.Observable.<LoadEvent>} dataObservable 
   */
  constructor(dataObservable) {
    /** @type {'pre'|'console'} */
    this._loggerType = 'pre';

    this._loggerPre = (() => {
      let lineCount = 0;
      return val => {
        this.pre.innerText = `${(lineCount++).toString().padStart(4, '0')}: ` + val + "\n" + this.pre.innerText;
        this.pre.scrollTo(0, 0);
      };
    })();

    this.pre = document.querySelector('pre#log');
    this.progress = document.querySelector('progress#model-load-progress');
    
    this.btnPrint = document.querySelector('button#btn-print');
    this.btnPrint.addEventListener('click', () => this._model.print(this.logger.bind(this)));
    this.btnPrint.setAttribute('disabled', 'disabled');

    dataObservable.subscribe(evt => {
      this.dataset = evt.dataset;
      this.model = evt.model;
    });
  };

  /**
   * @param {Dataset} value
   */
  set dataset(value) {
    this._dataset = value;
  };

  /**
   * @param {Model} value
   */
  set model(value) {
    if (!(value instanceof Model)) {
      throw new Error('A Model-instance is required.');
    }
    if (this._model instanceof Model) {
      throw new Error('You must not re-set the model.');
    }

    this._model = value;

    this.btnPrint.removeAttribute('disabled');

    let lastProgress = 0;
    const obs = this._model.observable.subscribe(evt => {
      if (evt.type === Enum_Event_Types.RequiresRecompute) {
        this.logger(`The Model has changed and needs to be re-computed. The cost is ${evt.data}`);
        lastProgress = 0;
        this.progress.value = 0;
      } else if (evt.type === Enum_Event_Types.Progress) {
        if (evt.data > lastProgress) {
          lastProgress = evt.data;
          this.progress.value = evt.data;
          this.logger(`Progress: ${(evt.data * 100).toFixed(2)} %`);
        }
      }
    });
  };

  /**
   * @param {'pre'|'console'} val
   */
  set loggerType(val) {
    this._loggerType = val === 'pre' ? val : 'console';
  };

  _loggerConsole(val) {
    console.log(val);
  };

  logger(val, ...args) {
    (this._loggerType === 'pre' ? this._loggerPre : this._loggerConsole)(val);
  };
};

export { GridboxStatus };