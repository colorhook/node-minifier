var fs =  require('fs');
var path = require('path');
var fileutil = require('fileutil');
var minifier =  require('../lib/minifier');

describe('minifier is a minifier tool for frontend dev', function(){
  

  it("REGEXP_BACKGROUND should match background", function(){
    var regexp = minifier.REGEXP_BACKGROUND;
    var cases = [
      'button{background:url(icon.png)}',
      'button(background:url("icon.png")}',
      'button(background:url(\'icon.png\')}',
      'button{background: url ( icon.png ) }',
      'button(background: url ( "icon.png" ) }',
      'button(background: url ( \'icon.png\' ) }',
      'button{background: url ( icon.png ); }',
      'button(background: url ( "icon.png" ); }',
      'button(background: url ( \'icon.png\' ); }',
      'button{background: url ( assets/icon.png ) }',
      'button(background: url ( "assets/icon.png" ) }',
      'button(background: url ( \'assets/icon.png\' ) }',
      'button(background: url ( \'icon.png\' ); }',
      'button{background-image: url ( assets/icon.png ) }',
      'button(background-image: url ( "assets/icon.png" ) }',
      'button(-webkit-background-image: url ( \'assets/icon.png\' ) }',
      '.cursor{cursor: url ( assets/icon.cur ) }',
      '.cursor(cursor: url ( "assets/icon.cur" ) }',
      '.cursor(bcursor: url ( \'assets/icon.cur\' ) }',
      '.canvas{background-image: url(url.png), url(two.png)}',
      '.canvas{background-image: url(one.png), url(two.png);}',
      '.canvas{background: url(one.png) center bottom no-repeat, url(two.png) left top no-repeat;}',
      '.canvas{color:#fff;background: url(one.png) center bottom no-repeat, url(two.png) left top no-repeat}',
      '.add{background: url(../../img/add.png) no-repeat 0 50%;}',
      '.image{background: #00FF00 url(bgimage.gif) no-repeat fixed top;}',
      '.list .new::after{content: url(../../img/hot.png);}'
      ];

    cases.forEach(function(item){
      var matches = item.match(regexp);
      matches.should.be.ok;
    });

    cases = [
       'button{background:url(data:image/png;base64,iVB==);}',
       'button{background:url( data:image/png;base64,iVB==) }',
       '.list .new::after{background: url(data:image/png;base64,iVB==);}'
    ]

    cases.forEach(function(item){
      var matches = item.match(regexp) == null;
      matches.should.be.true;
    });
  });

  it("REGEXP_IMAGE should match URL", function(){
    var regexp = minifier.REGEXP_IMAGE;
    var cases = [
      'button{background:url(icon.png)}',
      'button(background:url("icon.png")}',
      'button(background:url(\'icon.png\')}',
      'button{background: url ( icon.png ) }',
      'button(background: url ( "icon.png" ) }',
      'button(background: url ( \'icon.png\' ) }',
      'button{background: url ( icon.png ); }',
      'button(background: url ( "icon.png" ); }',
      'button(background: url ( \'icon.png\' ); }',
      'button{background: url ( assets/icon.png ) }',
      'button(background: url ( "assets/icon.png" ) }',
      'button(background: url ( \'assets/icon.png\' ) }',
      'button(background: url ( \'icon.png\' ); }',
      'button{background-image: url ( assets/icon.png ) }',
      'button(background-image: url ( "assets/icon.png" ) }',
      'button(-webkit-background-image: url ( \'assets/icon.png\' ) }',
      '.cursor{cursor: url ( assets/icon.cur ) }',
      '.cursor(cursor: url ( "assets/icon.cur" ) }',
      '.cursor(bcursor: url ( \'assets/icon.cur\' ) }',
      '.canvas{background-image: url(url.png), url(two.png)}',
      '.canvas{background-image: url(one.png), url(two.png);}',
      '.canvas{background: url(one.png) center bottom no-repeat, url(two.png) left top no-repeat;}',
      '.canvas{color:#fff;background: url(one.png) center bottom no-repeat, url(two.png) left top no-repeat}',
      '.add{background: url(../../img/add.png) no-repeat 0 50%;}',
      '.image{background: #00FF00 url(bgimage.gif) no-repeat fixed top;}',
      '.list .new::after{content: url(../../img/hot.png);}'
      ];

    cases.forEach(function(item){
      var matches = item.match(regexp);
      matches.should.be.ok;
    });
  });
  
  it('minifyJS should minify js content', function(){
    var content = fileutil.read(__dirname + "/test.js");
    
    //默认压缩，去log，保留版权信息
    var m_content = minifier.minifyJS(content);
    var noConsole = m_content.match(/console/) == null;

    noConsole.should.be.ok;

    noConsole = m_content.match(/\/\*![.\s\S]+\*\//) != null;
    noConsole.should.be.ok;
    
    //设置保留log
    m_content = minifier.minifyJS(content, {remove:[]});
    noConsole = m_content.match(/console/) != null;
    noConsole.should.be.ok;
    
    //设置去除版权信息
    m_content = minifier.minifyJS(content, {copyright:false});
    noConsole = m_content.match(/\/\*![^(\*\/)]+\*\//) == null;
    noConsole.should.be.ok;

  });
  

  it('minifyJS can custom banner & footer', function(){
      var content = 'var a=1;';
      var banner = 'define(function(require, exports, module){';
      var footer = '});';
      var realJS = minifier.minifyJS(content, {banner:banner, footer: footer});
      var hasBanner = realJS.indexOf(banner) >= -1;
      hasBanner.should.be.true;
      var hasFooter = realJS.indexOf(footer) >= -1;
      hasFooter.should.be.true;
  });
  
  it('minifyJS should keep the exports, define, require, $ keyword reserved.', function(){
    var content = fileutil.read(__dirname + "/test.js");
    
    //默认保留define, exports, require, $
    var m_content = minifier.minifyJS(content);
    
    var matched = m_content.match(/exports/) != null;
    matched.should.be.ok;
    
    matched = m_content.match(/define/) != null;
    matched.should.be.ok;
    
    matched = m_content.match(/require/) != null;
    matched.should.be.ok;
    
    matched = m_content.match(/exports/) != null;
    matched.should.be.ok;
    
    matched = m_content.match(/\$/) != null;
    matched.should.be.ok;
    
    m_content = minifier.minifyJS(content);
  });

  it('minifyJSON should minify json text', function(){
    var content = '{"a":  "b", "c": \n [1, 2, 3]}';
    var exceptContent = '{"a":"b","c":[1,2,3]}';
    var realContent = minifier.minifyJSON(content);
    (realContent == exceptContent).should.be.true;
  });

  it("datauri should convert the image to Base64 in css files", function(){
    var file = __dirname + "/test.css";
    var content = minifier.datauri(fileutil.read(file), {
        input: file
    });
    var match = content.match(/url\(\"data:.+;base64,(.+)\"\);/);
    match[1].should.be.ok;
    var base64 = fs.readFileSync(__dirname + "/m.gif").toString('base64');
    base64.should.be.equal(match[1]);
  });
  
  it("optimage should optimize jpg locally", function(done){
    var input  = __dirname + "/test.jpg";
    var output = __dirname + "/test.min.jpg";
    minifier.optimage(input, output, function(err, data){
      fileutil.delete(output);
      data.should.be.a('object');
      (data.saved > 0).should.be.ok;
      done();
    });
  });

  it("optimage should optimize png locally", function(done){
    var input  = __dirname + "/test.png";
    var output = __dirname + "/test.min.png";
    minifier.optimage(input, output, function(err, data){
      fileutil.delete(output);
      data.should.be.a('object');
      (data.saved > 0).should.be.ok;
      done();
    });
  });

  it("optimage should optimize gif locally", function(done){
    var input  = __dirname + "/test.gif";
    var output = __dirname + "/test.min.gif";
    minifier.optimage(input, output, function(err, data){
      fileutil.delete(output);
      data.should.be.a('object');
      (data.saved > 0).should.be.ok;
      done();
    });
  });
  
  it("smushit should optimize image by cloud server", function(done){
    var input  = __dirname + "/test.jpg";
    var output = __dirname + "/test.min.jpg";
    minifier.smushit(input, output, function(err, data){
      fileutil.delete(output);
      data.should.be.a('object');
      (data.saved >= 0).should.be.ok;
      done();
    });
  });
  
  it("minifyImage should optimize image, first by local manner, if error, then by cloud manner", function(done){
    var input  = __dirname + "/test.jpg";
    var output = __dirname + "/test.min.jpg";
    minifier.minifyImage(input, output, function(err, data){
      fileutil.delete(output);
      data.should.be.a('object');
      (data.saved >= 0).should.be.ok;
      done()
    });
  });
});
