import { Dataset, DatasetEvent } from './Dataset.js';
import { Model } from './Model.js';

const run = async() => {
  console.log('run');

  // Load our default data and QM:
  let ds = await Dataset.fromDataAndQm(
    '/data/default.csv', '/data/default-model.json');

  const model = new Model(ds);
  const start = +new Date;
  await model.recompute();
  console.info(`Model is computed and up-2-date! Computation took ${(+new Date) - start}ms`);
  model.print();
};

export { run };
