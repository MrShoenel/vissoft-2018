const dc_canvas = require('dc-canvas');
const dc = dc_canvas.dc;
const crossfilter = dc_canvas.crossfilter;
const d3v3 = dc_canvas.d3;


const plots = {},
      __index = {};

let __data,
    __crossfilter,
    __model;

const colormaps = {
  'puOr11': ['#7f3b08', '#b35806', '#e08214', '#fdb863', '#fee0b6', '#f7f7f7', '#d8daeb', '#b2abd2', '#8073ac', '#542788', '#2d004b'],
  'spectral8': ['#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd'],
  'redBlackGreen': ['#ff0000', '#AA0000', '#550000', '#005500', '#00AA00', '#00ff00'],
  'viridis': ["#440154","#440256","#450457","#450559","#46075a","#46085c","#460a5d","#460b5e","#470d60","#470e61","#471063","#471164","#471365","#481467","#481668","#481769","#48186a","#481a6c","#481b6d","#481c6e","#481d6f","#481f70","#482071","#482173","#482374","#482475","#482576","#482677","#482878","#482979","#472a7a","#472c7a","#472d7b","#472e7c","#472f7d","#46307e","#46327e","#46337f","#463480","#453581","#453781","#453882","#443983","#443a83","#443b84","#433d84","#433e85","#423f85","#424086","#424186","#414287","#414487","#404588","#404688","#3f4788","#3f4889","#3e4989","#3e4a89","#3e4c8a","#3d4d8a","#3d4e8a","#3c4f8a","#3c508b","#3b518b","#3b528b","#3a538b","#3a548c","#39558c","#39568c","#38588c","#38598c","#375a8c","#375b8d","#365c8d","#365d8d","#355e8d","#355f8d","#34608d","#34618d","#33628d","#33638d","#32648e","#32658e","#31668e","#31678e","#31688e","#30698e","#306a8e","#2f6b8e","#2f6c8e","#2e6d8e","#2e6e8e","#2e6f8e","#2d708e","#2d718e","#2c718e","#2c728e","#2c738e","#2b748e","#2b758e","#2a768e","#2a778e","#2a788e","#29798e","#297a8e","#297b8e","#287c8e","#287d8e","#277e8e","#277f8e","#27808e","#26818e","#26828e","#26828e","#25838e","#25848e","#25858e","#24868e","#24878e","#23888e","#23898e","#238a8d","#228b8d","#228c8d","#228d8d","#218e8d","#218f8d","#21908d","#21918c","#20928c","#20928c","#20938c","#1f948c","#1f958b","#1f968b","#1f978b","#1f988b","#1f998a","#1f9a8a","#1e9b8a","#1e9c89","#1e9d89","#1f9e89","#1f9f88","#1fa088","#1fa188","#1fa187","#1fa287","#20a386","#20a486","#21a585","#21a685","#22a785","#22a884","#23a983","#24aa83","#25ab82","#25ac82","#26ad81","#27ad81","#28ae80","#29af7f","#2ab07f","#2cb17e","#2db27d","#2eb37c","#2fb47c","#31b57b","#32b67a","#34b679","#35b779","#37b878","#38b977","#3aba76","#3bbb75","#3dbc74","#3fbc73","#40bd72","#42be71","#44bf70","#46c06f","#48c16e","#4ac16d","#4cc26c","#4ec36b","#50c46a","#52c569","#54c568","#56c667","#58c765","#5ac864","#5cc863","#5ec962","#60ca60","#63cb5f","#65cb5e","#67cc5c","#69cd5b","#6ccd5a","#6ece58","#70cf57","#73d056","#75d054","#77d153","#7ad151","#7cd250","#7fd34e","#81d34d","#84d44b","#86d549","#89d548","#8bd646","#8ed645","#90d743","#93d741","#95d840","#98d83e","#9bd93c","#9dd93b","#a0da39","#a2da37","#a5db36","#a8db34","#aadc32","#addc30","#b0dd2f","#b2dd2d","#b5de2b","#b8de29","#bade28","#bddf26","#c0df25","#c2df23","#c5e021","#c8e020","#cae11f","#cde11d","#d0e11c","#d2e21b","#d5e21a","#d8e219","#dae319","#dde318","#dfe318","#e2e418","#e5e419","#e7e419","#eae51a","#ece51b","#efe51c","#f1e51d","#f4e61e","#f6e620","#f8e621","#fbe723","#fde725"]
};

let sel_colormap, 
    cmapDomain, 
    cmapScale, 
    distIndex;

const defaultCmap = "viridis";

