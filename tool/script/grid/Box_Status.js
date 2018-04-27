import * as typedefs from '../typedefs.js';

import { LoadEvent } from './Box_Header.js';
import { Dataset } from '../Dataset.js';
import { Model, Enum_Event_Types } from '../Model.js';



class GridboxStatus {
  /**
   * @param {Rx.Observable.<LoadEvent>} dataObservable 
   */
  constructor(dataObservable) {
    dataObservable.subscribe(evt => {
      this.dataset = evt.dataset;
      this.model = evt.model;
    });

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
    this.progress = document.querySelector('progress');
    
    this.btnPrint = document.querySelector('button#btn-print');
    this.btnPrint.addEventListener('click', () => this._model.print(this.logger.bind(this)));
    this.btnPrint.setAttribute('disabled', 'disabled');

    this.btnExport = document.querySelector('button#btn-export-model');
    this.btnExport.addEventListener('click', () => this.export());
    this.btnExport.setAttribute('disabled', 'disabled');

    this.btnRecomp = document.querySelector('button#btn-recomp-model');
    this.btnRecomp.addEventListener('click', async() => {
      this.btnRecomp.setAttribute('disabled', 'disabled');
      await this.recompute();
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
    this.btnExport.removeAttribute('disabled');

    let lastProgress = 0;
    const obs = this._model.observable.subscribe(evt => {
      if (evt.type === Enum_Event_Types.Progress) {
        if (evt.data > lastProgress) {
          lastProgress = evt.data;
          this.progress.value = evt.data;
          this.logger(`Progress: ${(evt.data * 100).toFixed(2)} %`);
        }
      }
    });
  };

  export() {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this._dataset.model, null, "\t")));
    element.setAttribute('download', `model-${+new Date}.json`);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  };

  async recompute() {
    const start = +new Date;
    await this._model.recompute();
    this.logger(
      `Model is computed and up-2-date! Computation took ${(+new Date) - start}ms`);
    this.logger(
      `Model recomputation cost is: ${this._model.recomputeCost} (should be 0 now)`);
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