// This script plots your Medium statistics.
// Go to your profile page, e.g. https://medium.com/@alexey.inkin
// Open the browser console (F12) and paste these files in order.

// Script loading.

async function loadScripts() {
    await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
    await loadScript('https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns');
    await loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js');
}

async function loadScript(url) {
    return new Promise(function (resolve) {
        const el = document.createElement('script');
        el.type = 'text/javascript';
        el.src = url;
        el.onload = resolve;
        document.head.appendChild(el);
    });
}


// Service functions.

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sortMap(map) {
	const numericArray = Array.from(map); // Key-value pairs.
	numericArray.sort((a, b) => a[0] - b[0]);
	return new Map(numericArray);
}

function weekAverage(map) {
    const result = new Map();

    map.forEach((value, timestamp) => {
    	const floored = floorToMonday(timestamp);
    	result.set(floored, (result.get(floored) || 0) + value / 7);
    });

	return result;
}

function floorToMonday(timestamp) {
  	const date = new Date(timestamp);

  	const daysToMonday = (date.getUTCDay() + 6) % 7; // 0 for Monday, 1 for Tuesday, etc.
  	const millisecondsToSubtract = daysToMonday * millisecondsInDay;

  	date.setTime(date.getTime() - millisecondsToSubtract);
  	date.setUTCHours(0, 0, 0, 0);

  	return date.getTime();
}

function notLaterThanToday(date) {
    const today = getToday();
    return date > today ? today : date;
}

function getToday() {
    const result = new Date();
    result.setUTCHours(0, 0, 0, 0);
    return result;
}

function parseIso8601Date(str) {
    const dateParts = str.split("-");
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // Subtract 1 since months are 0-based
    const day = parseInt(dateParts[2], 10);

    return new Date(Date.UTC(year, month, day, 0, 0, 0));
}

// In logarithmic scale, zero cannot be plotted.
// In my tests, chartjs plots 0.1 instead, which makes the scale smaller.
// This function is called in multiple places to plot 1 instead.
function replaceZeroValues(map, replacement) {
    const result = new Map();

    map.forEach((value, key) => {
        result.set(key, value === 0 ? replacement : value);
    });

    return result;
}

function shortenString(str, maxLength) {
    return str.length > maxLength ? str.substring(0, maxLength - 3) + '…' : str;
}


// Data loading functions.

async function loadAudienceStats() {
    console.log('Loading audience stats.');
    const response = await fetch(`https://medium.com/@${username}/audience/stats/export`);
    const text = await response.text();
    return Papa.parse(text, { header: true })['data'].filter(e => e['period_end'] !== undefined);
}

async function loadViewsAndReads() {
	const result = new Map();
	const now = new Date();
	const year = now.getUTCFullYear();
	let month = now.getUTCMonth();

	while (true) {
		const monthResult = await cachedOrLoad(
		    'MonthlyStatsAndChartQuery',
		    year,
		    month,
		    () => loadMonthViewsAndReads(year, month),
        );
		console.log(monthResult);

        let monthResultSize = 0;
        for (const key in monthResult) {
            result.set(parseInt(key), monthResult[key]);
            monthResultSize++;
        }

		if (monthResultSize == 0) {
		    break;
        }

		month--;
	}

    result.delete(getToday().getTime()); // Today is incomplete, breaks a lot of things.
    return sortMap(result);
}

async function loadMonthViewsAndReads(year, month) {
    const startDate = new Date(Date.UTC(year, month));
	const startTime = startDate.getTime();
	const endTime = (new Date(Date.UTC(year, month + 1))).getTime();

    const effectiveYear = startDate.getUTCFullYear();
    const effectiveMonth = startDate.getUTCMonth();

    console.log(`Loading view and read stats for ${effectiveYear}-${effectiveMonth}, timestamps ${startTime}-${endTime}`);

	const response = await fetch("https://medium.com/_/graphql", {
	    "headers": {
    	    "content-type": "application/json",
    	},
    	"body": `[{
    		"operationName": "MonthlyStatsAndChartQuery",
    		"variables": {
    			"username": "${username}",
    			"input": {
    				"startTime": ${startTime},
    				"endTime": ${endTime}
    			}
    		},
    		"query": "query MonthlyStatsAndChartQuery($username: ID!, $input: UserPostsAggregateStatsInput!) {\\n  user(username: $username) {\\n    id\\n    postsAggregateTimeseriesStats(input: $input) {\\n      __typename\\n      ... on UserPostTimeseriesStats {\\n        totalStats {\\n          viewers\\n          readers\\n          __typename\\n        }\\n        points {\\n          ...MonthlyChart_postStatsPoint\\n          __typename\\n        }\\n        __typename\\n      }\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment MonthlyChart_postStatsPoint on PostStatsPoint {\\n  timestamp\\n  stats {\\n    total {\\n      viewers\\n      readers\\n      __typename\\n    }\\n    __typename\\n  }\\n  __typename\\n}\\n"
    	}]`,
	    "method": "POST",
	});

	const arr = await response.json();
	const points = arr[0].data.user.postsAggregateTimeseriesStats.points;
	const result = {};

	for (const point of points) {
		result[point.timestamp] = point.stats.total;
	}

	return result;
}