function chart(parent, x, y, height=-1, prob=false) {
  // Calculate x and y binning with each bin being PIXEL_BIN_SIZE wide.
  // Binning coordinates into bins such that 1-2 bins per pixel makes
  // crossfilter operations more efficient, especially with large
  // datasets
  // const nXBins = 300; const nYBins = 300;
  // const binWidth = 20 / nXBins;

  // var ndx = crossfilter(rowData),
  //     dim1 = ndx.dimension(function (d) {
  //         return [Math.floor(d.feature1 / binWidth) * binWidth,
  //             Math.floor(d.feature2 / binWidth) * binWidth, d.class];
  //     }),
  //     dim2 = ndx.dimension(function (d) {
  //         return [Math.floor(d.feature2 / binWidth) * binWidth,
  //             Math.floor(d.feature3 / binWidth) * binWidth, d.class];
  //     }),
  //     group1 = dim1.group(),
  //     group2 = dim2.group();

  let parentElem = document.getElementById(parent.slice(1, parent.length));

  // If already existing, make room for new dimension
  if (parent in plots) {
    plots[parent].dimension().dispose();
  }

  // Always have to create a new dimension, unfortunately
  const dim = __crossfilter.dimension(function (d, i) {
    return [d[x], d[y], i];
  });

  // If chart does not exist yet, create it
  if (!(parent in plots)) {
    plots[parent] = dc.scatterPlot(parent)        
        .useCanvas(true)
        .highlightedSize(4)
        .symbolSize(5)
        .excludedSize(3)
        .excludedOpacity(0.5)
        .excludedColor('#ddd')
        .emptySize(3)
        .emptyOpacity(0.5)
        .emptyColor('#ddd');
  }

  const chart = plots[parent];

  let xExtent = d3v3.extent(__data, d => d[x]);
  let xScale = d3v3.scale.linear().domain(xExtent);

  let yExtent = d3v3.extent(__data, d => d[y]);  
  let yScale = d3v3.scale.linear().domain(yExtent);

  if (prob) {
    let yExtent = [0, 1];

    chart.yAxis().tickValues(d3v3.range(0, 1.2, 0.2));
    chart.xAxis().tickValues([]);

    chart.xAxisLabel("Files");

    let xMargin = (xExtent[1] - xExtent[0]) * 0.05;
    xScale = d3v3.scale.linear().domain([xExtent[0] - xMargin, xExtent[1] + xMargin]);
    
    let yMargin = (yExtent[1] - yExtent[0]) * 0.1;
    yScale = d3v3.scale.linear().domain([yExtent[0] - yMargin, yExtent[1] + yMargin]);
  }
  else {
    d3v3.select(parent).selectAll(".axis").style("display", "none");
  }

  // Update everything about the chart
  chart
      .dimension(dim)        
      .group(dim.group())
      .x(xScale)
      .y(yScale);

  if (height > 0)
    chart.height(height);

  chart.colors(cmapScale);
  if (distIndex) {    
    chart.colorAccessor(d => distIndex[__data[d.key[2]].entity_id]);
  } else {
    chart.colorAccessor(d => 0);
  }

  // plots[parent].expireCache();
  chart.render();
  chart.redraw();
}


function colorChanged(dist) {
  cmapDomain = d3v3.extent(dist, d => d.val);
  cmapScale = d3v3.scale.quantize().domain(cmapDomain).range(colormaps[sel_colormap.value]);
  distIndex = dist.reduce((obj, item) => { obj[item.id] = item.val; return obj; }, {});
  for (let p in plots) {
    const chart = plots[p];
    // Color mapping    
    chart.colors(cmapScale);    
    chart.colorAccessor(d => distIndex[__data[d.key[2]].entity_id]);
  }
  dc.redrawAll();
}


function changeColormap(cmap) {
  for (let p in plots) {
    const chart = plots[p];
    chart.colors().range(cmap);
  }
  dc.redrawAll();
}

function plots_init(evt) {
  // The following instructions should be on a constructor
  __data = evt.dataset.data;
  __crossfilter = evt.dataset.crossfilter;
  __model = evt.model;

  sel_colormap = document.getElementById("sel_colormap");
  for (let cmap in colormaps) {
    let opt = document.createElement("option");
    opt.value = cmap;
    opt.innerHTML = cmap;
    sel_colormap.appendChild(opt);
  }
  sel_colormap.onchange = d => changeColormap(colormaps[d.target.value]);
  sel_colormap.value = defaultCmap;
  cmapDomain = [0, 1];
  cmapScale = d3v3.scale.quantize().domain(cmapDomain).range(colormaps[sel_colormap.value]);

  // This index will help later when adding the other charts
  for (let row of __data) {
    __index[row.entity_id] = row;
  }
}

