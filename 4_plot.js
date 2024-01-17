// This script plots your Medium statistics.
// Go to your profile page, e.g. https://medium.com/@alexey.inkin

// Plot specific charts you want:

plotStoriesReadRatioBubbles();

plotViews();
plotViewsWeekAverage();

plotReads();
plotReadsWeekAverage();

plotViewsAndReads();
plotViewsAndReadsWeekAverage();

plotFollowers();
plotFollowersPerView();
plotFollowersAndPerView();

plotStoryViews('e13f88ea5461');
plotStoryViews('a3a2ccc7a942', new Map([[new Date('2024-01-12'), 'Newsletter']]));

plotStoryFollowersPerView('e13f88ea5461');

plotStoryViewsAndFollowersPerView('e13f88ea5461')
