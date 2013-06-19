var path = require('path');
var fs = require('fs');

var fileutil = require('fileutil');

var REGEXP_BACKGROUND = exports.REGEXP_BACKGROUND = /([\w\-]+\s*:\s*[\#\w\d]*\s*)(url\s*\((?!\s*data:).+\)\s*[\w%\s,\-]*)+(;|(?=\}))/gi;
var REGEXP_IMAGE = exports.REGEXP_IMAGE = /url\s*\(\s*["']?\s*([^\(\)]*)\.(cur|png|jpg|jpeg|gif)\s*["']?\s*\)/gi;

//`uglify-js`压缩掉了`/*! */`这种注释，需要hack补回来
var getCopyright = function (input) {
  var jsp = require("uglify-js").parser;
  var tok = jsp.tokenizer(input);
  var show_copyright = function (comments) {
    var c = comments[0];
    if (c && c.type != "comment1" && c.value[0] == '!') {
      return "/*" + c.value + "*/";
    }
    return "";
  }
  return show_copyright(tok().comments_before);
}

//去掉console.log, Y.log
var ast_squeeze_console = function (ast, options) {
  var pro = require("uglify-js").uglify;
  options = options || {};
  var w = pro.ast_walker();
  var walk = w.walk;
  var targetList = options.targetList || [];
  var methodList = ['log', 'info', 'debug', 'warn', 'error'];
  if (!targetList.length) {
    return ast;
  }
  return w.with_walkers({
    stat: function (stmt) {
      if (stmt[0] === 'call' && stmt[1][0] == 'dot' && 
          stmt[1][1] instanceof Array && 
          stmt[1][1][0] == 'name' && 
          targetList.indexOf(stmt[1][1][1]) != -1 &&
          methodList.indexOf(stmt[1][2]) != -1) {
        return ["block"];
      }
      return ["stat", walk(stmt)];
    },

    call: function (expr, args) {
      var isLog = false;

      if (expr[0] != 'dot' && expr[0] != 'sub') {
        return;
      }

      //console.log
      if (!isLog) {
        isLog = expr[1] instanceof Array && 
            expr[1][0] == 'name' && 
            targetList.indexOf(expr[1][1]) != -1 &&
            methodList.indexOf(expr[2]) != -1;
      }
       
      //window.console.log
      if (!isLog) {
        isLog = expr[1] instanceof Array && 
            expr[1][1] instanceof Array && 
            expr[1][1][0] == 'name' && 
            expr[1][1][1] == 'window' && 
            targetList.indexOf(expr[1][2]) != -1 &&
            methodList.indexOf(expr[2]) != -1;
      }

      if (isLog) {
        return ["atom", "0"];
      }
    }
  }, function () {
    return walk(ast);
  });
}
//合并参数
var merge = function () {
  var i = 0;
  var len = arguments.length;
  var result = {};
  var key, obj;

  for (; i < len; ++i) {
    obj = arguments[i];
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = obj[key];
      }
    }
  }
  return result;
}
/**
@method minifyJS
@param {String} filecontent js代码
@param {Object} options 压缩配置项
    @param {Boolean} options.copyright 保留顶部的copyright，默认为true
    @param {Array} logTargetList 移除掉log信息的target对象字符串，默认是['console']
@example
    
    var jscontent = fileutil.read('my.js');
    var minifycontent = this.minifyJS(jscontent);
    //移除掉Y.log, Y.info...
    minifycontent = this.minifyJS(jscontent, {
      logTargetList: ['console', 'Y']
    });

**/
exports.minifyJS = function (filecontent, options) {
  var jsp = require("uglify-js").parser;
  var pro = require("uglify-js").uglify;
  options = merge({
    logTargetList: ['console'],
    copyright: true
  }, options);
  var ast = jsp.parse(filecontent); //解析代码获取AST
  if (options.logTargetList) {
    //去掉console.log
    ast = ast_squeeze_console(ast, {
      targetList: options.logTargetList
    });
  }
  ast = pro.ast_mangle(ast); //获取整理变量名后的AST
  ast = pro.ast_squeeze(ast); //获取压缩优化过的AST
  if (options.copyright) {
    return getCopyright(filecontent) + pro.gen_code(ast) + ";";
  }
  return pro.gen_code(ast) + ";"; //压缩代码
}
/**
@method minifyCSS
@param {String} filecontent css代码
@param {Object} options 压缩配置项
    @param {Boolean} options.datauri 是否使用datauri编码，默认为true
@example
    
    var csscontent = fileutil.read('my.css');
    var minifycontent = this.minifyJS(csscontent);

**/
exports.minifyCSS = function (filecontent, options) {
  var csso = require('csso');
  options = merge({
    datauri: true
  }, options);
  if (options.datauri) {
    filecontent = this.datauri(filecontent, options);
  }
  return csso.justDoIt(filecontent);
}
/**
@method minifyImage
@param {String} input 图片输入地址
@param {String} output 图片输出地址
@param {Object} options 配置参数
    @param {Boolean} options.service 压缩服务http地址，默认使用!Yahoo的smush.it服务
@example
    
    this.minifyImage('logo.png', 'logo.png', function(e, data){
        if(e){
          console.log(e);
        }else{
          console.log(data.msg);
        }
    });

**/
exports.minifyImage = function (input, output, callback, options) {
  var smushit = require('node-smushit').smushit;
  options = merge({}, options);
  smushit(input, {
    service: options.service,
    output: output,
    onItemComplete: function (e, item, response) {
      if (e) {
        callback && callback(e);
        return;
      }
      if (response) {
        var percent;
        if (response.error == 'No savings') {
          percent = '0'.magenta;
          if (path.relative(input) != path.relative(output)) {
            fileutil.copy(input, path.dirname(output));
          }
        } else {
          percent = response.percent;
        }
        callback && callback(null, {
          msg: 'smush ' + path.normalize(input) + ': saving ' + percent + '%'
        });
      }
    },
    verbose: false
  });
}

/**
@method minifyHTML
@param {String} filecontent html代码
@param {Object} options 压缩配置项

@example
    
    var htmlcontent = fileutil.read('my.html');
    var minifycontent = this.minifyHTML(htmlcontent);

**/
exports.minifyHTML = function (filecontent, options) {
  var minify_html = require("html-minifier").minify;
  options = merge({
    "removeComments": true,
    "removeCommentsFromCDATA": true,
    "removeCDATASectionsFromCDATA": true,
    "collapseWhitespace": true,
    "collapseBooleanAttributes": true,
    "removeAttributeQuotes": false,
    "removeRedundantAttributes": true,
    "useShortDoctype": true,
    "removeEmptyAttributes": true,
    "removeEmptyElements": false,
    "removeOptionalTags": false,
    "removeScriptTypeAttributes": true,
    "removeStyleLinkTypeAttributes": true
  }, options);
  return minify_html(filecontent, options)
}

/**
@method datauri
@param {String} filecontent css代码
@param {String} dir css文件的目录
@param {Object} options 压缩配置项

@example
    
    var csscontent = fileutil.read('my.css');
    var minifycontent = this.datauri(csscontent);

**/
exports.datauri = function (filecontent, dir, options) {
  options = merge({
    ieSupport: true,
    maxSize: 32700
  }, options);
  filecontent = filecontent.replace(REGEXP_BACKGROUND, function (matches, prefix, urls, postfix) {
    //获得图片的路径
    var result = urls.replace(REGEXP_IMAGE, function (imageMatches, basename, type) {
      var filename;

      //若是绝对路径，则通过workspace root路径来查到文件
      if (basename.charAt(0) == '/') {
        if (options.workspace) {
          basename = options.workspace + basename;
        }
        filename = path.normalize(basename + "." + type);
      } else {
        filename = path.normalize(dir + path.sep + basename + "." + type);
      }
      if (!fileutil.isFile(filename)) {
        return imageMatches;
      }
      //获得图片的size, IE8的DataURI对size有32K限制
      var size = fs.statSync(filename).size;
      if (options.maxSize && size > options.maxSize) {
        return imageMatches;
      }
      var base64 = fs.readFileSync(filename).toString('base64');
      base64 = 'url("data:image/' + (type === 'jpg' ? 'jpeg' : type) + ';base64,' + base64 + '")';
      return base64;
    });
    result = prefix + result + postfix;

    //是否支持IE6、7
    if (options.ieSupport) {
      if (postfix.indexOf(";") == -1) {
        result += ";"
      }
      result += '\r\n*' + matches + ";"
    }
    return result;
  });
  return filecontent;
}