function tsne(evt) {
  // Initialize the columns that will hold the t-SNE results
  for (let row of __data) {    
    row["tsne_x"] = 0;    
    row["tsne_y"] = 0;
  }

  chart("#tsne", "tsne_x", "tsne_y");
  
  if (typeof(Worker) !== "undefined") {
    // console.log('Yes! Web worker support!');
    
    if (typeof(w) == "undefined") {
      w = new Worker("script/tsne-worker.js");
    }

    // Data pre-processing
    
    // let cols = Object.keys(__data[0]).filter(c => c.endsWith("(score)"));
    // let __data_score = __data.map(row => cols.map(c => +row[c]));

    let cols = Object.keys(__model.allNodes).filter(function(k) {
      const n = __model.allNodes[k];
      return n.depth == 0 && n.hasState(n.state);
    });
    
    let __data_score = __data.map(row => cols.map(col => __index[row.entity_id][col.replace(/\s/g, '') + "_y"]));

    // console.log(__data_score);
    
    // let __data_score = __data.map(row => []);
    // for (let key in __model.allNodes) {
    //   const n = __model.allNodes[key];
    //   if (n.depth == 0) {
    //     const cdf = n.getComputedData()[0].data;
    //     console.log(cdf);
    //   }
    // }

    w.postMessage(__data_score);

    const iter = document.getElementById("tsne-iter");
    const fin = document.getElementById("tsne-fin");

    w.onmessage = function(event) {
      for (let i = 0; i < event.data.output.length; ++i) {
        __data[i]["tsne_x"] = event.data.output[i][0];
        __data[i]["tsne_y"] = event.data.output[i][1];
      }

      chart("#tsne", "tsne_x", "tsne_y");

      iter.innerHTML = "Iterations: " + event.data.iter;
      fin.innerHTML = "Finished: " + ["Yes", "No"][event.data.finished ? 0 : 1]
    };
  } else {
    console.log('Sorry! No Web Worker support..');
  }
}


function charts(evt) {
  let colorSelected = false;  
  // Sort keys in descending order by depth
  const nodeKeys = Object.keys(__model.allNodes).sort((a, b) => __model.allNodes[b].depth - __model.allNodes[a].depth);
  // Iterate through the nodes in the order computed above
  for (let nodeKey of nodeKeys) {
    const n = __model.allNodes[nodeKey];    
    if (n.hasState(n.state)) {
      const id = n.name.replace(/\s/g, '');
      const cdf = n.getComputedData()[0].data;
      
      let count = 0;
      // Initialize the columns that will hold the chart's data
      const xLabel = id + "_x", yLabel = id + "_y";
      for (let i = 0; i < cdf.length; ++i) {
        const item = cdf[i];
        __index[item.id][xLabel] = i;
        __index[item.id][yLabel] = item.val;
      }

      const parent = document.getElementById("charts-col");

      const h = document.createElement("div");
      h.setAttribute("class", "chart-header");
      parent.appendChild(h);

      const title = document.createElement("span");
      title.innerHTML = n.name;
      h.appendChild(title);

      const controls = document.createElement("span");
      controls.setAttribute("class", "control");
      h.appendChild(controls);

      // const sel = document.createElement("select");
      // for (let i = 0; i < 2; ++i) {
      //   const opt = document.createElement("option");
      //   opt.text = ["CDF", "CCDF"][i];
      //   sel.options.add(opt);
      // }
      // controls.appendChild(sel);

      const radio1 = document.createElement("input");
      radio1.setAttribute("type", "radio");
      radio1.setAttribute("value", "color");
      radio1.setAttribute("name", "color");
      controls.appendChild(radio1);

      radio1.onclick = () => colorChanged(cdf);

      if (!colorSelected) {
        colorSelected = true;
        radio1.checked = true;
        radio1.onclick();
      }

      const radio1_label = document.createTextNode("color");
      controls.appendChild(radio1_label);

      // const radio2 = document.createElement("input");
      // radio2.setAttribute("type", "radio");
      // radio2.setAttribute("value", "size");
      // radio2.setAttribute("name", "size");
      // controls.appendChild(radio2);

      // const radio2_label = document.createTextNode("size");
      // controls.appendChild(radio2_label);

      const div = document.createElement("div");
      div.id = id.replace(/\s/g, '');
      parent.appendChild(div);

      chart("#" + id, xLabel, yLabel, 150, true);
    }
  }

}