node-minifier
=====

What is node-minifier used for
-------
a minify tools for web development

单元测试
------
[![travis build status](https://api.travis-ci.org/colorhook/node-minifier.png)](https://www.travis-ci.org/colorhook/node-minifier)

Usage
-------

```
npm install node-minifier
```


> require `node-minifer`

```js
var minifier = require('node-minifier');
```

> 压缩JS
* 使用`UglifyJS2`进行压缩
* 自动保留`/*! ... */`类型的注释
* 保留`$`, `exports`, `require`, `define`不被替换
* 可以自定义需要删除掉的方法调用

```js
//js中有个全局方法名为onMessageFromSWF, 这个方法名称不能被mangle, 可以把它定义成保留字。
//console的所有方法默认被移除，Y.log, Kissy.log, S.log也可以自定义移除。
//不要在console.log调用中改变逻辑，避免产生side effect
var minifiedJS = minifier.minifyJS(jscontent, {
  expect: ['onMessageFromSWF'],
  remove: ['console', 'Y.log', 'Kissy.log', 'S.log']
});


//默认将中文转成Unicode编码，可以通过下面的方式不转码
this.minifyJS(jscontent, {
  ascii_only: false
});
```

> 压缩CSS

```js
var minifiedCSS = minifier.minifyCSS(csscontent);
```

> 压缩HTML

```js
var minifiedHTML = minifier.minifyHTML(htmlcontent);
```

> datauri

```js
var datauriCSS = minifier.datauri(csscontent);
```

> 压缩图片

```js
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