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

The loading of overall data is separate from plotting.
Once you load the data, plotting does not load new data.
When plotting statistics for an individual article, the data is loaded on the first plot
and not the subsequent ones, so when you change scale, colors, and other settings and re-plot,
the loaded data is reused.

For this reason, try to keep the browser tab open until you no longer need the data.

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