async function loadStoriesStats() {
    const result = new Map();
    let after = '';

    while (true) {
        const arr = await loadStoriesStatsPage(after);
        const postsConnection = arr[0].data.user.postsConnection;
        const pageInfo = postsConnection.pageInfo;
        const edges = postsConnection.edges;

        for (const edge of edges) {
            result.set(edge.node.id, edge.node);
        }

        if (!pageInfo.hasNextPage) {
            break;
        }

        after = pageInfo.endCursor;
        await delay(1000);
    }

    return result;
}

async function loadStoriesStatsPage(after) {
    console.log(`Loading stories lifetime stats after: ${after}`);

	const response = await fetch("https://medium.com/_/graphql", {
	    "headers": {
    	    "content-type": "application/json",
    	},
    	"body": `[{
    		"operationName": "LifetimeStoriesStatsQuery",
    		"variables": {
    			"username": "${username}",
    			"first": 10,
    			"after": "${after.replace(/"/g, '\\"')}",
    			"orderBy": {"publishedAt": "DESC"},
    			"filter": {"published": true}
    		},
    		"query": "query LifetimeStoriesStatsQuery($username: ID!, $first: Int!, $after: String!, $orderBy: UserPostsOrderBy, $filter: UserPostsFilter) {\\n  user(username: $username) {\\n    id\\n    postsConnection(\\n      first: $first\\n      after: $after\\n      orderBy: $orderBy\\n      filter: $filter\\n    ) {\\n      edges {\\n        node {\\n          ...LifetimeStoriesStats_post\\n          __typename\\n        }\\n        __typename\\n      }\\n      pageInfo {\\n        endCursor\\n        hasNextPage\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment LifetimeStoriesStats_post on Post {\\n  id\\n  ...StoriesStatsTable_post\\n  ...MobileStoriesStatsTable_post\\n  __typename\\n}\\n\\nfragment StoriesStatsTable_post on Post {\\n  ...StoriesStatsTableRow_post\\n  __typename\\n  id\\n}\\n\\nfragment StoriesStatsTableRow_post on Post {\\n  id\\n  ...TablePostInfos_post\\n  firstPublishedAt\\n  milestones {\\n    boostedAt\\n    __typename\\n  }\\n  isLocked\\n  totalStats {\\n    views\\n    reads\\n    __typename\\n  }\\n  earnings {\\n    total {\\n      currencyCode\\n      nanos\\n      units\\n      __typename\\n    }\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment TablePostInfos_post on Post {\\n  id\\n  title\\n  firstPublishedAt\\n  readingTime\\n  isLocked\\n  visibility\\n  ...usePostUrl_post\\n  ...Star_post\\n  __typename\\n}\\n\\nfragment usePostUrl_post on Post {\\n  id\\n  creator {\\n    ...userUrl_user\\n    __typename\\n    id\\n  }\\n  collection {\\n    id\\n    domain\\n    slug\\n    __typename\\n  }\\n  isSeries\\n  mediumUrl\\n  sequence {\\n    slug\\n    __typename\\n  }\\n  uniqueSlug\\n  __typename\\n}\\n\\nfragment userUrl_user on User {\\n  __typename\\n  id\\n  customDomainState {\\n    live {\\n      domain\\n      __typename\\n    }\\n    __typename\\n  }\\n  hasSubdomain\\n  username\\n}\\n\\nfragment Star_post on Post {\\n  id\\n  creator {\\n    id\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment MobileStoriesStatsTable_post on Post {\\n  id\\n  ...TablePostInfos_post\\n  firstPublishedAt\\n  milestones {\\n    boostedAt\\n    __typename\\n  }\\n  isLocked\\n  totalStats {\\n    reads\\n    views\\n    __typename\\n  }\\n  earnings {\\n    total {\\n      currencyCode\\n      nanos\\n      units\\n      __typename\\n    }\\n    __typename\\n  }\\n  __typename\\n}\\n"
    	}]`,
	    "method": "POST",
	});

    return await response.json();
}

