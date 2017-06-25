"use strict";

var KineticHelpers = {
    getNow: Date.now || (function () { return new Date().getTime(); }),

    rAF: function (f) { (window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || (function (callback) { window.setTimeout(callback, 1000 / 60); }))(f); },

    //Brent's method
    uniroot: function (a, b, c, d, e) { var n, o, p, q, r, f = b, g = c, h = f, i = a(f), j = a(g), k = i; for (d = d || 0, e = e || 1e3; e-- > 0;) { if (p = g - f, Math.abs(k) < Math.abs(j) && (f = g, g = h, h = f, i = j, j = k, k = i), n = 1e-15 * Math.abs(g) + d / 2, o = (h - g) / 2, Math.abs(o) <= n || 0 === j) return g; if (Math.abs(p) >= n && Math.abs(i) > Math.abs(j)) { var s, t, u; t = h - g, f === h ? (s = j / i, q = t * s, r = 1 - s) : (r = i / k, s = j / k, u = j / i, q = u * (t * r * (r - s) - (g - f) * (s - 1)), r = (r - 1) * (s - 1) * (u - 1)), q > 0 ? r = -r : q = -q, q < .75 * t * r - Math.abs(n * r) / 2 && q < Math.abs(p * r / 2) && (o = q / r) } Math.abs(o) < n && (o = o > 0 ? n : -n), f = g, i = j, g += o, j = a(g), (j > 0 && k > 0 || j < 0 && k < 0) && (h = f, k = i) } },

    prefixCss: function (el, attr) {
        var prefixes = ['Webkit', 'Moz', 'O', 'ms', 'Khtml'];
        for (var i = 0; i < prefixes.length; i++) {
            var prefixed = prefixes[i] + attr.charAt(0).toUpperCase() + attr.slice(1);
            if (typeof el.style[prefixed] !== 'undefined') {
                return prefixed;
            }
        }
        return attr;
    }
};

