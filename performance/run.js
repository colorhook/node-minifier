var minifier = require("../lib/minifier.js");
var fileutil = require("fileutil");
var path = require("path");
var fs = require("fs");

var results = [];
var waitFlag = 0;
var temp = path.join(__dirname, "temp");
var loop = 0;

var padright  = function(s, n){
   if(n == null){
       n = 24;
   }
   var len = n - s.length;
   var m = s;
   while(--len > 0){
       m+=" ";
   }
   return m;
}

var printItem = function(name, o, s, sp, p, pp, e1, e2){
    var str =  padright(name, 9);
    str += padright(o, 12);
    str += padright(s, 12);
    str += padright(sp, 12);
    str += padright(p, 12);
    str += padright(pp, 12);
    if(e1){
      str += padright(e1, 12);
    }
    if(e2){
      str += padright(e2, 12);
    }
   console.log(str);
}

var avg = function(arr){
   if(!arr || arr.length==0){
     return 0 + "%";
   }
   var len = arr.length;
   var total = 0;
   arr.forEach(function(item){
      total += item;
   });
   return Math.round(total/len*100)/100 + '%';
}

var toPercent = function(a, b){
    if(b == 0){
      return '0%';
    }
    return Math.round(a/b*10000)/100+"%";
}

var validateFinish = function(){
   if(waitFlag == 0){
      console.log("========================================");
      var gifs = [];
      var pngs = [];
      var jpgs = [];
      var gifInfo = {len:0, total:0, smushitSaved:0, smushit:[], optimageSaved:0, optimage: []};
      var pngInfo = {len:0, total:0, smushitSaved:0, smushit:[], optimageSaved:0, optimage: []};
      var jpgInfo = {len:0, total:0, smushitSaved:0, smushit:[], optimageSaved:0, optimage: []};
      printItem("FILE", "SIZE", "SMUSH", "OPT", "SMUSH%", "OPT%");
      
      var EXP_GIF = /\.gif$/i;
      var EXP_PNG = /\.png$/i;
      var EXP_JPG = /\.(jpg|jpeg)$/i;
      results.forEach(function(item){
          if(item.name.match(EXP_GIF)){
            gifs.push(item);
          }else if(item.name.match(EXP_PNG)){
            pngs.push(item);
          }else if(item.name.match(EXP_JPG)){
            jpgs.push(item);
          }
      });
      console.log("---------------------------------- gif");
      gifs.forEach(function(item){
          gifInfo.len++;
          gifInfo.total += Number(item.original)
          gifInfo.smushitSaved += Number(item.smushitSaved);
          gifInfo.smushit.push(Number(item.smushit));
          gifInfo.optimageSaved += Number(item.optimageSaved);
          gifInfo.optimage.push(Number(item.optimage));
          printItem(item.name, item.original+"", item.smushitSaved+"", item.optimageSaved+"", item.smushit + "%", item.optimage + "%");
      });
      console.log("---------------------------------- png");
      pngs.forEach(function(item){
          pngInfo.len++;
          pngInfo.total += Number(item.original)
          pngInfo.smushitSaved += Number(item.smushitSaved);
          pngInfo.smushit.push(Number(item.smushit));
          pngInfo.optimageSaved += Number(item.optimageSaved);
          pngInfo.optimage.push(Number(item.optimage));
          printItem(item.name, item.original+"", item.smushitSaved+"", item.optimageSaved+"", item.smushit + "%", item.optimage + "%");
      });
      console.log("-------------------------------- jpg");
      jpgs.forEach(function(item){
          jpgInfo.len++;
          jpgInfo.total += Number(item.original)
          jpgInfo.smushitSaved += Number(item.smushitSaved);
          jpgInfo.smushit.push(Number(item.smushit));
          jpgInfo.optimageSaved += Number(item.optimageSaved);
          jpgInfo.optimage.push(Number(item.optimage));
          printItem(item.name, item.original+"", item.smushitSaved+"", item.optimageSaved+"", item.smushit + "%", item.optimage + "%");
      });
      console.log("---------------------------------- total");

      printItem("TYPE", "TOTAL", "SMUSH", "OPT", "SMUSH%", "OPT%", "[SMUSH]%", "[OPT]%"); 
      printItem("gif("+gifInfo.smushit.length+")", gifInfo.total+"", gifInfo.smushitSaved+"", 
          gifInfo.optimageSaved+"", avg(gifInfo.smushit), avg(gifInfo.optimage), toPercent(gifInfo.smushitSaved, gifInfo.total), toPercent(gifInfo.optimageSaved, gifInfo.total));
      printItem("png("+pngInfo.smushit.length+")", pngInfo.total+"", pngInfo.smushitSaved+"", 
          pngInfo.optimageSaved+"", avg(pngInfo.smushit), avg(pngInfo.optimage), toPercent(pngInfo.smushitSaved, pngInfo.total), toPercent(pngInfo.optimageSaved, pngInfo.total));
      printItem("jpg("+jpgInfo.smushit.length+")", jpgInfo.total+"", jpgInfo.smushitSaved+"", 
          jpgInfo.optimageSaved+"", avg(jpgInfo.smushit), avg(jpgInfo.optimage), toPercent(jpgInfo.smushitSaved, jpgInfo.total), toPercent(jpgInfo.optimageSaved, jpgInfo.total));
   }
}

fileutil.each(path.join(__dirname, "assets"), function(item){
  if(!item.filename.match(/\.(jpg|jpeg|png|gif)$/i)){
     return;
  }
  var img = item.name;
  var img_smush_min = path.join(temp, "smush", item.filename);
  var img_native_min = path.join(temp, "native", item.filename);
  if(loop++>4){
    //return;
  }
  waitFlag += 2;
  
  var r = {
    name: item.filename,
    original: fs.statSync(item.name).size
  }

  fileutil.mkdir(path.join(temp, "smush"));
  fileutil.mkdir(path.join(temp, "native"));

  minifier.smushit(img, img_smush_min, function(err, info){
      waitFlag--;
      if(err){ return }
      r.smushit = info.percent;
      r.smushitSaved = info.saved;
      validateFinish();
  });
  minifier.optimage(img, img_native_min, function(err, info){
      waitFlag--;
      if(err){ return }
      r.optimage = info.percent;
      r.optimageSaved = info.saved;
      validateFinish();
  });
  results.push(r);
});