// The old statistics format is for December 2022 and earlier.
async function loadOldStoryStats(postId) {
	const result = new Map();
	const year = 2022;
	let month = 11; // December

	while (true) {
		const monthResult = await cachedOrLoad(
		    `useStatsPostAnteriorChartDataQuery_${postId}`,
		    year,
		    month,
		    () => loadOldMonthStoryStats(postId, year, month),
        );
		console.log(monthResult);

        let monthResultSize = 0;
        for (const key in monthResult) {
            result.set(parseInt(key), monthResult[key]);
            monthResultSize++;
        }

		if (monthResultSize == 0) {
		    break;
        }

		month--;
	}

    return sortMap(result);
}

async function loadOldMonthStoryStats(postId, year, month) {
    const startDate = new Date(Date.UTC(year, month));
	const startTime = startDate.getTime();
	const endTime = (new Date(Date.UTC(year, month + 1))).getTime();

    const effectiveYear = startDate.getUTCFullYear();
    const effectiveMonth = startDate.getUTCMonth();

    console.log(`Loading old stats for story ${postId} ${effectiveYear}-${effectiveMonth}, timestamps ${startTime}-${endTime}`);

	const response = await fetch("https://medium.com/_/graphql", {
	    "headers": {
    	    "content-type": "application/json",
    	},
    	"body": `[{
    		"operationName": "useStatsPostAnteriorChartDataQuery",
    		"variables": {
    			"postId": "${postId}",
                "startAt": ${startTime},
                "endAt": ${endTime}
    		},
    		"query": "query useStatsPostAnteriorChartDataQuery($postId: ID!, $startAt: Long!, $endAt: Long!) {\\n  post(id: $postId) {\\n    id\\n    dailyStats(startAt: $startAt, endAt: $endAt) {\\n      ...anteriorBucketTimestamps_dailyPostStat\\n      __typename\\n    }\\n    earnings {\\n      dailyEarnings(startAt: $startAt, endAt: $endAt) {\\n        ...anteriorBucketTimestamps_dailyPostEarning\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment anteriorBucketTimestamps_dailyPostStat on DailyPostStat {\\n  periodStartedAt\\n  views\\n  internalReferrerViews\\n  memberTtr\\n  __typename\\n}\\n\\nfragment anteriorBucketTimestamps_dailyPostEarning on DailyPostEarning {\\n  periodStartedAt\\n  amount\\n  __typename\\n}\\n"
    	}]`,
	    "method": "POST",
	});

	const arr = await response.json();
	const points = arr[0].data.post.dailyStats;
	const result = {};

	for (const point of points) {
		result[point.periodStartedAt] = point;
	}

	return result;
}

// The new statistics format is for January 2023 and on.
async function loadNewStoryStats(postId) {
	const result = new Map();
	const now = new Date();
	const year = now.getUTCFullYear();
	let month = now.getUTCMonth();

	while (true) {
		const monthResult = await cachedOrLoad(
		    `useStatsPostNewChartDataQuery_${postId}`,
		    year,
		    month,
		    () => loadNewMonthStoryStats(postId, year, month),
        );
		console.log(monthResult);

        let monthResultSize = 0;
        for (const key in monthResult) {
            result.set(key, monthResult[key]);
            monthResultSize++;
        }

		if (monthResultSize == 0) {
		    break;
        }

		month--;

        const effectiveYear = (new Date(Date.UTC(year, month))).getUTCFullYear();
        if (effectiveYear < 2023) {
            break;
        }
	}

    result.delete(getToday().getTime()); // Today is incomplete, breaks a lot of things.
    return sortMap(result);
}

