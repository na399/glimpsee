"use strict";

function fisheyeElementsCanvas(canvas, images, nx, maxSize, containerSize, boundX, boundY) {

    var ny = images.length / nx;

    var rangeX = boundX[1] - boundX[0];
    var rangeY = boundY[1] - boundY[0];

    var fishX = fisheyeScale(1, 0, 0, 1);
    var fishY = fisheyeScale(1, 0, 0, 1);

    var scaleX = containerSize[0];
    var scaleY = containerSize[1];

    var xs = new Array(nx + 1);
    var ys = new Array(ny + 1);

    var pending = 0;
    var lastCoords = [0, 0];

    //Find distinct images
    var imageMap = {};
    for (var i = 0; i < images.length; i++) {
        if (!imageMap[images[i]]) {
            ++pending;
            imageMap[images[i]] = true;
        }
    }

    //Load images
    for (var src in imageMap) {
        var img = new Image();
        img.onload = function () {
            if (--pending == 0) {
                //Update when all images are loaded
                updateElements(lastCoords[0], lastCoords[1]);
            }
        };
        img.src = src;
        imageMap[src] = img;
    }


    function updateElements(offsetX, offsetY) {
        lastCoords = [offsetX, offsetY];
        if (pending) {
            return;
        }

        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var stepX = 1 / nx;
        var stepY = 1 / ny;
        var startX = scaleX * fishX((offsetX) * stepX);
        for (var x = 0; x <= nx; x++) {
            var endX = scaleX * fishX((offsetX + x + 1) * stepX);
            endX = x == nx ? Math.ceil(endX) : Math.floor(endX);
            xs[x] = startX;
            startX = endX;
        }

        var startY = scaleY * fishY((offsetY) * stepY);
        for (var y = 0; y <= ny; y++) {
            var endY = scaleY * fishY((offsetY + y + 1) * stepY);
            endY = y == ny ? Math.ceil(endY) : Math.floor(endY);
            ys[y] = startY;
            startY = endY;
        }

        // var test = imageMap[images[0]];
        // ctx.drawImage(test, 100, 0, 100, 100);
        // return;
        var ix = 0;
        for (var y = 0; y < ny; y++) {
            var posy = ys[y];
            var h = ys[y + 1] - posy;
            for (var x = 0; x < nx; x++) {
                var posx = xs[x];
                var w = xs[x + 1] - posx;

                var sel = ((x == 0 || w - 1 > (xs[x] - xs[x - 1])) && (x == nx - 1 || w - 1 > (xs[x + 2] - xs[x + 1])))
                    && ((y == 0 || h - 1 > (ys[y] - ys[y - 1])) && (y == ny - 1 || h - 1 > (ys[y + 2] - ys[y + 1])));

                var img = imageMap[images[ix++]];
                if (w < 1 && h < 1) {

                } else {
                    var maxScale = Math.min(Math.min(1, (maxSize[0] + 0) / img.width), Math.min(1, maxSize[1] / img.height));

                    var tw = Math.min(w, maxScale * img.width);
                    var th = Math.min(h, maxScale * img.height);

                    var alpha = Math.pow(w / maxSize[0] * h / maxSize[1], 1 / 10);
                    ctx.globalAlpha = alpha;
                    ctx.drawImage(img,
                        (img.width - tw / maxScale) / 2, (img.height - th / maxScale) / 2, tw / maxScale, th / maxScale,
                        posx + (w - tw) / 2, posy + (h - th) / 2,
                        tw, th
                    );
                    ctx.globalAlpha = 1;

                    /*ctx.font = "12px serif";
                    ctx.textBaseline = "top";
                    ctx.fillText(100*alpha + "%", posx + (w - tw)/2, posy + (h-th)/2);*/

                    if (sel) {
                        ctx.beginPath();
                        ctx.lineWidth = 4;
                        ctx.strokeStyle = "rgba(33, 150, 243, 0)";
                        //ctx.strokeStyle="#3F51B5";
                        roundRect(ctx, posx + 2, posy + 2, w - 4, h - 4, 10);
                        ctx.stroke();
                    }
                }
            }
        }
    }
    //{ Canvas support

    var roundRect = function (canvas, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        if (h <= 0 || w <= 0) return;
        canvas.beginPath();
        canvas.moveTo(x + r, y);
        canvas.arcTo(x + w, y, x + w, y + h, r);
        canvas.arcTo(x + w, y + h, x, y + h, r);
        canvas.arcTo(x, y + h, x, y, r);
        canvas.arcTo(x, y, x + w, y, r);
        canvas.closePath();
        return this;
    }

    //}

    var updateFish = function (pos, maxSize, min, max, fish, n, scale, log) {

        var p, overflow;
        if (min >= max) {
            //One row
            p = 0.25*pos/maxSize;
            overflow = p < 0 ? -p*.5 : p;
        } else {
            p = (pos - min) / (max - min);

            fish.focus(Math.max(0, Math.min(1, p)));
            overflow = p < 0 ? -p : p > 1 ? p - 1 : 0;

            //Gets the "d" for the fisheye that gives the desired max width        
            var size = maxSize;// + overflow;
            // var d = scale-size == 0 ? 0 : (n*size - scale) / (scale - size);        
            var d = (n * size - scale) / (scale - size);
            if (Number.isNaN(d) || d < 0) {
                d = 1;
            }
            fish.setD(d, n, scale);
        }
        return (p < 0 ? 1 : -1) * 4 * overflow;
    }

    var updateFunction = function (x, y) {

        var overflowX = updateFish(x, maxSize[0], boundX[0], boundX[1], fishX, nx, scaleX, true);
        var overflowY = updateFish(y, maxSize[1], boundY[0], boundY[1], fishY, ny, scaleY);
        updateElements(overflowX, overflowY);
    };

    // updateFunction.snapX = rangeX * 1/(nx-1);
    // updateFunction.snapY = rangeY * 1/(ny-1);
    updateFunction.snapX = nx > 2 ? rangeX * 1 / (nx - 1) : 0;
    updateFunction.snapY = ny > 2 ? rangeY * 1 / (ny - 1) : 0;

    updateFunction.inverse = function (x, y, snap) {
        var pos = { x: fishX.inverse(x), y: fishY.inverse(y) };
        if (snap) {
            var snapX = 1 / (nx);
            var snapY = 1 / (ny);
            pos.x = Math.floor(pos.x / snapX) * snapX + snapX / 2;
            pos.y = Math.floor(pos.y / snapY) * snapY + snapY / 2;
        }
        return pos;
    };

    return updateFunction;
}

function fisheyeScale(d, a, min, max) {
    var f = (function (x) {
        x = Math.min(max, Math.max(min, x));
        var left = x < a,
            m = left ? a - min : max - a;
        if (m == 0) m = max - min;
        return (left ? -1 : 1) * m * (d + 1) / (d + (m / Math.abs(x - a))) + a;
    });

    f.inverse = function (y) {
        return KineticHelpers.uniroot(function (x) { return f(x) - y; }, 0, 1, 0.00001, 100);
    };

    f.setD = function (x) {
        d = x;
    };

    f.focus = function (x) {
        a = x;
    };

    return f;
}