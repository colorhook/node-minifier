node-minifier
=====

What is node-minifier used for
-------
a minifier tools for js/css/html/image

µ¥Ôª²âÊÔ
------
[![travis build status](https://api.travis-ci.org/colorhook/node-minifier.png)](https://www.travis-ci.org/colorhook/node-minifier)

Usage
-------

```
npm install node-minifier


```javascript
var minifier = require('node-minifier');

var minifiedJS = minifier.minifyJS(jscontent);

var minifiedCSS = minifier.minifyCSS(csscontent);

var minifiedHTML = minifier.minifyHTML(htmlcontent);

var datauriCSS = minifier.datauri(csscontent);