async function loadNewMonthStoryStats(postId, year, month) {
    const startDate = new Date(Date.UTC(year, month));
	const startTime = startDate.getTime();
	const endTime = (new Date(Date.UTC(year, month + 1))).getTime();

    const effectiveYear = startDate.getUTCFullYear();
    const effectiveMonth = startDate.getUTCMonth();

    console.log(`Loading new stats for story ${postId} ${effectiveYear}-${effectiveMonth}, timestamps ${startTime}-${endTime}`);

	const response = await fetch("https://medium.com/_/graphql", {
	    "headers": {
    	    "content-type": "application/json",
    	},
    	"body": `[{
    		"operationName": "useStatsPostNewChartDataQuery",
    		"variables": {
    			"postId": "${postId}",
                "startAt": ${startTime},
                "endAt": ${endTime},
                "postStatsDailyBundleInput": {
                    "postId": "${postId}",
                    "fromDayStartsAt": ${startTime},
                    "toDayStartsAt": ${endTime}
                }
    		},
    		"query": "query useStatsPostNewChartDataQuery($postId: ID!, $startAt: Long!, $endAt: Long!, $postStatsDailyBundleInput: PostStatsDailyBundleInput!) {\\n  post(id: $postId) {\\n    id\\n    earnings {\\n      dailyEarnings(startAt: $startAt, endAt: $endAt) {\\n        ...newBucketTimestamps_dailyPostEarning\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n  postStatsDailyBundle(postStatsDailyBundleInput: $postStatsDailyBundleInput) {\\n    buckets {\\n      ...newBucketTimestamps_postStatsDailyBundleBucket\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment newBucketTimestamps_dailyPostEarning on DailyPostEarning {\\n  periodStartedAt\\n  amount\\n  __typename\\n}\\n\\nfragment newBucketTimestamps_postStatsDailyBundleBucket on PostStatsDailyBundleBucket {\\n  dayStartsAt\\n  membershipType\\n  readersThatReadCount\\n  readersThatViewedCount\\n  readersThatClappedCount\\n  readersThatRepliedCount\\n  readersThatHighlightedCount\\n  readersThatInitiallyFollowedAuthorFromThisPostCount\\n  __typename\\n}\\n"
    	}]`,
	    "method": "POST",
	});

	const arr = await response.json();
	const buckets = arr[0].data.postStatsDailyBundle.buckets;
	const result = {};

	for (const bucket of buckets) {
	    const key = `${bucket.dayStartsAt}_${bucket.membershipType}`;
		result[key] = bucket;
	}

	return result;
}

function mergeManualAndLoadedFollowers() {
    const result = new Map();

    result.set(viewsAndReads.keys().next().value, 0);

    for (const data of audienceStats) {
        const date = parseIso8601Date(data['period_end']);
        date.setTime(date.getTime() + millisecondsInDay);

        result.set(
            notLaterThanToday(date).getTime(),
            parseInt(data['followers_total'], 10),
        );
    }

    manualFollowerMilestones.forEach((value, date) => {
        result.set(date.getTime(), value);
    });

    return sortMap(result);
}

function addZerosOnMissingDates(map) {
    const result = new Map(map);
    const today = getToday().getTime();

    let timestamp = Array.from(map.keys())[0];
    while (timestamp < today) {
        if (!result.has(timestamp)) {
            result.set(timestamp, 0);
        }
        timestamp += millisecondsInDay;
    }

    return sortMap(result);
}

function extractViews(viewsAndReads) {
    const result = new Map();

    viewsAndReads.forEach((value, timestamp) => {
        result.set(timestamp, value['viewers']);
    });

    const resultWithZeros = addZerosOnMissingDates(result);
    resultWithZeros.delete(getToday().getTime()); // Today is incomplete, breaks a lot of things.
    return resultWithZeros;
}

function extractReads(viewsAndReads) {
    const result = new Map();

    viewsAndReads.forEach((value, timestamp) => {
        result.set(timestamp, value['readers']);
    });

    const resultWithZeros = addZerosOnMissingDates(result);
    resultWithZeros.delete(getToday().getTime()); // Today is incomplete, breaks a lot of things.
    return resultWithZeros;
}

function extractOldStoryViews(stats) {
    const result = new Map();

    stats.forEach((value, timestamp) => {
        result.set(timestamp, value['views']);
    });

    const resultWithZeros = addZerosOnMissingDates(result);
    return resultWithZeros;
}

