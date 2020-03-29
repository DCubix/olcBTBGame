/**
 * 
def fromScreen(x, y):
	return (2.0 * y + x) / 2.0, ((2.0 * y - x) / 2.0)

def toScreen(x, y, z):
	return x - y, (x + y) / 2.0 - z

 */

Math.isometricToScreen = function(x, y, z) {
	z = z || 0;
	return [ ~~(x - y), ~~((x + y) / 2.0 - z) ];
};

Math.isometricFromScreen = function(x, y) {
	return [ ~~((2.0 * y + x) / 2.0), ~~((2.0 * y - x) / 2.0) ];
};

Math.distance = function(x1, y1, x2, y2) {
	let dx = x2 - x1,
		dy = y2 - y1;
	return Math.sqrt(dx * dx + dy * dy);
};

Math.clamp = function(a, mi, ma) {
	return Math.max(Math.min(a, ma), mi);
};

Math.smoothstep = function(e0, e1, x) {
	let t = Math.clamp((x - e0) / (e1 - e0), 0.0, 1.0);
	return t * t * (3.0 - 2.0 * t);
};

Math.remap = function(val, fmi, fma, tmi, tma) {
	let ratio = (val - fmi) / (fma - fmi);
	return tmi + ratio * (tma - tmi);
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
		this.applyCamera = true;

		this.context.imageSmoothingEnabled = false;
		this.backContext.imageSmoothingEnabled = false;

		this.imageData = this.backContext.getImageData(0, 0, this.backCanvas.width, this.backCanvas.height);
	}

	get camera() {
		if (!this.applyCamera) {
			return [0, 0];
		}
		let cx = this.cameraX - ~~(this.width / 2);
		let cy = this.cameraY - ~~(this.height / 2);
		return [cx, cy];
	}

	set camera(cam) {
		this.cameraX = cam[0];
		this.cameraY = cam[1];
	}

	pixel(x, y, color) {
		if (x < 0 || x >= this.imageData.width || y < 0 || y >= this.imageData.height)
			return;

		let pixels = this.imageData.data;
		color = color || [1.0, 1.0, 1.0];

		let i = (x + y * this.imageData.width) * 4;

		let r = ~~(color[0] * 255) % 256,
			g = ~~(color[1] * 255) % 256,
			b = ~~(color[2] * 255) % 256;
		if (pixels[i + 0] != r) pixels[i + 0] = r;
		if (pixels[i + 1] != g) pixels[i + 1] = g;
		if (pixels[i + 2] != b) pixels[i + 2] = b;
		pixels[i + 3] = 255;
	}

	/**
	 * 
	 * @param {ImageData} image 
	 * @param {*} x 
	 * @param {*} y 
	 * @param {*} w 
	 * @param {*} h 
	 * @param {*} sx 
	 * @param {*} sy 
	 * @param {*} sw 
	 * @param {*} sh 
	 */
	draw(image, dx, dy, dw, dh, sx, sy, sw, sh, color) {
		color = color || [1.0, 1.0, 1.0];
		let pixels = image.data;
		for (let k = 0; k < dw * dh; k++) {
			let x = k % dw;
			let y = ~~Math.floor(k / dw);
			let cx = Math.remap(x, 0, dw, 0, sw),
				cy = Math.remap(y, 0, dh, 0, sh);
			let ix = cx + sx,
				iy = cy + sy;
			let si = (ix + iy * image.width) * 4;
			if (ix < 0 || ix >= image.width || iy < 0 || iy >= image.height) continue;
			if (pixels[si + 3] < 128) continue;

			let col = [0, 0, 0];
			col[0] = (pixels[si + 0]/255) * color[0];
			col[1] = (pixels[si + 1]/255) * color[1];
			col[2] = (pixels[si + 2]/255) * color[2];
			this.pixel(x + dx, y + dy, col);
		}
	}

	raw(image, x, y, ox, oy, sx, sy, sw, sh, color) {
		let cam = this.camera;

		ox = ox || 0.0;
		oy = oy || 0.0;
		sx = sx || 0;
		sy = sy || 0;
		sw = sw || image.width;
		sh = sh || image.height;
		color = color || [1.0, 1.0, 1.0];

		let ix = x - (~~(sw * ox));
		let iy = y - (~~(sh * oy));

		this.commands.push({
			type: "image",
			image: image,
			x: ix - cam[0],
			y: iy - cam[1],
			source: [sx, sy, sw, sh],
			color: color,
			ex: x,
			ey: y
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
		// for (let y = 0; y < this.imageData.height; y++) {
		// 	for (let x = 0; x < this.imageData.width; x++) {
		// 		this.pixel(x, y, [r, g, b]);
		// 	}
		// }
		this.backContext.fillStyle = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
		this.backContext.fillRect(0, 0, this.imageData.width, this.imageData.height);
	}

	/**
	 * Draws everything to the screen
	 * @param {string} sorting 
	 * @param {RenderingContext} context
	 */
	flush(sorting) {
		let context = this.backContext;

		sorting = sorting || "none";
		sorting = sorting.toLowerCase();

		if (sorting === "back") {
			this.commands = this.commands.reverse();
		} else if (sorting === "y") {
			this.commands.sort(function(a, b) { return a.ey > b.ey ? -1 : 1; });
		} else if (sorting === "y-") {
			this.commands.sort(function(a, b) { return a.ey < b.ey ? -1 : 1; });
		}

		// Cull things out
		let culledCommands = [];
		for (let cmd of this.commands) {
			let x = cmd.x,
				y = cmd.y,
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
			context.globalAlpha = cmd.color[0];
			
			let x = cmd.x,
				y = cmd.y;
			//this.draw(cmd.image, ~~x, ~~y, cmd.source[2], cmd.source[3], cmd.source[0], cmd.source[1], cmd.source[2], cmd.source[3], cmd.color);
			context.drawImage(cmd.image, cmd.source[0], cmd.source[1], cmd.source[2], cmd.source[3], ~~x, ~~y, cmd.source[2], cmd.source[3]);
		}
		context.restore();

		//this.backContext.putImageData(this.imageData, 0, 0);
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
					let cnv = document.createElement("canvas");
					cnv.width = img.width;
					cnv.height = img.height;
					let ctx = cnv.getContext("2d");
					ctx.drawImage(img, 0, 0);

					let dat = ctx.getImageData(0, 0, cnv.width, cnv.height);

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

class Entity {
	constructor() {
		this.x = 0;
		this.y = 0;
		this.tag = "";
		this.life = -1;
		this.visible = true;
		this.dead = false;
		this.__created = false;
	}

	onCreate(framework) {}
	onUpdate(framework, dt) {}
	onDraw(framework) {}
	onDestroy(framework) {}

	destroy(timeout) {
		timeout = timeout || timeout + 0.0001;
		this.life = timeout;
	}

	update(framework, dt) {
		if (!this.__created) {
			this.onCreate(framework);
			this.__created = true;
		}
		this.onUpdate(framework, dt);

		if (this.life >= 0.0) {
			this.life -= dt;
			if (this.life <= 0.0) {
				this.life = 0.0;
				this.dead = true;
				this.onDestroy(framework);
			}
		}
	}
}

class EntityHandler {
	constructor() {
		this.entities = [];
	}

	add(entity) {
		entity.__created = false;
		entity.life = -1;
		entity.dead = false;
		this.entities.push(entity);
	}

	destroyAll(tag, timeout) {
		for (let ent of this.entities) {
			if (ent.tag === tag) ent.destroy(timeout);
		}
	}

	update(framework, dt) {
		let dead = [];
		let i = 0;
		for (let ent of this.entities) {
			ent.update(framework, dt);
			if (ent.dead) dead.push(i);
			i++
		}
		dead = dead.sort().reverse();
		for (let d of dead) {
			this.entities.splice(d, 1);
		}
	}

	render(framework, tag) {
		for (let ent of this.entities) {
			if (tag && ent.tag !== tag) continue;
			if (!ent.__created) continue;
			if (!ent.visible) continue;
			ent.onDraw(framework);
		}
	}
}

class Timer {
	constructor(speed) {
		this.speed = speed || 0.1;
		this.frame = 0;
		this.time = 0.0;
	}

	tick(dt) {
		let frame = this.frame;
		this.time += dt;
		if (this.time >= this.speed) {
			this.time = 0;
			this.frame++;
		}
		return frame;
	}

	get normalized() {
		return this.time / this.speed;
	}
}

class Game {
	/**
	 * 
	 * @param {ContentHandler} content 
	 */
	onLoad(content) {}

	/**
	 * 
	 * @param {Fw} framework 
	 */
	onStart(framework) {}
	
	/**
	 * 
	 * @param {Fw} framework 
	 * @param {number} dt 
	 */
	onUpdate(framework, dt) {}

	/**
	 * 
	 * @param {Fw} framework 
	 */
	onDraw(framework) {}
}

class Fw {

	/**
	 * 
	 * @param {number} width 
	 * @param {number} height 
	 * @param {number} pixelSize 
	 */
	constructor(width, height, pixelSize) {
		pixelSize = pixelSize || 1;

		this.canvas = document.createElement("canvas");
		this.canvas.width = width;
		this.canvas.height = height;
		this.context = this.canvas.getContext("2d");
		document.body.appendChild(this.canvas);

		this.renderer = new Renderer(this.context, width, height, pixelSize);
		this.content = new ContentHandler();
		this.entities = new EntityHandler();

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
			e.preventDefault();

			that.mouseDown[e.button] = true;
			that.mouseHold[e.button] = true;

			let rect = that.canvas.getBoundingClientRect();
			let cam = that.renderer.camera;
			that.mouse[0] = ~~((e.clientX - rect.left) / pixelSize) + cam[0];
			that.mouse[1] = ~~((e.clientY - rect.top) / pixelSize) + cam[1];
		};
		this.canvas.onmouseup = function(e) {
			e.preventDefault();

			that.mouseUp[e.button] = true;
			that.mouseHold[e.button] = false;
		};
		this.canvas.oncontextmenu = function() { return false; };
		this.canvas.focus();
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

	/**
	 * 
	 * @param {Game} adapter 
	 */
	run(adapter) {
		adapter.onLoad(this.content);

		let that = this;
		this.content.loadAll(function() {
			adapter.onStart(that);
			that._mainloop(adapter);
		});
	}

	/**
	 * 
	 * @param {Game} adapter 
	 */
	_mainloop(adapter) {
		adapter.onUpdate(this, TIME_STEP);
		this.entities.update(this, TIME_STEP);
		adapter.onDraw(this);
		for (let i = 0; i < this.mouseDown.length; i++) this.mouseDown[i] = false;
		for (let i = 0; i < this.mouseUp.length; i++) this.mouseUp[i] = false;
		window.requestAnimationFrame(this._mainloop.bind(this, adapter));
	}
}