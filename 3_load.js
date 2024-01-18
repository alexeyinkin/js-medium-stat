// This script plots your Medium statistics.
// Go to your profile page, e.g. https://medium.com/@alexey.inkin
// Open the browser console (F12) and paste these files in order.

// This function loads all the data.
// It uses cache for complete years and fetches fresh data for incomplete years.
// Use this when you want the fresh data and to update the cache.
await loadAllFresh();

// This function loads all the data.
// On the first run, if nothing is cached, it behaves like the above.
// Otherwise, for each piece of data it uses a cached copy if available
// even if it is for an incomplete period.
// For stories and periods with no cached data at all, fresh data is fetched.
await loadAllCachedIncomplete();

// This function loads all the data from cache only. No requests to Medium are made.
// If anything is not cached, empty data is loaded for that metric:
// no followers, no stories, or no views or anything for a story.
// Use this for experiments to not consume the API quota at all.
await loadAllCachedOnly();
