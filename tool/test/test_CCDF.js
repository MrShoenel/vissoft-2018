require('../script/typedefs');


const chai = require('chai')
, assert = chai.assert
, { computeCDF } = require('../script/ComputedData');


/** @type {Array.<Column>} */
const testData3c = [{
  colName: 'm1',
  data: [14, 21, 16, 8, 21, 11, 18, 16].map((v, i) =>
    { return { id: `F${i+1}`, val: v }; })
}, {
  colName: 'm2',
  data: [112.5, 78.2, 67.7, 100.2, 55.0, 85.9, 88.9, 102.3].map((v, i) =>
    { return { id: `F${i+1}`, val: v }; })
}, {
  colName: 'm3',
  data: [0.18, 0.51, 0.25, 0.84, 0.05, 0.36, 0.97, 0.48].map((v, i) =>
    { return { id: `F${i+1}`, val: v }; })
}];

const testData3c_without_m2 = [testData3c[0], testData3c[2]];


describe('computeCDF', () => {
  it('should throw errors if given invalid arguments', done => {
    assert.throws(() => computeCDF());

    assert.throws(() => computeCDF([]));

    assert.throws(() => computeCDF([testData3c[0], null]));

    assert.throws(() => computeCDF(testData3c, 10));

    done();
  });

  it('should compute the CDF and CCDF of uni-variate data correctly', done => {
    const result_CDF = computeCDF([testData3c[0]], 0, void 0, false);
    const result_CCDF = computeCDF([testData3c[0]], 0, void 0, true);

    const expect_CDF = [2/8, 7/8, 4/8, 0, 7/8, 1/8, 5/8, 4/8];
    const expect_CCDF = [5/8, 0, 3/8, 7/8, 0, 6/8, 2/8, 3/8];

    result_CDF.data.forEach((v, i) => {
      assert.strictEqual(v.id, `F${i+1}`);
      assert.approximately(v.val, expect_CDF[i], 1e-12);
    });
    result_CCDF.data.forEach((v, i) => {
      assert.strictEqual(v.id, `F${i+1}`);
      assert.approximately(v.val, expect_CCDF[i], 1e-12);
    });

    done();
  });

  it('should compute the CDF and CCDF of multi-variate data correctly', done => {
    const result_CDF = computeCDF(testData3c, 0, void 0, false);
    const result_CCDF = computeCDF(testData3c, 0, void 0, true);

    const expect_CDF = [0, 2/8, 0, 0, 0, 0, 2/8, 2/8];
    const expect_CCDF = [0, 0, 2/8, 0, 0, 2/8, 0, 0];

    result_CDF.data.forEach((v, i) => {
      assert.strictEqual(v.id, `F${i+1}`);
      assert.approximately(v.val, expect_CDF[i], 1e-12);
    });
    result_CCDF.data.forEach((v, i) => {
      assert.strictEqual(v.id, `F${i+1}`);
      assert.approximately(v.val, expect_CCDF[i], 1e-12);
    });


    // Now without m2:
    const result_CDF_wo_m2 = computeCDF(testData3c_without_m2, 0, void 0, false);
    const result_CCDF_wo_m2 = computeCDF(testData3c_without_m2, 0, void 0, true);

    const expect_CDF_wo_m2 = [0, 5/8, 1/8, 0, 0, 0, 5/8, 3/8];
    const expect_CCDF_wo_m2 = [4/8, 0, 2/8, 1/8, 0, 3/8, 0, 2/8];

    result_CDF_wo_m2.data.forEach((v, i) => {
      assert.strictEqual(v.id, `F${i+1}`);
      assert.approximately(v.val, expect_CDF_wo_m2[i], 1e-12);
    });
    result_CCDF_wo_m2.data.forEach((v, i) => {
      assert.strictEqual(v.id, `F${i+1}`);
      assert.approximately(v.val, expect_CCDF_wo_m2[i], 1e-12);
    });


    done();
  });

  it('should compute only the given part', done => {
    const result_CDF = computeCDF(testData3c, 2, 4, false);
    const result_CCDF = computeCDF(testData3c, 2, 4, true);

    const expect_CDF = [0, 0, 0, 0];
    const expect_CCDF = [2/8, 0, 0, 2/8];

    result_CDF.data.forEach((v, i) => {
      assert.strictEqual(v.id, `F${i+3}`);
      assert.approximately(v.val, expect_CDF[i], 1e-12);
    });
    result_CCDF.data.forEach((v, i) => {
      assert.strictEqual(v.id, `F${i+3}`);
      assert.approximately(v.val, expect_CCDF[i], 1e-12);
    });

    done();
  });
});
