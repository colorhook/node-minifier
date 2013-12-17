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

> datauri，支持webp

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

> 压缩png - 使用`optipng`, `pngcrush`, `pngquant`, `advpng`压缩png

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

> 图片压缩统计

| 图片类型（数量）  | 压缩前(byte) | smush.it压缩掉(byte) | pagespeed压缩掉 | optimage压缩掉(byte)  | smush.it平均压缩% | optimage平均压缩% | pagespeed平均压缩% | smush.it总计压缩% | optimage总计压缩% | pagespeed总计压缩% |  
| :---------        | :--------    | :---------           | :---------      | :---------            | :---------        | :---------        | :---------         | :---------        | :---------        | :---------         |
|gif(7)             | 862177       | 26780                | 17074           | 23327                 | 22.49%            | 14.28%            | 6.14%              | 3.11%             | 2.71%             | 1.98%              |
|png(21)            | 108978       | 20544                | 14286           | 39633                 | 46.73%            | 54.48%            | 38.29%             | 18.85%            | 36.37%            | 13.11%             |
|jpg(30)            | 2497858      | 156327               | 210469          | 210469                | 3.48%             | 11.6%             | 11.6%              | 6.26%             | 8.43%             | 8.43%              |

PS: `smush.it`和`pagespeed`的压缩服务会将`gif`格式转换成`png`格式再使用`pngcrush`工具压缩，所以压缩比总体可能会高于`optimage`方法。