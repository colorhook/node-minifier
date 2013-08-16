var path = require('path');
var fs = require('fs');
var execFile = require('child_process').execFile;
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
@method optimage 优化图片
@option {String} input 输入文件路径
@option {String} output 输出文件路径
@option {Function} callback 优化完成后的函数
@option {Number} level 压缩等级，默认是2
@option {Boolean} verbose 是否输出debug信息
**/
exports.optimage = function(input, output, callback, level, verbose, done){

    var binPath= '';
    var args= [];

    output = output || input;
    
    var extname = path.extname(input);

    switch (extname){

        // 1. Basic optimisation
        // optipng xx.png -out xx2.png
        // optipng xx.png -dir ./img
        // default -o2

        // TODO
        // 2. Removing unnecessary chunks
        // pngcrush -q -rem gAMA -rem alla -rem text image.png image.crushed.png
        // 3. Reducing the colour palette
        // pngnq -f -n 32 -s 3 image.png
        // 4. Re-compressing final image
        // advpng -z -4 image.png
        case '.png':
            binPath = require('optipng-bin').path;
            // OptiPNG can't overwrite without creating a backup file
            // https://sourceforge.net/tracker/?func=detail&aid=3607244&group_id=151404&atid=780913
            if (path.resolve(output) !== path.resolve(input) && file.exists(output)) {
                file.delete(output);
            }

            args.push('-strip', 'all', input, "-out", output, '-o', level || 2 );
            break;

        // jpegtran [switches] inputfile outputfile
        case '.jpg':
        case '.jpeg':
            binPath = require('jpegtran-bin').path;
            args.push('-copy', 'none', '-optimize','-outfile', output, input );

            break;

        default:
            return callback({'code': 400, msg: 'Cannot support this extension ' + extname});
    }


    var originalSize = fs.statSync(input).size;

    execFile(binPath, args, function(err, stdout, stderr) {

        if (verbose) {
          err && console.log(err);
          stdout && console.log(stdout);
          stderr && console.log(stderr);
        }
        
        if(err){
          return callback({code: 500, msg: err.toString()});
        }
        
        var saved = originalSize - fs.statSync(output).size;        
        var percent = Math.round(saved/originalSize * 10000)/100;
        callback(null, {
          msg:'optimage ' + path.normalize(input) + ': saving ' + percent + '%', 
          percent: percent,
          saved: saved, 
          stdout:stdout, 
          stderr:stderr
        });
    });


};
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
exports.minifyImage = function(input, output, callback, options){
  options = options || {};
  this.optimage(input, output, function(err, data){
    if(err){
      exports.smushit(input, output, callback, options);
    }else{
      callback(err, data);
    }
  }, false, options.level)
}
/**
@method smushit
@param {String} input 图片输入地址
@param {String} output 图片输出地址
@param {Object} options 配置参数
    @param {Boolean} options.service 压缩服务http地址，默认使用!Yahoo的smush.it服务
@example
    
    this.smushit('logo.png', 'logo.png', function(e, data){
        if(e){
          console.log(e);
        }else{
          console.log(data.msg);
        }
    });

**/
exports.smushit = function (input, output, callback, options) {
  var smushit = require('node-smushit').smushit;
  options = merge({}, options);
  output = output || input;
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
        var saved;
        if (response.error == 'No savings') {
          percent = saved = '0';
          
          //复制
          if(path.normalize(input) != path.normalize(output)){
            if(fileutil.exist(output)){
              fileutil.delete(output);
            };
            fileutil.copy(input, path.dirname(output), path.basename(output));
          }
          
        } else {
          if(response.error){
            return callback(500, {msg: response.error});
          }
          percent = response.percent;
          saved = fs.statSync(input).size - fs.statSync(output).size;
        }
        callback && callback(null, {
          saved: saved,
          percent: percent,
          msg: 'smush ' + path.normalize(input) + ': saving ' + percent + '%'
        });
      }
    },
    verbose: options.verbose
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
exports.datauri = function (filecontent, options) {
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
        if (options.pathPrefix){
            basename = basename.replace("/" + options.pathPrefix, "");
        }
        if (options.workspace) {
          basename = options.workspace + basename;
        }
        filename = path.normalize(basename + "." + type);
      } else {
        var dir = options.input ? path.dirname(options.input) : "";
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