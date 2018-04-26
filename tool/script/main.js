import * as typedefs from './typedefs.js';
import { Dataset } from './Dataset.js';
import { Model, Enum_Event_Types } from './Model.js';

const run = async() => {
  const pre = document.querySelector('pre');
  const logger = val => {
    pre.innerText = val + "\n" + pre.innerText;
  }; // console.log;
  logger('run');

  // Load our default data and QM:
  let ds = await Dataset.fromDataAndQm(
    '/data/default.csv', '/data/default-model.json');

  const model = new Model(ds);
  model.print(logger);

  const start = +new Date;
  const progress = document.querySelector('progress');
  const obs = model.subscribe(evt => {
    if (evt.type === Enum_Event_Types.Progress) {
      progress.value = evt.data;
      logger(`Progress: ${(evt.data * 100).toFixed(2)} %`);
      if (evt.data === 1) {
        model.unsubscribe(obs);
      }
    }
  });

  await model.recompute();
  logger(`Model is computed and up-2-date! Computation took ${(+new Date) - start}ms`);
};

export { run };