function extractNewStoryViews(stats) {
    const result = new Map();

    stats.forEach((value, key) => {
        const timestamp = value['dayStartsAt'];
        result.set(timestamp, value['readersThatViewedCount'] + (result.get(timestamp) || 0));
    });

    const resultWithZeros = addZerosOnMissingDates(result);
    resultWithZeros.delete(getToday().getTime()); // Today is incomplete, breaks a lot of things.
    return sortMap(resultWithZeros);
}

function getLastKeyWhereLess(map, threshold) {
    let result = undefined;

    map.forEach((value, key) => {
        if (value < threshold) result = key;
    });

    return result;
}

function makeOverallAnnotations() {
    return {
        ...makeStoriesAnnotations(),
        ...makeLastViewsAnnotations(),
        ...makeBoostAnnotations(),
        ...makeManualEventsAnnotations(),
    };
}

function makeStoriesAnnotations() {
    const result = {};

    for (const [id, st] of storiesStats) {
        result[annotationIndex++ + ''] = makeVerticalAnnotation(new Date(st.firstPublishedAt), storyColor + '60');
    }

    return result;
}

function makeLastViewsAnnotations() {
    return makeVerticalAnnotations(getLastViewsEvents());
}

function makeBoostAnnotations() {
    const result = new Map();

    for (const [id, st] of storiesStats) {
        for (const timestamp of st.milestones.boostedAt) {
            result.set(new Date(timestamp), 'Boost');
        }
    }

    return makeVerticalAnnotations(result);
}

function makeManualEventsAnnotations() {
    return makeVerticalAnnotations(manualEvents);
}

function getLastViewsEvents() {
    const result = new Map();

    const lastTimestamp = Array.from(views.keys()).pop();
    const lastViews = Array.from(views.values()).pop();

    let threshold = 1;
    while (threshold < lastViews) {
        const timestamp = getLastKeyWhereLess(views, threshold);

        if (timestamp !== undefined) {
            if (timestamp === lastTimestamp) {
                break; // Don't clutter the end of the chart.
            }

            result.set(timestamp, threshold === 1 ? 'Last no views' : `Last <${threshold} views`);
        }
        threshold *= 10;
    }

    return result;
}

async function cachedOrLoad(key, year, month, callback) {
    const date = new Date(Date.UTC(year, month));

    if (!canDateBeCached(date)) {
        return await callback();
    }

    const effectiveYear = date.getUTCFullYear();
    const effectiveMonth = date.getUTCMonth();
    const fullKey = `stat_${username}_${key}_${effectiveYear}_${effectiveMonth}`;

    const cached = window.localStorage.getItem(fullKey);
    if (cached !== null) {
        console.log(`Retrieved from cache: ${fullKey}`);
        return JSON.parse(cached);
    }

    const result = await callback();
    window.localStorage.setItem(fullKey, JSON.stringify(result));
    console.log(`Stored in cache: ${fullKey}`);
    await delay(1000); // Avoid abusing the API.
    return result;
}

function canDateBeCached(date) {
    // Allow to cache last month and older if it's 2nd day today.
    const month = date.getUTCFullYear() * 12 + date.getUTCMonth();
    const today = getToday();
    const thisMonth = today.getUTCFullYear() * 12 + today.getUTCMonth();

    if (thisMonth < month) {
        throw new Error('Must never try to cache the future');
    }

    if (thisMonth === month) {
        return false;
    }

    if (thisMonth - month === 1) {
        return today.getUTCDate() > 1;
    }

    return true;
}

// Plot functions.

function makeDataset(map, color, fillColor, title) {
    const points = [];

    map.forEach((value, timestamp) => {
        points.push({
            x: new Date(timestamp),
            y: value,
        });
    });

    return {
        label: title,
        data: points,
        fill: true,
        backgroundColor: fillColor,//Utils.transparentize(color, 0.5),
        borderColor: color,
        borderWidth: 1,
        tension: 0.1,
        showLine: true,
        yAxisID: 'y',
    }
}

