/**
 * 
def fromScreen(x, y):
	return (2.0 * y + x) / 2.0, ((2.0 * y - x) / 2.0)

def toScreen(x, y, z):
	return x - y, (x + y) / 2.0 - z

 */

Math.isometricToScreen = function(x, y, z) {
	return [ x - y, (x + y) / 2.0 - z ];
};

Math.isometricFromScreen = function(x, y) {
	return [ (2.0 * y + x) / 2.0, (2.0 * y - x) / 2.0 ];
};

class Renderer {
	constructor(context, width, height, pixelSize) {
		pixelSize = pixelSize || 1;
		pixelSize = Math.max(Math.min(pixelSize, 4), 1);

		this.backCanvas = document.createElement("canvas");
		this.backCanvas.width = ~~(width / pixelSize);
		this.backCanvas.height = ~~(height / pixelSize);
		this.backContext = this.backCanvas.getContext("2d");

		this.width = this.backCanvas.width;
		this.height = this.backCanvas.height;
		this.pixelSize = pixelSize;
		this.context = context;
		this.commands = new Array();
		this.cameraX = 0;
		this.cameraY = 0;

		this.context.imageSmoothingEnabled = false;
		this.backContext.imageSmoothingEnabled = false;
	}

	get camera() {
		let cx = this.cameraX - ~~(this.width / 2);
		let cy = this.cameraY - ~~(this.height / 2);
		return [cx, cy];
	}

	set camera(cam) {
		this.cameraX = cam[0];
		this.cameraY = cam[1];
	}

	raw(image, x, y, ox, oy, sx, sy, sw, sh, color) {
		ox = ox || 0.0;
		oy = oy || 0.0;
		sx = sx || 0;
		sy = sy || 0;
		sw = sw || image.width;
		sh = sh || image.height;
		color = color || [255, 255, 255, 1.0];

		let ix = x - (~~(sw * ox));
		let iy = y - (~~(sh * oy));

		this.commands.push({
			image: image,
			x: ix,
			y: iy,
			source: [sx, sy, sw, sh],
			color: color
		});
	}

	tile(image, x, y, ox, oy, index, rows, cols, color) {
		let tw = ~~(image.width / cols);
		let th = ~~(image.height / rows);
		let sx = (index % cols) * tw;
		let sy = ~~(index / cols) * th;
		this.raw(image, x, y, ox, oy, sx, sy, tw, th, color);
	}

	clear(r, g, b) {
		r = r || 0;
		g = g || 0;
		b = b || 0;
		this.backContext.save();
		this.backContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
		this.backContext.fillRect(0, 0, this.backCanvas.width, this.backCanvas.height);
		this.backContext.restore();
	}

	/**
	 * Draws everything to the screen
	 * @param {string} sorting 
	 * @param {RenderingContext} context
	 */
	flush(sorting, applyCamera) {
		let context = this.backContext;

		applyCamera = applyCamera || true;
		sorting = sorting || "none";
		sorting = sorting.toLowerCase();

		if (sorting === "back") {
			this.commands = this.commands.reverse();
		} else if (sorting === "y") {
			this.commands.sort(function(a, b) { return a.y < b.y ? -1 : 1; });
		} else if (sorting === "y-") {
			this.commands.sort(function(a, b) { return a.y > b.y ? -1 : 1; });
		}

		let cam = this.camera;

		// Cull things out
		let culledCommands = [];
		for (let cmd of this.commands) {
			let x = applyCamera ? cmd.x - cam[0] : cmd.x,
				y = applyCamera ? cmd.y - cam[1] : cmd.y,
				w = cmd.source[2],
				h = cmd.source[3];
			if (x + w >= 0 &&
				x < this.width &&
				y + h >= 0 &&
				y < this.height
			) {
				culledCommands.push(cmd);
			}
		}

		context.save();
		for (let cmd of culledCommands) {
			context.globalAlpha = cmd.color[3];
			let x = applyCamera ? cmd.x - cam[0] : cmd.x,
				y = applyCamera ? cmd.y - cam[1] : cmd.y;
			context.drawImage(cmd.image, cmd.source[0], cmd.source[1], cmd.source[2], cmd.source[3], ~~x, ~~y, cmd.source[2], cmd.source[3]);
		}
		context.restore();

		this.context.drawImage(this.backCanvas, 0, 0, this.backCanvas.width * this.pixelSize, this.backCanvas.height * this.pixelSize);

		this.commands = [];
	}
}

const TIME_STEP = 1.0 / 60.0;

class ContentHandler {
	constructor() {
		this.fileQueue = [];
		this.assets = {};
	}

	addImage(name, path) {
		this.fileQueue.push({ type: "image", name: name, path: path });
	}

	loadAll(onFinished) {
		let ok = 0, err = 0;
		let that = this;
		function check() {
			if (ok + err === that.fileQueue.length && onFinished) onFinished();
		}

		for (let file of this.fileQueue) {
			if (file.type === "image") {
				let img = new Image();
				img.onload = function() {
					that.assets[file.name] = img;
					ok++;
					check();
				};
				img.onerror = function() {
					err++;
					check();
				};
				img.src = file.path;
			}
		}
	}
}

class Fw {
	constructor(width, height, pixelSize) {
		this.canvas = document.createElement("canvas");
		this.canvas.width = width;
		this.canvas.height = height;
		this.context = this.canvas.getContext("2d");
		document.body.appendChild(this.canvas);

		this.renderer = new Renderer(this.context, width, height, pixelSize);
		this.content = new ContentHandler();

		this.lastTime = Date.now();
		this.accum = 0;

		this.mouse = [0, 0];
		this.mouseDown = [0, 0, 0];
		this.mouseUp = [0, 0, 0];
		this.mouseHold = [0, 0, 0];

		let that = this;
		this.canvas.onmousemove = function(e) {
			let rect = that.canvas.getBoundingClientRect();
			let cam = that.renderer.camera;
			that.mouse[0] = ~~((e.clientX - rect.left) / pixelSize) + cam[0];
			that.mouse[1] = ~~((e.clientY - rect.top) / pixelSize) + cam[1];
		};
		this.canvas.onmousedown = function(e) {
			that.mouseDown[e.button] = true;
			that.mouseHold[e.button] = true;
		};
		this.canvas.onmouseup = function(e) {
			that.mouseUp[e.button] = true;
			that.mouseHold[e.button] = false;
		};
	}

	isMouseDown(btn) {
		return this.mouseHold[btn];
	}

	isMouseUp(btn) {
		return this.mouseUp[btn];
	}

	isMousePressed(btn) {
		return this.mouseDown[btn];
	}

	run(adapter) {
		if (adapter.onLoad) {
			adapter.onLoad(this);
		}

		let that = this;
		this.content.loadAll(function() {
			if (adapter.onStart) {
				adapter.onStart(that);
			}
			that._mainloop(adapter);
		});
	}

	_mainloop(adapter) {
		if (adapter.onUpdate) adapter.onUpdate(this, TIME_STEP);
		if (adapter.onDraw) adapter.onDraw(this);
		for (let i = 0; i < this.mouseDown.length; i++) this.mouseDown[i] = false;
		for (let i = 0; i < this.mouseUp.length; i++) this.mouseUp[i] = false;
		window.requestAnimationFrame(this._mainloop.bind(this, adapter));
	}
}