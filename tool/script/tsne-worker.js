importScripts('../bower_components/tsnejs/tsne.js');
importScripts('./prng.js');


const r = new Random(42);

Math.random = () => r.nextFloat();

self.onmessage = function (e) {

	let data = e.data;

	var opt = {}
	opt.epsilon = 10; // epsilon is learning rate (10 = default)
	opt.perplexity = 50; // roughly how many neighbors each point influences (30 = default)
	opt.dim = 2; // dimensionality of the embedding (2 = default)

	var tsne = new tsnejs.tSNE(opt); // create a tSNE instance

	// initialize data. Here we have 3 points and some example pairwise dissimilarities
	tsne.initDataRaw(data);

	for(var k = 0; k < 300; k++) {
		tsne.step(); // every time you call this, solution gets better
		if (k % 10 == 0) {
			output = tsne.getSolution(); // Y is an array of 2-D points that you can plot
			postMessage({
				output: output,
				iter: k,
				finished: false
			});
		}
	}

	output = tsne.getSolution(); // Y is an array of 2-D points that you can plot

	postMessage({
		output: output,
		iter: k,
		finished: true
	});
}