function makeVerticalAnnotation(date, color, text) {
    return {
        type: 'line',
        borderColor: color,
        borderWidth: 1,
        label: text === undefined ? undefined : {
            display: true,
            color: '#fff',
            backgroundColor: 'rgb(0, 0, 0, .75)',
            content: text,
            position: 'start',
            font: {size: 9},
            rotation: -90,
            padding: {
                left: 3,
                right: 3,
                top: 0,
                bottom: 0,
            },
        },
        scaleID: 'x',
        value: date,
    };
}

function makeVerticalAnnotations(events) {
    const result = {};

    events.forEach((title, timestamp) => {
        result[annotationIndex++ + ''] = makeVerticalAnnotation(new Date(timestamp), 'black', title);
    });

    return result;
}

async function plotAndDownload(datasets, log, annotations, extraScales) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets,
        },
        options: {
        	animation: false,
        	elements: {
                point:{
                    radius: 0,
                },
            },
            legend: {
                display: false,
            },
            plugins: {
                annotation: {
                    annotations: annotations,
                    clip: false,
                },
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                    }
                },
                y: {
        			type: log ? 'logarithmic' : undefined,
      			},
      			...(extraScales || {}),
            }
        }
    });

    await delay(1000); // Let it draw.

    const imageUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = imageUrl;
    downloadLink.download = 'chart.png';

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    document.body.removeChild(canvas);
}


// Specific plot functions.

async function plotFollowers() {
    await plotAndDownload(
        [getFollowersDataset()],
        true,
        makeOverallAnnotations(),
    );
}

async function plotViews() {
    await plotAndDownload(
        [getViewsDataset()],
        true,
        makeOverallAnnotations(),
    );
}

async function plotViewsWeekAverage() {
    await plotAndDownload(
        [getViewsWeekAverageDataset()],
        true,
        makeOverallAnnotations(),
    );
}

async function plotReads() {
    await plotAndDownload(
        [getReadsDataset()],
        true,
        makeOverallAnnotations(),
    );
}

async function plotReadsWeekAverage() {
    await plotAndDownload(
        [getReadsWeekAverageDataset()],
        true,
        makeOverallAnnotations(),
    );
}

async function plotViewsAndReads() {
    await plotAndDownload(
        [getReadsDataset(), getViewsDataset()],
        true,
        makeOverallAnnotations(),
    );
}

async function plotViewsAndReadsWeekAverage() {
    await plotAndDownload(
        [getReadsWeekAverageDataset(), getViewsWeekAverageDataset()],
        true,
        makeOverallAnnotations(),
    );
}

function getFollowersDataset() {
    return makeDataset(
        replaceZeroValues(followers, 1),
        followersColor,
        followersColor + '80',
        'Followers',
    );
}

function getViewsDataset() {
    return makeDataset(
        replaceZeroValues(views, 1),
        viewsColor,
        viewsColor + '80',
        'Daily Views',
    );
}

function getViewsWeekAverageDataset() {
    return makeDataset(
        replaceZeroValues(weekAverage(views), 1),
        viewsColor,
        viewsColor + '80',
        'Daily Views, Weekly Average',
    );
}

function getReadsDataset() {
    return makeDataset(
        replaceZeroValues(reads, 1),
        readsColor,
        readsColor + '80',
        'Daily Reads',
    );
}

function getReadsWeekAverageDataset() {
    // Here we can't replace zeros with ones because views can be less than 1.
    // In that case putting reads at 1 will show reads above views.
    const minViews = Math.min(...weekAverage(views).values());

    return makeDataset(
        replaceZeroValues(weekAverage(reads), minViews),
        readsColor,
        readsColor + '80',
        'Daily Reads, Weekly Average',
    );
}

async function plotStoryViews(postId, events) {
    await loadStoryStatsIfNot(postId);

    await plotAndDownload(
        [getStoryViewsDataset(postId)],
        false,
        makeVerticalAnnotations(mergeManualAndLoadedStoryEvents(postId, events)),
        getStoryExtraAxes(postId),
    );
}

async function loadStoryStatsIfNot(postId) {
    const st = storiesStats.get(postId);
    if (st === undefined) {
        throw new Error('Story not found: ' + postId);
    }

    if (!newStoryStats.has(postId)) {
        newStoryStats.set(postId, await loadNewStoryStats(postId));
        oldStoryStats.set(postId, await loadOldStoryStats(postId));
    }
}

