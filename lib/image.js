var execFile = require('child_process').execFile;


exports.optimage = function(inputFile, outputFile, level, verbose, done){

    var binPath= '';
    var args= [];

    outputFile = outputFile || inputFile;

    switch ( path.extname(inputFile) ){

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
            if (path.resolve(outputFile) !== path.resolve(inputFile) && file.exists(outputFile)) {
                file.delete(outputFile);
            }

            args.push('-strip', 'all', inputFile, "-out", outputFile, '-o', level||2 );
            break;

        // jpegtran [switches] inputfile outputfile
        case '.jpg':
        case '.jpeg':
            binPath = require('jpegtran-bin').path;
            args.push('-copy', 'none', '-optimize','-outfile', outputFile, inputFile );

            break;

        default:
            return;
    }

    // command Dir
    exports.debug(binPath, args.join(" "));

    var originalSize = fs.statSync(inputFile).size;

    execFile(binPath, args, function(err, stdout, stderr) {

        if (verbose) {
            stdout && console.log(stdout);
            stderr && console.log(stderr);
        }

        var saved = originalSize - fs.statSync(outputFile).size;

        // TODO: check or create target build dir
        if (stderr.indexOf('already optimized') !== -1 || saved < 10) {
            exports.log(inputFile.grey, "(already optimized)", ">".grey, outputFile.grey);
        }else{
            exports.log(inputFile.grey, "(saved "+ saved+ "Bytes)", ">".grey, outputFile.grey);
        }

        done();
    });


};