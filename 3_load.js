// This script plots your Medium statistics.
// Go to your profile page, e.g. https://medium.com/@alexey.inkin
// Open the browser console (F12) and paste these files in order.

await loadScripts();

let audienceStats = await loadAudienceStats();
let viewsAndReads = await loadViewsAndReads();

let views = extractViews(viewsAndReads);
let reads = extractReads(viewsAndReads);

let followers = mergeManualAndLoadedFollowers();
