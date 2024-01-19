// This script plots your Medium statistics.
// Go to your profile page, e.g. https://medium.com/@alexey.inkin

// Plot specific charts you want:

plotStoriesFollowersBubbles();
plotStoriesFollowersBubbles(['7c9a6dd4dc7c', 'bd447ed4318e', 'a3a2ccc7a942']);

plotStoriesReadRatioBubbles();
plotStoriesReadRatioBubbles(['7c9a6dd4dc7c', 'bd447ed4318e', 'a3a2ccc7a942']);

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
