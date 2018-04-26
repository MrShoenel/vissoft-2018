import { Dataset } from './Dataset.js';
import { Model, Enum_Event_Types } from './Model.js';

const run = async() => {
  console.log('run');

  // Load our default data and QM:
  let ds = await Dataset.fromDataAndQm(
    '/data/default.csv', '/data/default-model.json');

  const model = new Model(ds);
  model.print();

  const start = +new Date;
  const obs = model.subscribe(evt => {
    if (evt.type === Enum_Event_Types.Progress) {
      console.info(`Progress: ${(evt.data * 100).toFixed(2)} %`);
      if (evt.data === 1) {
        model.unsubscribe(obs);
      }
    }
  });

  await model.recompute();
  console.info(`Model is computed and up-2-date! Computation took ${(+new Date) - start}ms`);
};

export { run };