function mergeManualAndLoadedStoryEvents(postId, manualEvents) {
    const st = storiesStats.get(postId);
    let result = new Map(manualEvents || []);

    for (const timestamp of st.milestones.boostedAt) {
        result.set(new Date(timestamp), 'Boost');
    }

    return result;
}

function getStoryExtraAxes(postId) {
    const st = storiesStats.get(postId);
    const result = {};

    if (shouldMarkDays(st['firstPublishedAt'])) {
        result['x'] = {
            type: 'time',
            time: {
                unit: 'day',
            }
        };
    }

    return result;
}

function shouldMarkDays(timestamp) {
    if (((new Date()).getTime() - timestamp) / 1000 / 60 / 60 / 24 < maxDaysToMarkDays) {
        return true;
    }

    return false;
}

function getStoryViewsDataset(postId) {
    const title = storiesStats.get(postId)['title'];

    return makeDataset(
        new Map([
            ...extractOldStoryViews(oldStoryStats.get(postId)),
            ...extractNewStoryViews(newStoryStats.get(postId)),
        ]),
        viewsColor,
        viewsColor + '80',
        title === undefined ? 'Views' : `Views: ${title}`,
    );
}

async function plotFollowersPerView() {
    await plotAndDownload(
        [getFollowersPerViewDataset()],
        false,
        {...makeLastViewsAnnotations(), ...makeManualEventsAnnotations()},
    );
}

async function plotFollowersAndPerView() {
    const followersDataset = getFollowersDataset();
    followersDataset['yAxisID'] = 'y1';

    const y1Scale = {
        position: 'right',
        type: 'logarithmic',
        grid: {
            drawOnChartArea: false, // only want the grid lines for one axis to show up
        },
    };

    await plotAndDownload(
        [getFollowersPerViewDataset(), followersDataset],
        false,
        {...makeLastViewsAnnotations(), ...makeManualEventsAnnotations()},
        {y1: y1Scale},
    );
}

function getFollowersPerViewDataset() {
    const data = new Map();
    const viewsIterator = views.entries();
    let viewsEntry = viewsIterator.next();
    let lastFollowers = 0;

    for (const [endTimestamp, followersAtTimestamp] of followers) {
        let viewsInPeriod = 0;

        while (!viewsEntry.done) {
            const [viewsEntryTimestamp, viewsEntryValue] = viewsEntry.value;

            if (viewsEntryTimestamp >= endTimestamp) {
                break;
            }

            viewsInPeriod += viewsEntryValue;
            viewsEntry = viewsIterator.next();
        }

        let netFollowersInPeriod = followersAtTimestamp - lastFollowers;

        const periodValue = netFollowersInPeriod / viewsInPeriod;
        data.set(endTimestamp, isNaN(periodValue) ? 0 : periodValue * followersPerViewMultiplier);

        lastFollowers = followersAtTimestamp;
    }

    console.log(data);

    const dataset = makeDataset(
        data,
        followersPerViewColor,
        followersPerViewColor + '80',
        followersPerViewMultiplier === 1 ? 'Followers per View' : `Followers per ${followersPerViewMultiplier} Views`,
    );
    dataset['stepped'] = 'after';

    return dataset;
}

async function plotStoryFollowersPerView(postId, events) {
    await loadStoryStatsIfNot(postId);

    await plotAndDownload(
        [getStoryFollowersPerViewDataset(postId)],
        false,
        makeVerticalAnnotations(mergeManualAndLoadedStoryEvents(postId, events)),
        getStoryExtraAxes(postId),
    );
}

async function plotStoryViewsAndFollowersPerView(postId, events) {
    const followersDataset = getStoryFollowersPerViewDataset(postId);
    followersDataset['yAxisID'] = 'y1';

    const y1Scale = {
        position: 'right',
        grid: {
            drawOnChartArea: false, // only want the grid lines for one axis to show up
        },
    };

    await plotAndDownload(
        [getStoryViewsDataset(postId), followersDataset],
        false,
        makeVerticalAnnotations(mergeManualAndLoadedStoryEvents(postId, events)),
        {y1: y1Scale, ...getStoryExtraAxes(postId)},
    );
}