function KineticSurface(el, options) {
    if (typeof (el) == "string") {
        el = document.getElementById(el);
    }

    if (!el) {
        throw "el is required"
    }

    var _this = this;
    options = options || {};

    var defaults = {
        friction: 0.005,
        boundX: [null, null], //Set these guys to [0,0] to disable movement in that direction.
        boundY: [null, null],
        initialPosition: [0, 0], //Initial position
        snapX: 1,
        snapY: 1,
        bounce: true,
        stateChanged: null,
        tap: null, // Tap handler (click and didn't move, f(x,y))
        update: function (x, y) {
            el.style.left = x + "px";
            el.style.top = y + "px";
        }
    };

    _this.options = options;

    for (var s in defaults) {
        if (!options[s]) {
            options[s] = defaults[s];
        }
    }

    _this.didMove = false; //True if the el at some point moved more than 3 pixels between onDown and onUp (for "tap" event)

    var paused;
    var pointer = { active: false, current: null, start: null, previous: null, startPosition: null };
    var position = { x: _this.options.initialPosition[0], y: _this.options.initialPosition[1] };

    el.addEventListener('touchstart', onDown);
    el.addEventListener('mousedown', onDown);



    //{ Events

    var trackingPoints = []; //Track touch movement. Collect multiple points to avoid "weird".

    _this.pause = function () {
        pointer.active = false;
        paused = true;
    };

    _this.resume = function () {
        paused = false;
    };


    // Creates a custom normalized event object from touch and mouse events		 
    function normalizeEvent(ev) {
        if (ev.type === 'touchmove' || ev.type === 'touchstart' || ev.type === 'touchend') {
            var touch = ev.targetTouches[0] || ev.changedTouches[0];
            return {
                x: touch.clientX,
                y: touch.clientY,
                id: touch.identifier
            };
        } else { // mouse events
            return {
                x: ev.clientX,
                y: ev.clientY,
                id: null
            };
        }
    }

    /**
     * Initializes movement tracking
     * @param  {Object} ev Normalized event
     */
    function onDown(ev) {
        var event = normalizeEvent(ev);
        ev.preventDefault();

        if (!pointer.active && !paused) {
            _this.didMove = false;
            stopAnimation();

            pointer.active = true;
            pointer.current = pointer.previous = pointer.start = event;
            pointer.startPosition = { x: position.x, y: position.y };

            trackingPoints = [];
            addTrackingPoint(pointer.current);

            document.addEventListener('touchmove', onMove);
            document.addEventListener('touchend', onUp);
            document.addEventListener('touchcancel', stopTracking);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);

            //callStateChangedCallback("down");
        }
    }

    /**
     * Handles move events
     * @param  {Object} ev Normalized event
     */
    function onMove(ev) {
        ev.preventDefault();
        var event = normalizeEvent(ev);
        if (pointer.active && event.id === pointer.start.id) {
            pointer.current = event;
            if (!_this.didMove && pointer.start) {
                var dx = (event.x - pointer.start.x), dy = (event.y - pointer.start.y);
                var dist = Math.sqrt(dx * dx + dy * dy);
                _this.didMove = dist > 3;

                if (dist > 0) {
                    //    callStateChangedCallback("start");
                }
            }

            addTrackingPoint(pointer.previous);
            rAFThrottled(updateAndRender);
        }
    }

    /**
     * Handles up/end events
     * @param {Object} ev Normalized event
     */
    function onUp(ev) {
        var event = normalizeEvent(ev);
        if (!_this.didMove && _this.options.tap) {
            _this.options.tap.call(_this, pointer.current.x, pointer.current.y);
        };
        if (pointer.active && event.id === pointer.start.id) {
            stopTracking();
        }
    }

    /**
     * Stops movement tracking, starts animation
     */
    function stopTracking() {
        pointer.active = false;

        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
        document.removeEventListener('touchcancel', stopTracking);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('mousemove', onMove);

        addTrackingPoint(pointer.current);

        var firstPoint = trackingPoints[0];
        var lastPoint = trackingPoints[trackingPoints.length - 1];
        var dx = lastPoint.x - firstPoint.x;
        var dy = lastPoint.y - firstPoint.y;
        var elapsed = lastPoint.time - firstPoint.time;

        if (!animating) {
            startDecelAnimation(position, elapsed > 0 ? dx / elapsed : 0, elapsed > 0 ? dy / elapsed : 0);
        }
    }

    /**
     * Records movement for the last 100ms
     * @param {number} x
     * @param {number} y [description]
     */
    function addTrackingPoint(point) {
        point.time = getNow();
        while (trackingPoints.length > 0) {
            if (point.time - trackingPoints[0].time <= 100) {
                break;
            }
            trackingPoints.shift();
        }

        trackingPoints.push(point);
    }

    function updateAndRender() {
        position.x = applyBoundResistance(pointer.startPosition.x + pointer.current.x - pointer.start.x, _this.options.boundX);
        position.y = applyBoundResistance(pointer.startPosition.y + pointer.current.y - pointer.start.y, _this.options.boundY);

        options.update.call(_this, position.x, position.y);

        pointer.previous = pointer.current;
    }

    function stopAnimation() {
        animating = false;
    }

    // } /Events

    //{ Kinetics

    _this.moveTo = function (x, y) {
        var vx = frictionAnimation.v0FromDestination(position.x, x, _this.options.friction);
        var vy = frictionAnimation.v0FromDestination(position.y, y, _this.options.friction);
        startDecelAnimation(position, vx, vy);
    }

    function snapRound(pos, snap, min) {
        if (typeof (min) == "number") {
            pos -= min;
        }
        return snap > 0 ? Math.round(pos / snap) * snap : pos;
    }

    var t0;
    var animations = { x: null, y: null };
    var animating = false;
    function startDecelAnimation(pos, vx, vy) {

        if (Math.abs(vx) < V_MIN) vx = 0;
        if (Math.abs(vy) < V_MIN) vy = 0;

        if (Math.abs(vx) > 0
            || Math.abs(vy) > 0
            || !inBounds(pos)
            || snapRound(pos.x, _this.options.snapX, _this.options.boundX[0]) != pos.x
            || snapRound(pos.y, _this.options.snapY, _this.options.boundY[0]) != pos.y) {

            animating = true;
            _this.didMove = true;
            t0 = getNow();

            animations.x = endBounceAnimation(pos.x, vx, _this.options.friction, _this.options.boundX[0], _this.options.boundX[1], 1, _this.options.snapX);
            animations.y = endBounceAnimation(pos.y, vy, _this.options.friction, _this.options.boundY[0], _this.options.boundY[1], 1, _this.options.snapY);

            rAF(animate);
        }

        setTimeout(function () { _this.didMove = false; }, 0); //Allow state change listener to see whether we moved.        
    }

    function animate() {
        if (!animating) {
            if (!pointer.active) {
                //    callStateChangedCallback("end"); //Scroll ended if the pointer is not active.
            }
            return;
        }

        var t = getNow() - t0;
        position.x = animations.x.x(t);
        position.y = animations.y.x(t);
        if (t > animations.x.tstop && t > animations.y.tstop) {
            animating = false;
        }

        _this.options.update.call(this, position.x, position.y);
        rAF(animate);
    }

    function inBounds() {
        return checkBounds(position.x, _this.options.boundX) == 0 && checkBounds(position.y, _this.options.boundY) == 0;
    }

    //Checks whether the position is within the bounds. If smaller than bounds[0] negative number is returned, greather than bounds[1] then positive; 0 otherwise.
    function checkBounds(pos, bounds) {
        return (typeof (bounds[0]) != "number" || pos < bounds[0]) ? (pos - bounds[0])
            : (typeof (bounds[1]) != "number" || pos > bounds[1]) ? (pos - bounds[1]) : 0;
    }

    function applyBoundResistance(pos, bounds) {
        var overflow = checkBounds(pos, bounds);
        if (overflow != 0) {
            //Max extension if you scroll kind of fast.        
            var maxSpeed = 7;
            var max = dampedAnimation.topPoint(maxSpeed, _this.options.friction * 4);
            //1 px off gives .5px displacement and decays exponentially.
            var bound = overflow < 0 ? bounds[0] : bounds[1];
            if (max < .5) {
                return bound;
            } else {
                var dir = overflow < 0 ? -1 : 1;
                var l = Math.log(max / (max - .5));
                return bound + dir * (max - max * Math.exp(-l * Math.abs(overflow)));
            }
        }
        return pos;
    }
    //}


    //{ Support functions    

    var getNow = KineticHelpers.getNow;
    var rAF = KineticHelpers.rAF;

    var rAFLock = false;
    var rAFThrottled = function (f) {
        if (!rAFLock) {
            rAF(function () { f(); rAFLock = false; });
        }
        rAFLock = true;
    }
    //} /Support functions

    //{ Animation functions


    //When movement is less than .1 pixels per (max) frame, then stop animation (otherwise long tails will make animation run for a long time).            
    var FRAME_LENGTH = 1000 / 60;
    var STOP_TOLERANCE = 0.1;
    var V_STOP = STOP_TOLERANCE * 1 / FRAME_LENGTH;
    var V_MIN = STOP_TOLERANCE; //Don't animate if velocity is below this.

    //When does the position change V_STOP in a frame?
    function findStopTime(x) {
        return KineticHelpers.uniroot(function (t) {
            return Math.abs(
                //Look at two intervals to avoid finding the top point of a fast animation.
                Math.abs(x(t + FRAME_LENGTH / 2) - x(t)) + Math.abs(x(t + FRAME_LENGTH) - x(t + FRAME_LENGTH / 2))) - STOP_TOLERANCE;
        }, 0, 5000, 0.1, 100);
    }

    function frictionAnimation(x0, v0, mu) {
        //x''(t) = -mu x'(t), x'(0) = v0, x(0) = x0                

        var xstop = Math.abs(v0) <= V_STOP ? x0 : x0 + (v0 - (v0 < 0 ? -1 : 1) * V_STOP) / mu;

        var animation = {
            x: function (t) { return t < 0 ? x0 : t > animation.tstop ? xstop : x0 - (v0 * Math.exp(-mu * t) - v0) / mu; },
            t: function (x) {
                if (Math.abs(v0) <= V_STOP) {
                    //No movement.                            
                    return x == xstop ? 0 : Number.NaN;
                }
                return (Math.log(v0 / (mu * x0 - mu * x + v0))) / mu;
            },
            v: function (t) { return v0 * Math.exp(-mu * t); },
            xstop: xstop
        };
        animation.tstop = animation.t(xstop);
        return animation;
    }

    frictionAnimation.v0FromDestination = function (x0, dest, mu) {
        var dir = dest > x0 ? 1 : -1;
        var tol = dir * V_STOP;
        return mu * (dest - x0) + tol;
    };

    function underdampedAnimation(x0, v0, mu, offset, k) {
        //x''(t) = -m x'(t) - k * m^2/4 x(t), x'(0) = v0, x(0) = x0, k > 1 (underdamping)                                               
        if (typeof (k) != "number") k = 4;

        function x(t) {
            return (Math.exp(-(mu * t) / 2) * (Math.sqrt(k - 1) * (mu * x0 + 2 * v0) * Math.sin(1 / 2 * Math.sqrt(k - 1) * mu * t) + (k - 1) * mu * x0 * Math.cos(1 / 2 * Math.sqrt(k - 1) * mu * t))) / ((k - 1) * mu);
        }

        var tstop = findStopTime(x);
        var cutoff = x(tstop);
        var animation = {
            x: function (t) { return offset + (t < 0 ? x0 : t > tstop ? 0 : x(t) - cutoff); },
            t: function (x) { throw "Not implemented. Not required." },
            v: function (t) {
                return (Math.exp(-(mu * t) / 2) * (2 * (k - 1) * v0 * Math.cos(1 / 2 * Math.sqrt(k - 1) * mu * t) - Math.sqrt(k - 1) * (k * mu * x0 + 2 * v0) * Math.sin(1 / 2 * Math.sqrt(k - 1) * mu * t))) / (2 * (k - 1));
            },
            tstop: tstop
        };

        animation.xstop = offset;

        return animation;
    }

    function dampedAnimation(x0, v0, mu, offset) {

        //x''(t) = -m x'(t) - m^2/4 x(t), x'(0) = v0, x(0) = x0 (Critical damping)
        function x(t) {
            return 0.5 * Math.exp(-(mu * t) / 2) * (x0 * (mu * t + 2) + 2 * t * v0);
        }

        var tstop = findStopTime(x);
        var cutoff = x(tstop);
        var animation = {
            x: function (t) { return offset + (t < 0 ? x0 : t > tstop ? 0 : x(t) - cutoff); },
            t: function (x) { throw "Not implemented. Not required." },
            v: function (t) {
                return -0.25 * Math.exp(-(mu * t) / 2) * (mu * mu * x0 * t + 2 * mu * t * v0 - 4 * v0);
            },
            atEnd: function (t) {
                return t >= tstop;
            },
            tstop: tstop
        };

        animation.xstop = offset;
        return animation;
    }

    //Gets the top point of the bounce back animation assuming the body is leaving the bounds with the velocity specified
    dampedAnimation.topPoint = function (v0, mu) {
        //Top point: 2/mu; 
        var t = 2 / mu;
        var x0 = 0;
        return 0.5 * Math.exp(-(mu * t) / 2) * (2 * t * v0);
    }

    //Friction animation that bounces in the ends.
    function endBounceAnimation(x0, v0, mu, min, max, bounceKind, snap) {
        var f = frictionAnimation(x0, v0, mu);

        var b = null; //Animation function when out of bounds
        var tbounce = Number.MAX_VALUE; //Time we go out of bounds
        var stop = f.xstop;

        min = typeof (min) == "number" ? min : -10000000;
        max = typeof (max) == "number" ? max : 10000000;
        if (stop < min || stop > max) {
            var scale = bounceKind == 2 ? 4 : 6;
            var bound = stop < min ? min : max;
            var startOffset = x0 < min ? x0 - min : x0 > max ? x0 - max : 0;
            tbounce = f.t(bound + startOffset);
            if (!bounceKind) {
                b = frictionAnimation(bound, 0, mu);
            } else if (bounceKind == 2) {
                b = underdampedAnimation(startOffset, f.v(tbounce), mu * scale, bound, 6);
            } else {
                b = dampedAnimation(startOffset, f.v(tbounce), mu * scale, bound);
            }
        } else if (snap) {

            var snapStop = snapRound(stop, snap, min) + min;
            // if( v0 < 0 && snapStop > x0) {                
            // snapStop = Math.max(min, snapStop - snap);                
            // } else if( v0 > 0 && snapStop < x0) {
            // snapStop = Math.min(max, snapStop + snap);                
            // }
            if (snapStop != stop) {
                var v0 = frictionAnimation.v0FromDestination(x0, snapStop, mu);
                if (Math.abs(v0) < V_STOP) {
                    f = frictionAnimation(x0 + v0, 0, mu);
                } else {
                    f = frictionAnimation(x0, v0, mu);
                }
            }
        }


        return {
            x: function (t) {
                return t >= tbounce ? b.x(t - tbounce) : f.x(t);
            },
            t: function (x) {
                return x <= stop ? f.t(x) : b.t(x);
            },
            v: function (t) {
                return t >= tbounce ? b.v(t - tbounce) : f.v(t);
            },
            tbounce: tbounce,
            tstop: b ? tbounce + b.tstop : f.tstop,
            xstop: b ? b.xstop : f.xstop
        }
    }
    //} /Animation functions

}