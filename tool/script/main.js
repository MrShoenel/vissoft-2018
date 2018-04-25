import { Dataset, DatasetEvent } from './Dataset.js';
import { Model } from './Model.js';

const run = async() => {
  console.log('run');

  // Load our default data and QM:
  let ds = await Dataset.fromDataAndQm(
    '/data/default.csv', '/data/default-model.json');

  const model = new Model(ds);
  model.print();
  await model.recompute();
};

export { run };
