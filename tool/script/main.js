import * as typedefs from './typedefs.js';
import { GridboxHeader, LoadEvent } from './grid/Box_Header.js';
import { GridboxStatus } from './grid/Box_Status.js';
import { GridboxGraph } from './grid/Box_Graph.js';

/**
 * This function does the basic stuff. However, we should write own modules
 * for each grid-box and load them here, so it does not get too cluttered.
 * So we stick to the basics here such as init'ing the logging etc.
 */
const run = async() => {
  const gbHeader = new GridboxHeader();
  const gbStatus = new GridboxStatus(gbHeader.observable);
  const gbGraph = new GridboxGraph(gbHeader.observable);

  // Instantiate more components here..

  gbHeader.gridboxStatus = gbStatus;
  gbStatus.logger('run');

  // Add more init stuff here..
  
  // @RAFAEL: In your components, just subscribe to the observable of the
  // header's component (gbHeader.observable). Any event it emits will have
  // the dataset and the model that we should use. Then you can also subs-
  // cribe on the model or its nodes (whatever is required there).

  // @RAFAEL: For any data you need access, subscribe to the model's observable
  // to get notified of changes. Currently, there is only the progress-event,
  // but feel free to add more in the Enum_Event_Types. But I guess that may
  // not be necessary, because you can listen for progress with value === 1.

  // @RAFAEL: What most likely would be of interest to you is when the graph
  // changed, in particular when the selected files change. You should subscribe
  // to the GridboxGraph's observable's event 'selection'.

  // @RAFAEL: Added for debug purposes, remove later and make proper subscription
  gbGraph.observable.subscribe(evt => {
    console.log(evt);
  });
};

export { run };
