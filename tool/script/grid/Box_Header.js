import * as typedefs from '../typedefs.js';
import { GridboxStatus } from './Box_Status.js';
import { Dataset } from '../Dataset.js';
import { Model, Enum_Event_Types } from '../Model.js';


class LoadEvent {
  /**
   * @param {Dataset} dataset 
   * @param {Model} model 
   */
  constructor(dataset, model) {
    this.dataset = dataset;
    this.model = model;
  };
};


class GridboxHeader {
  constructor() {
    this.fileData = document.querySelector('input[type="file"]#input-data');
    this.fileModel = document.querySelector('input[type="file"]#input-model');
    this.btnOpen = document.querySelector('button#btn-open');
    this.btnOpenDefault = document.querySelector('button#btn-open-default');

    this.btnOpenDefault.addEventListener('click', async evt => {
      evt.preventDefault();
      evt.stopPropagation();

      this.btnOpenDefault.setAttribute('disabled', 'disabled');
      await this.loadDefaults();
      this.btnOpenDefault.removeAttribute('disabled');
    });
    this.btnOpenDefault.removeAttribute('disabled');

    /** @type {File} */
    this.selectedData = null;
    /** @type {File} */
    this.selectedModel = null;

    this.fileData.addEventListener('change', evt => {
      this.selectedData = this.fileData.files[0];
      if (this.selectedModel !== null) {
        this.btnOpen.removeAttribute('disabled');
      }
    });
    this.fileModel.addEventListener('change', evt => {
      this.selectedModel = this.fileModel.files[0];
      if (this.selectedData !== null) {
        this.btnOpen.removeAttribute('disabled');
      }
    });

    /** @type {Array.<Rx.Observer.<LoadEvent>>} */
    this._observers = [];

    this._observable = Rx.Observable.create(observer => {
      this._observers.push(observer);
      const oldDispose = observer.dispose;
      observer.dispose = () => {
        this._unsubscribe(observer);
        oldDispose.call(observer);
      };
    });
  };

  set gridboxStatus(value) {
    if (!(value instanceof GridboxStatus)) {
      throw new Error(`value must be an instance of ${GridboxStatus.name}.`);
    }
    this.gbStatus = value;
  };

  async loadDefaults() {
    const defaultData = '/data/default.csv',
      defaultModel = '/data/default-model.json';
    
    await this.load(defaultData, defaultModel);

    this.gbStatus.logger(
      `Loaded defaults: '${defaultData}' and '${defaultModel}'.`);
  };

  async load(pathData, pathModel) {
    this.dataset = await Dataset.fromDataAndQm(pathData, pathModel);
    this.model = new Model(this.dataset);
    this._emitEvent(new LoadEvent(this.dataset, this.model));

    this.gbStatus.logger(
      `Model recomputation cost is: ${this.model.recomputeCost}`);
    this.gbStatus.logger(
      `Loaded data from '${pathData}' and model from '${pathModel}'.`);
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
   * Obtain the Observable for this ModelNode that emits LoadEvent.
   * This Observable never drains. To save resources, call dispose() on
   * obtained Observers, when not longer needed.
   * 
   * @returns {Rx.Observable.<LoadEvent>}
   */
  get observable() {
    return this._observable;
  };
};

export { LoadEvent, GridboxHeader };