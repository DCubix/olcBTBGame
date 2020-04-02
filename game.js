const GM_MAT = Math.matrixMult(Math.scalingMatrix(1.0, 0.65), Math.rotationMatrix(Math.PI / 4));
const GM_MAT_1 = Math.matrixInverse(GM_MAT);

const PS_IDLE = 0;
const PS_LEFT = 1;
const PS_RIGHT = 2;
const PS_JUMP = 3;
const PS_LAND = 4;

function spaceToScreen(x, y, z) {
	return [
		GM_MAT[0] * x + GM_MAT[1] * y,
		(GM_MAT[2] * x + GM_MAT[3] * y) - z
	];
}

function screenToSpace(x, y) {
	return [
		GM_MAT_1[0] * x + GM_MAT_1[1] * y,
		GM_MAT_1[2] * x + GM_MAT_1[3] * y
	];
}

class Tree extends Entity {
	constructor() {
		super();
		this.sprite = null;
		this.tag = "tree";
	}

	/**
	 * 
	 * @param {Fw} fw 
	 */
	onCreate(fw) {
		this.sprite = fw.content.assets["tree"];
	}

	onUpdate(fw, dt) {
		
	}

	onDraw(fw) {
		let ren = fw.renderer;
		let pos = spaceToScreen(this.x, this.y, 0);
		ren.tile(this.sprite, pos[0], pos[1], 0.5, 0.87, 0, 1, 1);
	}
}

class Ramp extends Entity {
	constructor() {
		super();
		this.sprite = null;
		this.tag = "ramp";
	}

	onCreate(fw) {
		this.sprite = fw.content.assets["ramp"];
	}

	onUpdate(fw, dt) {
		
	}

	onDraw(fw) {
		let ren = fw.renderer;
		let pos = spaceToScreen(this.x, this.y, 0);
		ren.tile(this.sprite, pos[0], pos[1], 0.5, 0.55, 0, 1, 1);

		let rectCoords = [
			[ this.x - 70, this.y - 28],
			[ this.x + 70, this.y - 28],
			[ this.x + 70, this.y + 28],
			[ this.x - 70, this.y + 28]
		];
		let rectCoordsT = rectCoords.map(function(c) { return spaceToScreen(c[0], c[1], 0); });
		ren.lines(rectCoordsT, [1.0, 0.0, 1.0, 1.0]);
	}
}

class BasePlayer extends Entity {
	constructor() {
		super();
		this.vx = 0.0;
		this.vz = 0.0;
		this.z = 100;

		this.speed = 400.0;
		
		this.anim = null;
		this.tag = "player";

		this.state = PS_IDLE;

		this.sprite = null;
		this.hat = null;
		this.board = null;
		this.boardShadow = null;
	}

	/**
	 * 
	 * @param {Fw} fw 
	 */
	onCreate(fw) {
		this.sprite = fw.content.assets["player"];
		this.board = fw.content.assets["board0"];
		this.boardShadow = fw.content.assets["board_shadow"];

		this.anim = fw.createAnimator();
		this.anim.add("stand", [0]);
		this.anim.add("left", [1, 2, 3, 4]);
		this.anim.add("right", [6, 7, 8, 9]);
		this.anim.add("jump", [10, 11, 12, 13, 14]);
		this.anim.add("land", [15, 16, 17, 18, 19]);
		this.anim.add("die", [20, 21, 22, 23, 24, 25, 26]);
	}

	/**
	 * 
	 * @param {Fw} fw 
	 * @param {number} dt 
	 */
	onUpdate(fw, dt) {
		if (fw.isKeyPressed(32) && [PS_JUMP, PS_LAND].indexOf(this.state) === -1) {
			this.jump();
		}

		if (this.state !== PS_JUMP) {
			if (fw.isKeyDown(37)) { // LEFT
				this.y += dt * 250.0;
				this.state = PS_RIGHT;
			} else if (fw.isKeyDown(39)) { // RIGHT
				this.y -= dt * 250.0;
				this.state = PS_LEFT;
			} else {
				this.state = PS_IDLE;
			}
		}

		this.vx += this.speed * dt;
		this.x += this.vx * dt;

		this.vz -= 350.0 * dt;
		this.z += this.vz * dt;

		this.vx *= 0.99;
		this.vz *= 0.99;

		if (this.z >= 3) {
			this.state = PS_JUMP;
		}

		if (this.z < 3.0) {
			this.vz += 400.0 * dt;
			this.z = 0;
			if (this.state === PS_JUMP)
				this.state = PS_LAND;
		}

		let that = this;
		fw.entities.each("ramp", function(e) {
			let col = Math.collides([that.x - 24, that.y - 8, 48, 16], [e.x - 70, e.y - 32, 140, 64]);
			if (col === "left" && that.z < 32.0) {
				//let t = (that.x - (e.x - 22.5)) / 68.0;
				that.z += 200.0 * dt;
				that.vz += 900.0 * dt;
			}
		});

		switch (this.state) {
			default: break;
			case PS_IDLE: this.anim.play("stand", 0.01, true); break;
			case PS_LEFT: this.anim.play("left", 1.0 / 20.0, false); break;
			case PS_RIGHT: this.anim.play("right", 1.0 / 20.0, false); break;
			case PS_JUMP: this.anim.play("jump", 1.0 / 20.0, false); break;
			case PS_LAND: {
				this.anim.play("land", 1.0 / 30.0, false);
				if (this.anim.frame == 19) {
					this.state = PS_IDLE;
				}
			} break;
		}
	}

