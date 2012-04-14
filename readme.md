NodeJS Dither Experiments
-------------------------

An experiment in batch-processing series of still frames exported from movies, which are then re-assembled as "filtered", lo-fi movies.

This is a bit laborious in terms of the process, relying on exporting hundreds/thousands of still frames, processing from the command-line, and then making new movies. Did I mention it's experimental? ;)

A few examples:
[Video: Scratching With Trains](http://www.flickr.com/photos/schill/6913710228/in/set-72157629776662919)
[Video: Making A Drink](http://www.flickr.com/photos/schill/6916945452/in/set-72157629776662919)
[Misc: Screenshot](http://www.flickr.com/photos/schill/6912563814/in/set-72157629776662919)

Included:

* 1-bit [Atkinson Dither](http://verlagmartinkoch.at/software/dither/index.html)-style rendering, port of [FlickrDithr](https://github.com/flickr/FlickrDithr/) code.

* Triangular "Pxl-effect"-style rendering based on Rev Dan Catt's [Pxl Effect](http://revdancatt.com/2012/03/31/the-pxl-effect-with-javascript-and-canvas-and-maths/) JS implementation.

Dependencies:

* LearnBoost's [node-canvas](https://github.com/LearnBoost/node-canvas) package.

Assumptions:

Both scripts expect source images to be in the pattern of input/movieXXXX.png (eg. 0000 -> 9999) and write to output/movieXXXX.png. QuickTime 7 will export image sequences with this numbering pattern.

Prep:

1) Make, or get, a movie.
2) Export frames at <= 720p for "new aesthetic", maybe 640x480 for the Atkinson style. I use QuickTime 7 (pro, $29.99) to export an image sequence from the .mov in this case. save as "movie", PNG format, in the output path. Frames take pattern of moviexxxx.png.
3) Run script to process images, 250 at a time to get around max file limitations (dependent on your OS.)

Usage:

To process input/movie0001.png ... input/movie0010.png, for example, with either method:

node flickrdithr-node.js 1 10
node dither-newaesthetic-node.js 1 10

General disclaimer:

Since I don't know node.js, I'm sure I'm doing all sorts of terribly-inefficient things. One fun one: Don't use ranges of 250+ files per execution, because the OS will hit a max-open file handle limit. Not sure why this is, despite trying to close / null files after writing.

Following the FlickrDithr code: "Released without license, as is, with no guarantee, support or anything else."