const { assert, expect } = require('chai')
, { ProcessWrapper, ProcessExit } = require('sh.orchestration-tools')
, path = require('path');


const dir = path.join(path.dirname(__filename), '../');
const pathToESdoc = path.join(
  __dirname, `../node_modules/.bin/esdoc${/win/i.test(process.platform) ? '.cmd' : ''}`);


describe('Create documentation', () => {

  it('should always be able to generate the documentation from code', async function() {
    this.timeout(3e4);

    const pw = new ProcessWrapper(pathToESdoc, [], {
      cwd: dir
    });
    
    const result = await pw.spawnAsync(false);
    assert.isTrue(result instanceof ProcessExit);
    assert.strictEqual(result.code, 0);
    assert.isFalse(result.faulted);
  });
});