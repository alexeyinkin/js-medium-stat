# js-medium-stat

This script plots your Medium statistics.

## Warning

This script uses the undocumented API, which the Medium frontend uses to access its backend.
Many services nowadays forbid any automation in accessing them on your end.
I have not found such restriction in [Medium's Terms of Service](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f)
but they still may ban you for abusing the API.
Use this at your risk.

## Usage

1. Open any Medium page that has your username. For instance, https://medium.com/@alexey.inkin/followers
2. Press F12 to open Developer Tools of your browser.
3. Read the code carefully because you should never paste untrusted code in your browser console.
   Malicious code pasted that way can steal your access to the currently viewed website, and more.
4. Paste the content of [1_constants.js](1_constants.js) to the console and press Enter.
5. Paste the content of [2_functions.js](2_functions.js) to the console and press Enter.
6. Paste the content of [3_load.js](3_load.js) to the console and press Enter.
7. From [4_plot.js](4_plot.js), paste any lines to the console to plot specific charts you want.

Loading of each story's statistics takes long time.
You can start plotting before it's complete.
Overall account data are quickly loaded before separate stories and can be plotted.
Bubble charts will show only the stories for which all statistics are loaded.

In the end, you should see in console:

```
All statistics are loaded.
```

## Cache

The script caches all historical data in
[local storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API).
These are the following data for past months (to cache the immediately previous month, today should be 2nd+ day):

- Account views and reads.
- Each story's statistics.

The first run takes long time because it makes a query per story per month.
After that, even if you restart the browser, only the following is fetched:

- List of stories.
- Account views and reads for the current month.
- Each story' statistics for the current month.
- Each new story's statistics.

## Quota

On the first loading, you will likely hit the quota:

```
Uncaught (in promise) DOMException: The quota has been exceeded.
```

On my account with 2 years history and 66 stories, I hit it after story 47.

## Chart Size

You can change the aspect ratio in [1_constants.js](1_constants.js)
by changing `width` and `height`. However, these are not the absolute size.

In my test, the absolute size is determined by the browser window.
You can get precise width by turing on "Responsive Design Mode" (Firefox) or "Device Toolbar" (Chrome),
there you can enter the desired screen width. The height will be derived from it.

On Mac, the downloaded charts are twice the width of the screen because of pixel scaling.
I haven't tried it on non-Mac.

## Custom Annotations

In [1_constants.js](1_constants.js), populate the `manualEvents` map.
It will produce vertical lines with the specified text on all overall charts.

For the charts for individual articles, pass the map to the plotting function.

## Gallery

### Followers Bubbles

![Followers Bubbles](examples/followers_bubbles.png)

### Read Ratio Bubbles

![Read Ratio Bubbles](examples/read_ratio_bubbles.png)

### Daily Views

![Daily Views](examples/views.png)

### Daily Views, Weekly Average

![Daily Views, Weekly Average](examples/views_wa.png)

### Daily Reads

![Daily Reads](examples/reads.png)

### Daily Reads, Weekly Average

![Daily Reads, Weekly Average](examples/reads_wa.png)

### Followers

![Followers](examples/followers.png)

### Followers per 1000 Views

![Followers per 1000 Views](examples/followers_per_view.png)

### Followers and Followers per 1000 Views

![Followers](examples/followers_and_per_view.png)

### Story Views

![Followers](examples/views_e13f88ea5461.png)
