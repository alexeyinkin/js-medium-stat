// This script plots your Medium statistics.
// Go to your profile page, e.g. https://medium.com/@alexey.inkin
// Open the browser console (F12) and paste these files in order.

// Edit this file to your needs.

// This resolution only sets the aspect ratio of charts.
// The actual size is determined by the browser's window width.
let width = 1920;
let height = 1080;

// The script will extract your monthly followers because Medium does not report them daily.
// You may want to manually mark 100, 200, etc. followers if you remember the dates you hit that.
// Add those milestones here. Don't make them too frequent because by the end of the day
// you had more followers than the milestone. This distorts metrics like 'Followers per 1000 views'.
// Generally, maintaining ~5+ days between the milestones is fine.
// Start with this map empty and experiment if everything else is fine.
// This only adds points to charts but does not annotate them.
let manualFollowerMilestones = new Map([
//    [new Date(Date.UTC(2022, 11, 13)),  100], //  2022-12-13
//    [new Date(Date.UTC(2022, 11, 24)),  200], //  2022-12-24
//    [new Date(Date.UTC(2023,  5,  8)),  300], //  2023-06-08
//    [new Date(Date.UTC(2023,  8,  9)),  500], //  2023-09-09
//    [new Date(Date.UTC(2023,  9, 13)),  600], //  2023-10-13
//    [new Date(Date.UTC(2023, 11,  5)),  700], //  2023-12-05
//    [new Date(Date.UTC(2023, 11, 26)),  800], //  2023-12-26 // These
//    [new Date(Date.UTC(2023, 11, 28)),  900], //  2023-12-28 // are
//    [new Date(Date.UTC(2023, 11, 30)), 1000], //  2023-12-30 // too
//    [new Date(Date.UTC(2024,  0,  2)), 1100], //  2024-01-02 // frequent
//    [new Date(Date.UTC(2024,  0,  9)), 1200], //  2024-01-09
//    [new Date(Date.UTC(2024,  0, 10)), 1400], //  2024-01-10
//    [new Date(Date.UTC(2024,  0, 11)), 1500], //  2024-01-11
//    [new Date(Date.UTC(2024,  0, 13)), 1600], //  2024-01-10
]);

// Custom annotations at specific points in time.
let manualEvents = new Map([
    [new Date(Date.UTC(2023,  6, 29)), 'GDE'],        //  2023-07-29
]);

let followersColor = '#ff0000';
let viewsColor = '#437aff';
let readsColor = '#34aa45';
let followersPerViewColor = '#ff00ff';
let storyColor = '#000000';


// The rest you don't need to edit.
// This code should be in '2_functions.js', but Firefox has a bug
// that would not declare some functions if pasted together with assignments.

let username = window.location.href.match(/@([^\/]*)(\/|$)/)[1]; // From '@' till '/' or end.

const millisecondsInDay = 24 * 60 * 60 * 1000;

let oldStoryStats = new Map();
let newStoryStats = new Map();

let audienceStats = undefined;
let viewsAndReads = undefined;
let storiesStats = undefined;

let views = undefined;
let reads = undefined;
let followers = undefined;

let annotationIndex = 0;
let maxDaysToMarkDays = 50;
let followersPerViewMultiplier = 1000;

let maxBubbleTitleLength = 40;
let maxBubbleRadius = 50;

let scriptsLoaded = false;
