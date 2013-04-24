node-minifier
=====

What is node-minifier used for
-------
a minifier tools for js/css/html/image

单元测试
------
[![travis build status](https://api.travis-ci.org/colorhook/node-minifier.png)](https://www.travis-ci.org/colorhook/node-minifier)

Usage
-------

```
npm install node-minifier
```


```javascript
var minifier = require('node-minifier');

//压缩JS
var minifiedJS = minifier.minifyJS(jscontent);

//压缩CSS
var minifiedCSS = minifier.minifyCSS(csscontent);

//压缩HTML
var minifiedHTML = minifier.minifyHTML(htmlcontent);

//datauri
var datauriCSS = minifier.datauri(csscontent);

//压缩图片
minifier.minifyImage('logo.png', 'logo.min.png', function(e, data){
  if(e){
    console.log(e);
  }else{
    console.log(data.msg);
  }
});
```