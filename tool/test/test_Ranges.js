require('../script/typedefs');


const chai = require('chai')
, assert = chai.assert
, { partitionToRanges } = require('../script/ComputedData');


describe('partitionToRanges', () => {
  it('should create valid ranges for reasonable arguments', done => {
    let ranges = partitionToRanges(10, 3);

    assert.deepEqual(ranges, [
      { start: 0, length: 4 },
      { start: 4, length: 4 },
      { start: 8, length: 2 }
    ]);

    done();
  });

  it('should behave normally in extreme cases', done => {
    let ranges = partitionToRanges(6, 2, 5);

    assert.deepEqual(ranges, [
      { start: 5, length: 1 }
    ]);
    
    ranges = partitionToRanges(6, 2, 1);

    assert.deepEqual(ranges, [
      { start: 1, length: 3 },
      { start: 4, length: 2 }
    ]);

    done();
  });
});