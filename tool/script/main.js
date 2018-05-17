import * as typedefs from './typedefs.js';
import { GridboxHeader, LoadEvent } from './grid/Box_Header.js';
import { GridboxStatus } from './grid/Box_Status.js';
import { GridboxGraph } from './grid/Box_Graph.js';
import { GridboxList} from './grid/Box_List.js';


/**
 * This function does the basic stuff. However, we should write own modules
 * for each grid-box and load them here, so it does not get too cluttered.
 * So we stick to the basics here such as init'ing the logging etc.
 */
const run = async() => {
  const gbHeader = new GridboxHeader();
  const gbStatus = new GridboxStatus(gbHeader.observable);
  const gbGraph = new GridboxGraph(gbHeader.observable);
  const gbList = new GridboxList(gbHeader.observable);

  // Instantiate more components here..

  gbHeader.gridboxStatus = gbStatus;
  gbStatus.logger('run');

  // Add more init stuff here..

  // @RAFAEL: For any data you need access, subscribe to the model's observable
  // to get notified of changes. Currently, there is only the progress-event,
  // but feel free to add more in the Enum_Event_Types. But I guess that may
  // not be necessary, because you can listen for progress with value === 1.

  // @RAFAEL: What most likely would be of interest to you is when the graph
  // changed, in particular when the selected files change. You should subscribe
  // to the GridboxGraph's observable's event 'selection'.

  // @RAFAEL: Added for debug purposes, remove later and make proper subscription
  gbGraph.observable.subscribe(evt => {
    // @SEBASTIAN: I'm currently monitoring this to know when the model has finished computing
    charts(evt);
  });
};

export { run };
