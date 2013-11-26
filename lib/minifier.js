'use strict';
var path = require('path');
var fs = require('fs');
var execFile = require('child_process').execFile;
var fileutil = require('fileutil');

var REGEXP_BACKGROUND = exports.REGEXP_BACKGROUND = /([\w\-]+\s*:\s*[\#\w\d]*\s*)(url\s*\((?!\s*data:).+\)\s*[\w%\s,\-]*)+(;|(?=\}))/gi;
var REGEXP_IMAGE = exports.REGEXP_IMAGE = /url\s*\(\s*["']?\s*([^\(\)]*)\.(cur|png|jpg|jpeg|gif)\s*["']?\s*\)/gi;
var LINE_BREAK = ({'win32': '\r\n', 'linux': '\n', 'darwin': '\r'})[process.platform];
LINE_BREAK = LINE_BREAK || '\r\n';

//创建UUID
var uuid = function(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
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
@option {Object} options png压缩额外信息
    @option {Boolean} options.optipng 是否使用optipng
    @option {Boolean} options.pngcrush 是否使用pngcrush
    @option {Boolean} options.pngquant 是否使用pngquant
    @option {Boolean} options.advpng 是否使用advpng
**/
exports.optimage = function(input, output, callback, level, verbose, options){
    
    var binPath = '';
    var args = [];

    output = output || input;
    options = options || {};

    var extname = path.extname(input).toLowerCase();
    var originalSize = fs.statSync(input).size;
    
    var getInfo = function(o){
       var saved = originalSize - fs.statSync(o || output).size;        
       var percent = Math.round(saved/originalSize * 10000)/100 + '';
       return {
        msg:'optimage ' + path.normalize(input) + ': saving ' + percent + '%', 
        percent: percent,
        saved: saved,
       }
    }

    var doOptimize = function(cb){
      execFile(binPath, args, function(err, stdout, stderr) {
        if (verbose) {
          err && console.log(err);
          stdout && console.log(stdout);
          stderr && console.log(stderr);
        }
        if(cb){
            return cb(err);
        }
        if(err){
          return callback({code: 500, msg: err.toString()});
        }
        callback(null, getInfo());
      });
    }

    var png_crush_and_quant = function(input, output, callback){
      fs.readFile(input, function (err, buffer) {
        if (err){
          return callback(err);
        }
        if(options.pngcrush !== false){
          var pngcrush = require('node-pngcrush');
          if(verbose){
            console.log("pngcrush " + input);
          }
          buffer = pngcrush.compress(buffer);
        }
        if(options.pngquant !== false){
          var pngquant = require('node-pngquant-native');
          if(verbose){
            console.log("pngquant " + input);
          }
          buffer = pngquant.option({
            params: '-v --iebug'
          }).compress(buffer);
        }
        fs.writeFile(output, buffer, {
            flags: 'wb'
        }, callback);
      });
    }
    

    var tmpOutput = path.join(path.dirname(output), uuid()) + extname;
    var imageIsEnhanced = function(a, b){
      return fs.statSync(a).size >= fs.statSync(b).size;
    }
    switch (extname){

        // 1. optipng - Basic optimisation
        // 2. pngcrush - Removing unnecessary chunks
        // 3. pngquant - lossy png compressor
        // 4. advpng - Re-compressing final image, advpng -z -4 image.png
        case '.png':
            binPath = require('optipng-bin').path;
            if (path.resolve(output) !== path.resolve(input) && fileutil.exist(output)) {
                fileutil.delete(output);
            }
            args.push('-strip', 'all', input, "-out", tmpOutput, '-o', level || 2);
            
            var afterOptipng = function(){

              var tmpOutput2 = path.join(path.dirname(tmpOutput), uuid()) + extname;
              
              png_crush_and_quant(tmpOutput, tmpOutput2, function(e){
                if(imageIsEnhanced(tmpOutput, tmpOutput2)){
                  fileutil.delete(tmpOutput);
                  fileutil.rename(tmpOutput2, tmpOutput);
                }else{
                  fileutil.delete(tmpOutput2);
                }

                if(options.advpng === false){
                  var info = getInfo(tmpOutput);
                  fileutil.delete(tmpOutput);
                  return callback(null, info);
                }

                fileutil.copy(tmpOutput, path.dirname(tmpOutput2), path.basename(tmpOutput2));
                binPath = require('node-advpng').path;
                args = ['-z', '-4', tmpOutput2];
                if(verbose){
                  console.log("advpng " + input);
                }
                doOptimize(function(err){
                  if(!err){
                    if(imageIsEnhanced(tmpOutput, tmpOutput2)){
                      fileutil.rename(tmpOutput2, output);
                    }else{
                      fileutil.copy(tmpOutput, path.dirname(output), path.basename(output));
                    }
                  }
                  fileutil.delete(tmpOutput);
                  fileutil.delete(tmpOutput2);
                  callback(null, getInfo());
                });
              });
            }
            if(options.optipng === false){
              fileutil.copy(input, path.dirname(tmpOutput), path.basename(tmpOutput));
              afterOptipng();
            }else{
              if(verbose){
                console.log("optipng " + input);
              }
              doOptimize(function(err){
                 if(err || !imageIsEnhanced(input, tmpOutput)){
                    fileutil.copy(input, path.dirname(tmpOutput), path.basename(tmpOutput));
                 }
                 afterOptipng();
              });
            }
            return;
        // jpegtran [switches] inputfile outputfile
        case '.jpg':
        case '.jpeg':
            binPath = require('jpegtran-bin').path;
            args.push('-copy', 'none', '-optimize','-outfile', tmpOutput, input );
            break;

        case '.gif':
            binPath = require('gifsicle').path;
            //gifsicle use -O1 -O2 -O3 to optimize image
            args.push(input,'-o', tmpOutput, '--colors', '256', '-O' + ((level || 2)+1));
            break;
        
        default:
            return callback({'code': 400, msg: 'Cannot support this extension ' + extname});
    }

    doOptimize(function(){
      if(imageIsEnhanced(input, tmpOutput)){
        fileutil.rename(tmpOutput, output);
      }else{
        fileutil.copy(input, path.dirname(output), path.basename(output));
      }
      fileutil.delete(tmpOutput);
      callback(null, getInfo());
    });

};

/**
@method minifyJS
@param {String} filecontent js代码
@param {Object} options 压缩配置项
    @param {Boolean} options.copyright 保留顶部的copyright，默认为true
    @param {Array} options.emove 移除掉log信息的target对象字符串，默认是['console']
    @param {Array} options.ascii_only 是否将中文转换成unicode编码，默认true

@example
    
    var jscontent = fileutil.read('my.js');
    var minifycontent = this.minifyJS(jscontent);
    //移除掉Y.log, Y.info...
    minifycontent = this.minifyJS(jscontent, {
      remove: ['console', 'Y']
    });

    //默认将中文转成Unicode编码，可以通过下面的方式不转码
    this.minifyJS(jscontent, {
       ascii_only: false
    });
**/

exports.minifyJS = function (filecontent, options) {

  options = merge({
    except: ['$', 'define', 'exports', 'require'],
    remove: ['console'],
    copyright: true,
    ascii_only: true
  }, options);

  var UglifyJS = require('uglify-js');
  var defaults = {
    mangle       : {},
    output       : null,
    compress     : {}
  }
  //parse
  UglifyJS.base54.reset();
  var toplevel = UglifyJS.parse(filecontent, {filename: "?", toplevel: null});
  
  
  var matchRemoveOption = function(host, method){
    return !options.remove.every(function(element){
      if(element.indexOf(".") == -1){
        return element != host;
      }
      return element != host + '.' + method;
    });
  }
  //remove console.log
  var removeConsoleTransformer = new UglifyJS.TreeTransformer(function(node, descend){
    if(node instanceof UglifyJS.AST_Call){
      var host, method;
      try{
         host = node.expression.start.value;
         method = node.expression.end.value;
      }catch(err){
      }
      if(host && method){
        if(matchRemoveOption(host, method)){
          return new UglifyJS.AST_Atom();
        }
      }
    }
    descend(node, this);
    return node;
  });
  toplevel = toplevel.transform(removeConsoleTransformer);

  //compress
  var compress = { warnings: options.warnings };
  UglifyJS.merge(compress, options.compress || defaults.compress);
  toplevel.figure_out_scope();
  var sq = UglifyJS.Compressor(compress);
  toplevel = toplevel.transform(sq);


  //mangle
  toplevel.figure_out_scope();
  toplevel.compute_char_frequency();
  var mOptions = options.mangle || defaults.mangle;
  if(!mOptions.except){
      mOptions.except = [];
  }
  if(options.except){
      mOptions.except = mOptions.except.concat(options.except);
  }
  toplevel.mangle_names(mOptions);
  

  //output, keep /*! */ comments.
  var stream = UglifyJS.OutputStream({
    comments: function(scope, comment){
        if(comment.type == 'comment2' && comment.value.charAt(0) === '!' && options.copyright){
           return comment;
        }
        return false;
    },
    ascii_only: options.ascii_only
  });
  toplevel.print(stream);
  return stream + "";
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
      result += LINE_BREAK + '*' + matches + ";"
    }
    return result;
  });
  return filecontent;
}