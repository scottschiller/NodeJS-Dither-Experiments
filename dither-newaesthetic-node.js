/*jslint node: true, sloppy: true, vars: true, white: true, plusplus: true, maxerr: 50, indent: 4 */
/*global YUI:false, window:false*/

/**
 * A slightly-modified node.js port of Rev Dan Catt's JavaScript-based "pxl effect" implementation
 * http://revdancatt.com/2012/03/31/the-pxl-effect-with-javascript-and-canvas-and-maths/
 * https://github.com/revdancatt/GuardianAmbientHeadlineRadio/blob/master/js/aesthetic.js
 */

(function() {

    var Canvas = require('canvas'),
	    fs = require('fs'),
		img,
		imageData = null,
		tileMap = [],
		tileObj = null,
		tilesAcross = 40;

		// extra canvas bits
		var c,
		ctx,
		tileMapCanvas,
		tmx;

    var args = process.argv.splice(2);

	var FRAME_START = parseInt(args[0], 10);
	var FRAME_END = parseInt(args[1], 10);
	var i;
	var padding;
	var inFile;
	var outFile;

	function renderTiles() {

		//  To do this we are dividing the source image into a grid of 7x7 squares, we'll then average the
		//  top, bottom, left & right quarters and work out which quarter is closest to its adjacent ones
		//  then we'll take the average between those two quarters and fill in the diagonal half with them
		//  and same for the other half, and this render the image in triangles

		var ctx = c.getContext('2d');

		//  Ok, now the new way of doing the tile thing around here, first we're going to loop thru the source image
		//  in tile sized chunks, and then when we're looking at each tile loop through the pixels in each one
		//  working out if they are in the top, left, right or bottom (or null) quarter, totting up the values
		//  as we go, then averaging at the end.
		var counter = {},
			tilePixel = null,
			sourcePixel = null,
			q,
			qa = ['top', 'left', 'right', 'bottom'];

		var tileX, tileY, x, y;

		var topleft, topright, bottomleft, bottomright;
		
		var targetCorners;

		var tl, tr, bl, br;

		//  take big steps through the source image, one tile area at a time
		for (tileY = 0; tileY < tileObj.down; tileY++) {
			for (tileX = 0; tileX < tileObj.across; tileX++) {

				//  zero all the rgb values
				counter.top = {
					r: 0,
					g: 0,
					b: 0,
					count: 0
				};

				counter.left = {
					r: 0,
					g: 0,
					b: 0,
					count: 0
				};

				counter.right = {
					r: 0,
					g: 0,
					b: 0,
					count: 0
				};

				counter.bottom = {
					r: 0,
					g: 0,
					b: 0,
					count: 0
				};

				//  To start we we need to know how many rows of pixels we are down, if the source image was
				//  140 pixels wide, and tileY = 1 (i.e. the 2nd tile row down), we would need 7 rows of 140 pixels
				//  to be our initial offset. The full width of pixels is tiles across * tile width.
				tilePixel = (Math.floor(tileY * tileObj.imgHeight / tileObj.down) * tileObj.imgWidth);

				//  Then we need to move a number of pixels in, based on the tileX positon
				tilePixel += Math.floor(tileX * tileObj.imgWidth / tileObj.across);

				//  Once we know that we have the pixel offset position of the top left pixel of the tile we are
				//  currently on

				//  NOTE, we still need to multiply up by 4 because there are 4 values r, b, g & a per pixel in the
				//  image data.

				//  step through all the pixels
				for (y = 0; y < tileObj.height; y++) {
					for (x = 0; x < tileObj.width; x++) {

						//  Now we need to move down another y total rolls
						sourcePixel = tilePixel + (y * tileObj.imgWidth);

						//  and finally the last few pixels across
						sourcePixel += x;

						//  Now multiply the whole lot by 4 to take account of the packing in the image data
						sourcePixel = sourcePixel * 4;

						//  now check the top, left, right, bottom position of the x,y pixel in the tilemap
						//  and update the values into the correct counter thingy!
						if (tileMap[x][y] !== null) {
							if (typeof counter[tileMap[x][y]] === 'undefined') {
								counter[tileMap[x][y]] = {
									r: 0,
									g: 0,
									b: 0,
									count: 0
								};
							}
							counter[tileMap[x][y]].r += imageData.data[sourcePixel];
							counter[tileMap[x][y]].g += imageData.data[sourcePixel+1];
							counter[tileMap[x][y]].b += imageData.data[sourcePixel+2];
							counter[tileMap[x][y]].count++;
						}

					}
				}

				//  Ok, so now we've been thru all the pixels in the tile work out the average for the top, left, right, bottom quarters
				for (q in qa) {
					if (qa.hasOwnProperty(q)) {
						counter[qa[q]].r = parseInt(counter[qa[q]].r / counter[qa[q]].count, 10);
						counter[qa[q]].g = parseInt(counter[qa[q]].g / counter[qa[q]].count, 10);
						counter[qa[q]].b = parseInt(counter[qa[q]].b / counter[qa[q]].count, 10);
					}
				}

				//  ok, now that we have the average values for the top, left, right and bottom. I want to know which pair have the greatest
				//  similarity
				topleft = (Math.abs(counter.top.r-counter.left.r) + Math.abs(counter.top.g-counter.left.g) + Math.abs(counter.top.b-counter.left.b))/3;

				topright = (Math.abs(counter.top.r-counter.right.r) + Math.abs(counter.top.g-counter.right.g) + Math.abs(counter.top.b-counter.right.b))/3;

				bottomleft = (Math.abs(counter.bottom.r-counter.left.r) + Math.abs(counter.bottom.g-counter.left.g) + Math.abs(counter.bottom.b-counter.left.b))/3;

				bottomright = (Math.abs(counter.bottom.r-counter.right.r) + Math.abs(counter.bottom.g-counter.right.g) + Math.abs(counter.bottom.b-counter.right.b))/3;

				targetCorners = {
					top: Math.floor(tileY * img.height / tileObj.down),
					bottom: Math.floor((tileY+1) * img.height / tileObj.down) + 1,
					left: Math.floor(tileX * img.width / tileObj.across),
					right: Math.floor((tileX+1) * img.width/ tileObj.across) + 1
				};

				if ((topleft < topright && topleft < bottomleft && topleft < bottomright) || (bottomright < topleft && bottomright < topright && bottomright < bottomleft)) {

					tl = {
						'r': parseInt((counter.top.r + counter.left.r)/2, 10),
						'g': parseInt((counter.top.g + counter.left.g)/2, 10),
						'b': parseInt((counter.top.b + counter.left.b)/2, 10)
					};

					br = {
						'r': parseInt((counter.bottom.r + counter.right.r)/2, 10),
						'g': parseInt((counter.bottom.g + counter.right.g)/2, 10),
						'b': parseInt((counter.bottom.b + counter.right.b)/2, 10)
					};

					//  first one diagonal
					//  NOTE: This probably looks odd, because normally a triangle has 3 points. But if we just
					//  draw two triangles, the diagonals don't go flush and you have a tiny slither of gap between
					//  them. So with the first one, we actually join the corners not from the very corner pixel
					//  but the next pixel down (and across). The the second triangle we draw just with the normal
					//  three points, with the diagonal *just* overlapping.
					ctx.fillStyle="rgb(" + tl.r + "," + tl.g + "," + tl.b + ")";
					ctx.beginPath();
					ctx.moveTo(targetCorners.left, targetCorners.top);
					ctx.lineTo(targetCorners.right, targetCorners.top);
					ctx.lineTo(targetCorners.right, targetCorners.top+1);
					ctx.lineTo(targetCorners.left+1, targetCorners.bottom);
					ctx.lineTo(targetCorners.left, targetCorners.bottom);
					ctx.moveTo(targetCorners.left, targetCorners.top);
					ctx.closePath();
					ctx.fill();

					ctx.fillStyle="rgb(" + br.r + "," + br.g + "," + br.b + ")";
					ctx.beginPath();
					ctx.moveTo(targetCorners.right, targetCorners.top);
					ctx.lineTo(targetCorners.right, targetCorners.bottom);
					ctx.lineTo(targetCorners.left, targetCorners.bottom);
					ctx.moveTo(targetCorners.right, targetCorners.top);
					ctx.closePath();
					ctx.fill();

				} else {

					tr = {
						'r': parseInt((counter.top.r + counter.right.r)/2, 10),
						'g': parseInt((counter.top.g + counter.right.g)/2, 10),
						'b': parseInt((counter.top.b + counter.right.b)/2, 10)
					};

					bl = {
						'r': parseInt((counter.bottom.r + counter.left.r)/2, 10),
						'g': parseInt((counter.bottom.g + counter.left.g)/2, 10),
						'b': parseInt((counter.bottom.b + counter.left.b)/2, 10)
					};

					ctx.fillStyle="rgb(" + tr.r + "," + tr.g + "," + tr.b + ")";
					ctx.beginPath();
					ctx.moveTo(targetCorners.left, targetCorners.top+1);
					ctx.lineTo(targetCorners.left, targetCorners.top);
					ctx.lineTo(targetCorners.right, targetCorners.top);
					ctx.lineTo(targetCorners.right, targetCorners.bottom);
					ctx.lineTo(targetCorners.right-1, targetCorners.bottom);
					ctx.lineTo(targetCorners.left, targetCorners.top+1);
					ctx.closePath();
					ctx.fill();

					ctx.fillStyle="rgb(" + bl.r + "," + bl.g + "," + bl.b + ")";
					ctx.beginPath();
					ctx.moveTo(targetCorners.left, targetCorners.top);
					ctx.lineTo(targetCorners.right, targetCorners.bottom);
					ctx.lineTo(targetCorners.left, targetCorners.bottom);
					ctx.lineTo(targetCorners.left, targetCorners.top);
					ctx.closePath();
					ctx.fill();

				}

			}

			//  If I *were* to use Pixastic, this is where I'd do it
			/*
			if (typeof Pixastic !== 'undefined') {
				Pixastic.process(ct, "glow", {amount:1.0,radius:3.0});
				ct=$('#targetCanvas')[0];
				Pixastic.process(ct, "noise", {mono:true,amount:0.5,strength:0.05});
				// ct=$('#targetCanvas')[0];
				// Pixastic.process(ct, "blurfast", {amount:0.1});
			} catch(er) {
				// Ignore
			}
			*/

		}

		// control.finishBroadcast();

		var outFileObj = fs.createWriteStream(outFile),
			outStreamObj = c.createPNGStream();

		outStreamObj.on('data', function(chunk) {
			outFileObj.write(chunk);
		});

		outStreamObj.on('end', function() {

			console.log(inFile + ' => ' + outFile);

			outStreamObj.close();
			outFileObj.close();
			outFileObj = null;
			outStreamObj = null;

			// hackish, for now
			//nextFile();

		});

		img = null;

	}

	function copyToCanvas() {

		var mapData,
			pxlObj,
			x, y;

		c = new Canvas(img.width, img.height);
		ctx = c.getContext('2d');
		tileMapCanvas = new Canvas(img.width, img.height);
		tmx = tileMapCanvas.getContext('2d');

		ctx.drawImage(img, 0, 0);

		//  grab the source image data (so we can pull the pixels)
		//  and pop it into the aesthetic object
		imageData = ctx.getImageData(0, 0, img.width, img.height);

		//  right then, this may get messy, I want to divide the image up pretty well, about 20 tiles across seems to be
		//  a good value, so lets kick off with that
		tileObj = {
			across: tilesAcross,
			down: null,
			width: null,
			height: null,
			imgWidth: img.width,
			imgHeight: img.height
		};

		//  So, as we want the source tiles to be as square as possible we need to work out how many pixels wide,
		//  and then how many of those we can fit down (rounding up)
		tileObj.width = Math.floor(tileObj.imgWidth/tileObj.across);
		tileObj.down = Math.ceil(tileObj.imgHeight/tileObj.width);
		tileObj.height = Math.floor(tileObj.imgHeight/tileObj.down);

		//  Because maths is hard, and I don't want to have to work out which top, left, right, bottom quarter a pixel
		//  falls in, because it's late and I'm tired, instead I'm just going to draw an image with the 4 quarters
		//  in different colours. Then grab the image data back from the thing we just drew, looping over it and
		//  grabbing the colours back out, and stuffing the results into an array
		//
		//  This all makes perfect sense!!

		//  Top quarter
		tmx.fillStyle="rgb(0, 0, 255)";
		tmx.beginPath();
		tmx.moveTo(0, 0);
		tmx.lineTo(tileObj.width, 0);
		tmx.lineTo(tileObj.width/2, tileObj.height/2);
		tmx.lineTo(0, 0);
		tmx.closePath();
		tmx.fill();

		//  Right quarter
		tmx.fillStyle="rgb(255, 0, 0)";
		tmx.beginPath();
		tmx.moveTo(tileObj.width, 0);
		tmx.lineTo(tileObj.width, tileObj.height);
		tmx.lineTo(tileObj.width/2, tileObj.height/2);
		tmx.lineTo(tileObj.width, 0);
		tmx.closePath();
		tmx.fill();

		//  left quarter
		tmx.fillStyle="rgb(0, 255, 0)";
		tmx.beginPath();
		tmx.moveTo(0, 0);
		tmx.lineTo(0, tileObj.height);
		tmx.lineTo(tileObj.width/2, tileObj.height/2);
		tmx.lineTo(0, 0);
		tmx.closePath();
		tmx.fill();

		//  Bottom quarter
		tmx.fillStyle="rgb(255, 0, 255)";
		tmx.beginPath();
		tmx.moveTo(0, tileObj.height);
		tmx.lineTo(tileObj.width, tileObj.height);
		tmx.lineTo(tileObj.width/2, tileObj.height/2);
		tmx.lineTo(0, tileObj.height);
		tmx.closePath();
		tmx.fill();

		//  now I'm going to draw lines over the diagonals, just to move them
		//  away from having a 00 value due to aliasing. It's not perfect, but it'll
		//  do for the moment

		/*
		tmx.strokeStyle="rgb(255,255,255)";
		tmx.beginPath();
		tmx.moveTo(0, 0); tmx.lineTo(tileObj.width, tileObj.height);
		tmx.stroke();
		tmx.beginPath();
		tmx.moveTo(tileObj.width, 0); tmx.lineTo(0, tileObj.height);
		tmx.stroke();
		*/

		//  Ok, now we have that draw out let's grab the image data out and then
		//  work out which pixel is top, left, right or bottom
		mapData = tmx.getImageData(0, 0, tileObj.width, tileObj.height);
		tileMap = [];

		pxlObj = {
			r: null,
			g: null,
			b: null,
			a: null
		};

		for (x = 0; x <= tileObj.width; x++) {
			tileMap[x] = [];
			for (y = 0; y <= tileObj.height; y++) {
				pxlObj.r = mapData.data[((y*tileObj.width)+x)*4];
				pxlObj.g = mapData.data[((y*tileObj.width)+x)*4+1];
				pxlObj.b = mapData.data[((y*tileObj.width)+x)*4+2];
				pxlObj.a = mapData.data[((y*tileObj.width)+x)*4+3];
				tileMap[x][y] = null;
				if (pxlObj.r < 32 && pxlObj.g < 32 && pxlObj.b > 192) {
					tileMap[x][y] = 'top';
				}
				if (pxlObj.r > 192 && pxlObj.g < 32 && pxlObj.b < 32) {
					tileMap[x][y] = 'right';
				}
				if (pxlObj.r < 32 && pxlObj.g > 192 && pxlObj.b < 32) {
					tileMap[x][y] = 'left';
				}
				if (pxlObj.r > 192 && pxlObj.g < 32 && pxlObj.b > 192) {
					tileMap[x][y] = 'bottom';
				}
			}
		}

		renderTiles();

	}

	function loadImage(url, callback) {

		img = new Canvas.Image();

		img.onload = function() {
			copyToCanvas();
			callback();
		};

		img.src = url;

	}

	function processFile(i, callback) {

		if (i >= 1000) {
			padding = '';
		} else if (i >= 100) {
			padding = '0';
		} else if (i >= 10) {
			padding = '00';
		} else {
			padding = '000';
		}

		inFile = __dirname + '/input/movie' + padding + i + '.png';
		outFile = __dirname + '/output/movie' + padding + i + '.png';

		var imgData = fs.readFile(inFile, function(err, imgData) {

			if (err) {
				console.log(err);
			}

			loadImage(imgData, function() {

				imgData = null;

				callback();

			});

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
