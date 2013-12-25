var minifier = require("../lib/minifier.js");
var fileutil = require("fileutil");
var http = require('http');
var path = require("path");
var fs = require("fs");

var results = [];


fileutil.each(path.join(__dirname, "assets"), function(item){
  if(!item.filename.match(/\.(jpg|jpeg|png|gif)$/i)){
     return;
  }
  var filename = item.filename;
  var chrome = __dirname + '/chrome/' + filename;
  var saved;
  var savedPercent;
  var original = fs.statSync(item.name).size;
  if(fileutil.exist(chrome)){
     saved = original - fs.statSync(chrome).size;
  }else{
     saved = 0;
  }
  savedPercent = Math.round((saved/original) * 10000)/100 + '%';
  results.push({
   filename: filename,
   original: original,
   saved: saved,
   savedPercent: savedPercent
  });
});

var gifInfo = {count:0, data:[]}
var pngInfo = {count:0, data:[]}
var jpegInfo = {count:0, data:[]}

results.forEach(function(item){
    var n = item.filename;
    if(n.match(/\.gif$/i)){
      gifInfo.count++;
      gifInfo.data.push(item)
    }else if(n.match(/\.(jpg|jpeg)$/i)){
      jpegInfo.count++;
      jpegInfo.data.push(item)
    }else if(n.match(/\.png$/i)){
      pngInfo.count++;
      pngInfo.data.push(item)
    }
    console.log("%s:\t%s\t%s\t%s", item.filename, item.original, item.saved, item.savedPercent);
});

function getInfo(type, arr){
  var sTotal = 0;
  var oTotal = 0;
  var percents = 0;
  var length = arr.length;
  if(!length){
    console.log("%s(%s) total: %s percent: %s percent avg: %s", type, '0', '0%', '0%');
  }
  arr.forEach(function(item){
    sTotal += item.saved;
    oTotal += item.original;
    percents += parseFloat(item.savedPercent);
  });
 
  var percent = Math.round(sTotal/oTotal * 10000)/100 + '%';
  var percentAvg = Math.round(percents/length*100)/100  + '%';
  console.log("%s(%s) total: %s percent: %s percent avg: %s",  type, length, sTotal, percent, percentAvg);
}

getInfo('gif', gifInfo.data);
getInfo('png', pngInfo.data);
getInfo('jpg', jpegInfo.data);