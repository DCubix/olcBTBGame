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
		this.speed = 400.0;
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
		this.x -= dt * this.speed;
	}

	onDraw(fw) {
		let ren = fw.renderer;
		let pos = spaceToScreen(this.x, this.y, 0);
		ren.tile(this.sprite, pos[0], pos[1], 0.5, 0.87, 0, 1, 1);
	}
}

class BasePlayer extends Entity {
	constructor() {
		super();
		this.vz = 0.0;
		this.z = 100;
		
		this.anim = null;
		this.tag = "player";

		this.pstate = PS_IDLE;

		this.sprite = null;
		this.hat = null;
		this.board = null;
	}

	set state(s) {
		this.pstate = s;
	}

	/**
	 * 
	 * @param {Fw} fw 
	 */
	onCreate(fw) {
		this.sprite = fw.content.assets["player"];
		this.board = fw.content.assets["board0"];

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
		this.vz -= 500.0 * dt;
		this.z += this.vz * dt;

		if (this.z >= 3) {
			this.state = PS_JUMP;
		}

		if (this.z < 3.0) {
			this.vz += 500.0 * dt;
			this.z = 0;
			if (this.pstate === PS_JUMP)
				this.state = PS_LAND;
		}

		switch (this.pstate) {
			default: break;
			case PS_IDLE: this.anim.play("stand", 0.01, true); break;
			case PS_LEFT: this.anim.play("left", 1.0 / 20.0, false); break;
			case PS_RIGHT: this.anim.play("right", 1.0 / 20.0, false); break;
			case PS_JUMP: this.anim.play("jump", 1.0 / 20.0, false); break;
			case PS_LAND: {
				this.anim.play("land", 1.0 / 30.0, false);
				if (this.anim.frame == 19) {
					this.pstate = PS_IDLE;
				}
			} break;
		}
	}

	jump() {
		this.vz += 600.0;
	}

	/**
	 * 
	 * @param {Fw} fw 
	 */
	onDraw(fw) {
		let ren = fw.renderer;

		let pos = spaceToScreen(this.x, this.y, this.z);
		let bpos = spaceToScreen(this.x + 5.0, this.y + 1, this.z + 28.0);

		let frame = this.anim.frame;

		ren.tile(this.board, pos[0], pos[1], 0.5, 0.5, frame, 1, 27);
		ren.tile(this.sprite, bpos[0], bpos[1], 0.5, 0.5, frame, 1, 27);
	}

}

class BTBGame extends Game {
	constructor() {
		super();
		this.player = new BasePlayer();
		this.bg = 0;
		this.treeTime = 0.0;

		this.speed = 600.0;
	}

	onLoad(content) {
		content.addImage("player", "player.png");
		content.addImage("board0", "board0.png");
		content.addImage("terrain", "terrain.png");
		content.addImage("tree", "tree.png");
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
		if (fw.isKeyPressed(32) && [PS_JUMP, PS_LAND].indexOf(this.player.pstate) === -1) {
			this.player.jump();
		}

		if (this.player.pstate !== PS_JUMP) {
			if (fw.isKeyDown(37)) { // LEFT
				this.player.y += dt * 250.0;
				this.player.state = PS_RIGHT;
			} else if (fw.isKeyDown(39)) { // RIGHT
				this.player.y -= dt * 250.0;
				this.player.state = PS_LEFT;
			} else {
				this.player.state = PS_IDLE;
			}
		}

		this.bg -= dt * this.speed;
		if (this.bg <= -540) this.bg = 0;

		this.treeTime += dt;
		if (this.treeTime >= 0.1) {
			this.treeTime = 0.0;

			let tree0 = new Tree();
			tree0.x = 1000.0;
			tree0.y = 540.0 + (Math.random() * 2.0 - 1.0) * 200.0;
			tree0.speed = this.speed;
			fw.entities.add(tree0);
			tree0.destroy(5.0);

			let tree1 = new Tree();
			tree1.x = 1000.0;
			tree1.y = -540.0 + (Math.random() * 2.0 - 1.0) * 200.0;
			tree1.speed = this.speed;
			fw.entities.add(tree1);
			tree1.destroy(5.0);
		}
	}

	onDraw(fw) {
		let content = fw.content.assets;
		let ren = fw.renderer;

		//ren.camera = spaceToScreen(this.player.x, this.player.y, 0);

		ren.clear(255,255,255);

		for (let i = -1; i < 2; i++) {
			let o = i * 300.0;
			let p0 = spaceToScreen(-540 + this.bg, -45 + o, 0);
			let p1 = spaceToScreen(this.bg, -45 + o, 0);
			let p2 = spaceToScreen( 540 + this.bg, -45 + o, 0);
			let p3 = spaceToScreen( 540*2 + this.bg, -45 + o, 0);
			ren.tile(content["terrain"], p0[0], p0[1], 0.5, 0.5, 0, 1, 1);
			ren.tile(content["terrain"], p1[0], p1[1], 0.5, 0.5, 0, 1, 1);
			ren.tile(content["terrain"], p2[0], p2[1], 0.5, 0.5, 0, 1, 1);
			ren.tile(content["terrain"], p3[0], p3[1], 0.5, 0.5, 0, 1, 1);
		}

		fw.entities.render(fw, "player");
		fw.entities.render(fw, "tree");
		
		ren.flush();
	}
}

new Fw(800, 600, 1.0).run(new BTBGame());

