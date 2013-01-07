var minifier = require('../lib/minifier');

var jscontent = 'var a = 1;console.log(a);'
var minifiedJS = minifier.minifyJS(jscontent);

var csscontent = 'body{a:1}';
var minifiedCSS = minifier.minifyCSS(csscontent);

var htmlcontent = '<html>  </html>';
var minifiedHTML = minifier.minifyHTML(htmlcontent);

var datauriCSS = minifier.datauri(csscontent);

console.log(minifiedJS);

console.log(minifiedCSS);

console.log(minifiedHTML);

console.log(datauriCSS);