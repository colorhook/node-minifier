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


图片压缩
---------
`minifyImage`方法会先尝试使用`optimage`方法压缩图片，如果失败，则降级到使用`smushit`方法压缩。

* `optimage` - 使用本地的压缩工具压缩。
* `smushit` - 使用[`smush.it`](http://smush.it/) API进行压缩。


> 压缩jpg - 使用`jpegtran`压缩jpg

```js
minifier.optimage('input.jpg', 'output.jpg', function(err, data){
    console.log(data.saved);
});
```

> 压缩png - 使用`optipng`, `pngcrush`, `pngquant`压缩png

```js
minifier.optimage('input.png', 'output.png', function(err, data){
    console.log(data.saved);
});
```

> 压缩gif - 使用`gifsicle`压缩gif

```js
minifier.optimage('input.gif', 'output.gif', function(err, data){
    console.log(data.saved);
});
```