	jump(v) {
		v = v || 500.0;
		this.vz += v;
	}

	/**
	 * 
	 * @param {Fw} fw 
	 */
	onDraw(fw) {
		let ren = fw.renderer;

		let pos = spaceToScreen(this.x, this.y, this.z);
		let bpos = spaceToScreen(this.x + 5.0, this.y + 1, this.z + 28.0);
		let spos = spaceToScreen(this.x + 5.0, this.y + 1, 0.0);

		let frame = this.anim.frame;

		ren.tile(this.boardShadow, spos[0], spos[1], 0.5, 0.5, frame, 1, 27);
		ren.tile(this.board, pos[0], pos[1], 0.5, 0.5, frame, 1, 27);
		ren.tile(this.sprite, bpos[0], bpos[1], 0.5, 0.5, frame, 1, 27);

		// let rectCoords = [
		// 	[ this.x - 24, this.y - 8],
		// 	[ this.x + 24, this.y - 8],
		// 	[ this.x + 24, this.y + 8],
		// 	[ this.x - 24, this.y + 8]
		// ];
		// let rectCoordsT = rectCoords.map(function(c) { return spaceToScreen(c[0], c[1], 0); });
		// ren.lines(rectCoordsT, [1.0, 0.0, 0.0, 1.0]);
		
	}

}

class BTBGame extends Game {
	constructor() {
		super();
		this.player = new BasePlayer();
		this.treeTime = 0.0;

		this.rampTime = 0.0;

		this.bgOffset = 0;

		this.speed = 600.0;
	}

	onLoad(content) {
		content.addImage("player", "player.png");
		content.addImage("board0", "board0.png");
		content.addImage("board_shadow", "board_shadow.png");
		content.addImage("terrain", "terrain.png");
		content.addImage("tree", "tree.png");
		content.addImage("ramp", "ramp.png");
	}

	onStart(fw) {
		fw.entities.add(this.player);
	}

	/**
	 * 
	 * @param {Fw} fw 
	 * @param {number} dt 
	 */
	onUpdate(fw, dt) {
		this.treeTime += dt;
		this.rampTime += dt;

		if (this.rampTime >= 0.7) {
			this.rampTime = 0;
			let ramp = new Ramp();
			ramp.x = 1000.0 + this.player.x;
			ramp.y = (Math.random() * 2.0 - 1.0) * 200.0;
			fw.entities.add(ramp);
			ramp.destroy(5.0);
		}

		if (this.treeTime >= 0.1) {
			this.treeTime = 0.0;

			let tree0 = new Tree();
			tree0.x = 1000.0 + this.player.x;
			tree0.y = 540.0 + (Math.random() * 2.0 - 1.0) * 200.0;
			tree0.speed = this.speed;
			fw.entities.add(tree0);
			tree0.destroy(5.0);

			let tree1 = new Tree();
			tree1.x = 1000.0 + this.player.x;
			tree1.y = -540.0 + (Math.random() * 2.0 - 1.0) * 200.0;
			tree1.speed = this.speed;
			fw.entities.add(tree1);
			tree1.destroy(5.0);
		}
	}

	onDraw(fw) {
		let content = fw.content.assets;
		let ren = fw.renderer;

		ren.camera = spaceToScreen(this.player.x, 0, 0);
		let cam = ren.camera;

		ren.clear(0, 0, 0);

		for (let y = -1024; y < 99999.0; y += 512) {
			for (let x = -1024; x < 99999.0; x += 512) {
				ren.tile(content["terrain"], x, y, 0, 0, 0, 1, 1);
			}
		}

		fw.entities.render(fw, "ramp");
		fw.entities.render(fw, "player");
		fw.entities.render(fw, "tree");
		
		ren.flush();
	}
}

new Fw(800, 600, 1.0).run(new BTBGame());

