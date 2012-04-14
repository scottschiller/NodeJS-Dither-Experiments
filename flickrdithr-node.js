/*jslint node: true, sloppy: true, vars: true, white: true, plusplus: true, maxerr: 50, indent: 4 */

/**
 * FlickrDithr 1-bit "Atkinson Dither" script, ported for batch processing under node.js in an entirely hackish-but-it-sorta-works kind of way.
 * Based on work by Stephen Woods. https://github.com/flickr/FlickrDithr/
 *
 * This version reads, processes and outputs sequences of images.
 * Alternately, if you're on OS X: http://www.tinrocket.com/hyperdither-mac
 */

(function() {

    var Canvas = require('canvas');

	var floyd = 0;

	var fs = require('fs');

	function dither(url, inputFileName, outputFileName) {

		var thisRow,
		    img = new Canvas.Image(),
		    data;

		var outFile, outStream;

		var outFileURI = __dirname + '/output/' + outputFileName + '.png';

		function findClosestValue(pixel) {
			var result;
			if (pixel > 130) {
				result = 255;
			} else {
				result = 0;
			}
			return result;
		}

		function getPixelIndex(x, y) {
			return (y * 4) * data.width + x * 4;
		}

		function getAverage(x, y) {
			var i = getPixelIndex(x,y);
			return (data.data[i] + data.data[i + 1] + data.data[i + 2]) / 3;
		}
		
		function setPixel(x, y, value) {
			var i = getPixelIndex(x,y);
			data.data[i] = value;
			data.data[i + 1] = value;
			data.data[i + 2] = value;
		}
		
		img.onload = function() {

			var x, y, i, err, newavg, width, height, avg;

			var canvas = new Canvas(img.width, img.height);
			var ctx = canvas.getContext('2d');

			ctx.antialias = 'none';

			ctx.drawImage(img, 0,0, img.width, img.height);

			data = ctx.getImageData(0,0, img.width, img.height);
			
			width = data.width;
			height = data.height;

			for (y = 0; y < height; y++) {

				thisRow = [];

				for (x = 0; x < width; x++) {

					i = (y * 4) * width + x * 4;
					avg = getAverage(x, y);
					newavg = findClosestValue(avg);

					setPixel(x, y, newavg);
					err = avg - newavg;
					
					if (floyd) {
						setPixel(x+1, y, getAverage(x+1, y) + (7/16) * err);
						setPixel(x-1, y+1, Math.round(getAverage(x-1, y+1) + (3/16) * err));
						setPixel(x, y+1, Math.round(getAverage(x, y+1) + (5/16) * err));
						setPixel(x+1, y+1, Math.round(getAverage(x+1, y+1) + (1/16) * err));
					} else {
						setPixel(x+1, y, getAverage(x+1, y) + (1/8) * err);
						setPixel(x+2, y, getAverage(x+2, y) + (1/8) * err);
						setPixel(x-1, y+1, getAverage(x-1, y+1) + (1/8) * err);
						setPixel(x, y+1, getAverage(x, y+1) + (1/8) * err);
						setPixel(x+1, y+1, getAverage(x+1, y+1) + (1/8) * err);
						setPixel(x, y+2, getAverage(x, y+2) + (1/8) * err);
					}

				}

			}

			ctx.putImageData(data, 0, 0);

			console.log(inputFileName + ' => ' + outFileURI);

			outFile = fs.createWriteStream(outFileURI);
			outStream = canvas.createPNGStream();

			outStream.on('data', function(chunk) {
			  outFile.write(chunk);
			});

			outStream.on('end', function() {
				console.log('saved ' + outFileURI);
				outStream.close();
				outFile.close();
				outFile = null;
				outStream = null;
			});

			img = null;

		};

		// img.crossOrigin = '';
		// console.log('loading', url.length);
		img.src = url;

	}
	
    var args = process.argv.splice(2);

    var FRAME_START = parseInt(args[0], 10);
    var FRAME_END = parseInt(args[1], 10);
    var i;

    function processFile(i, callback) {

		var padding;

        // frame sequences are generally padded, eg., movie0000 -> movie9999 for most image sequence-based exports.
		if (i >= 1000) {
			padding = '';
		} else if (i >= 100) {
			padding = '0';
		} else if (i >= 10) {
			padding = '00';
		} else {
			padding = '000';
		}

		var inFile = __dirname + '/input/movie' + padding + i + '.png';

		fs.readFile(inFile, function(err, imgData) {
			if (err) {
				console.log(err);
			}
			dither(imgData, inFile, 'movie' + padding + i);
			imgData = null;
			callback();
		});

    }

	function nextFile() {
		if (i<=FRAME_END) {
			processFile(i, nextFile);
			i++;
		} else {
			console.log('done, stopped at ' + i);
		}
	}

    if (!isNaN(FRAME_START) && !isNaN(FRAME_END)) {

		console.log('processing from ' + FRAME_START + ' to ' + FRAME_END);

		i = FRAME_START;
		nextFile();

    } else {

      console.log('Need FRAME_START and FRAME_END parameters, eg., node.js ' + process.argv[1] + ' 1 200');
      console.log('Default file patterns: input/movieXXXX.png -> output/movieXXXX.png');
      console.log('Limit your range to ~250 files per execution to prevent I/O errors. Despite files closing and being nulled, resources are not freed per loop.');

    }

}());