function getStoryFollowersPerViewDataset(postId) {
    const title = storiesStats.get(postId)['title'];
    const views = new Map();
    const followers = new Map();

    for (const [key, value] of newStoryStats.get(postId)) {
        const dayTimestamp = value['dayStartsAt'];
        const date = new Date(dayTimestamp);
        date.setUTCDate(1);
        const monthTimestamp = date.getTime();

        views.set(monthTimestamp, value['readersThatViewedCount'] + (views.get(monthTimestamp) || 0))
        followers.set(monthTimestamp, value['readersThatInitiallyFollowedAuthorFromThisPostCount'] + (followers.get(monthTimestamp) || 0))
    }

    const data = new Map();

    for (const [timestamp, dayViews] of views) {
        data.set(timestamp, dayViews === 0 ? 0 : followers.get(timestamp) * followersPerViewMultiplier / dayViews);
    }

    const sorted = sortMap(data);
    const lastValue = Array.from(sorted.values()).pop();
    sorted.set(getToday().getTime(), lastValue);

    const dataset = makeDataset(
        sorted,
        followersPerViewColor,
        followersPerViewColor + '80',
        `Followers per ${followersPerViewMultiplier === 1 ? 'View' : `${followersPerViewMultiplier} Views`}: ${title}`,
    );
    dataset['stepped'] = 'before';

    return dataset;
}

async function plotStoriesReadRatioBubbles() {
    const dataset = getStoriesReadRatioBubblesDataset();

    await plotAndDownload(
        [dataset],
        false,
        makeBubbleLabelAnnotations(dataset.data),
    );
}

function getStoriesReadRatioBubblesDataset() {
    const points = [];
    const maxViews = getMaxViews();

    for (const [id, st] of storiesStats) {
        const views = st.totalStats.views;
        const r = Math.sqrt(views / maxViews) * maxBubbleRadius;
        points.push({
            x: new Date(st.firstPublishedAt),
            y: views === 0 ? 0 : st.totalStats.reads / views,
            r: r,
            title: st.title,
        });
    }

    return makeBubbleDataset(
        points,
        readsColor,
        readsColor + '80',
        'Size = Views, Y = Read Ratio',
    );
}

async function plotStoriesFollowersBubbles() {
    const dataset = getStoriesFollowersBubblesDataset();

    await plotAndDownload(
        [dataset],
        false,
        makeBubbleLabelAnnotations(dataset.data),
    );
}

function getStoriesFollowersBubblesDataset() {
    const points = [];
    const maxViews = getMaxViews();

    for (const [id, st] of storiesStats) {
        if (!newStoryStats.has(id)) {
            continue;
        }

        const views = st.totalStats.views;
        const r = Math.sqrt(views / maxViews) * maxBubbleRadius;
        points.push({
            x: new Date(st.firstPublishedAt),
            y: getStoryFollowersPerView(id) * followersPerViewMultiplier,
            r: r,
            title: st.title,
        });
    }

    return makeBubbleDataset(
        points,
        followersColor,
        followersColor + '80',
        `Size = Views, Y = Followers per ${followersPerViewMultiplier === 1 ? 'View' : `${followersPerViewMultiplier} Views`}`,
    );
}

function getStoryFollowersPerView(postId) {
    let followers = 0;
    let views = 0;

    console.log('Getting followers per view for article: ' + postId);
    for (const [key, value] of newStoryStats.get(postId)) {
        views += value.readersThatViewedCount;
        followers += value.readersThatInitiallyFollowedAuthorFromThisPostCount;
    }

    return views === 0 ? 0 : followers / views;
}

function getMaxViews() {
    let result = 0;

    for (const [id, st] of storiesStats) {
        const views = st.totalStats.views;

        if (views > result) {
            result = views;
        }
    }

    return result;
}

function makeBubbleDataset(points, color, fillColor, title) {
    return {
        type: 'bubble',
        label: title,
        data: points,
        fill: true,
        backgroundColor: fillColor,//Utils.transparentize(color, 0.5),
        borderColor: color,
        borderWidth: 1,
//        tension: 0.1,
//        showLine: true,
        yAxisID: 'y',
    }
}

function makeBubbleLabelAnnotations(data) {
    const result = {};

    for (const point of data) {
        result[annotationIndex++ + ''] = makeLabelAnnotation(point.x, point.y, point.title);
    }

    return result;
}

function makeLabelAnnotation(date, value, text) {
    return {
        type: 'label',
        xValue: date,
        yValue: value,
        content: shortenString(text, maxBubbleTitleLength),
        font: {
            size: 6,
        }
    };
}
