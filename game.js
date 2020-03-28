let t = 0.0;

const PAO_STAND = 0;
const PAO_DIE = 8;
const PAO_RUN_THROW = 72;
const PAO_STAND_THROW = 136;
const PAO_RUN = 200;

const PST_IDLE = 0;
const PST_RUN_TOWARDS = 1;
const PST_RUN_TOWARDS_THROW = 2;
const PST_THROW = 3;
const PST_DEAD = 4;

class BasePlayer extends Entity {
	constructor() {
		super();
		
		this.timer = new Timer(1.0 / 20.0);
		this.sprite = null;
		this.tag = "player";

		this.direction = 0;

		this.target = [0, 0];
		this.state = PST_IDLE;
	}

	/**
	 * 
	 * @param {Fw} fw 
	 */
	onCreate(fw) {
		this.sprite = fw.content.assets["char"];
	}

	/**
	 * 
	 * @param {Fw} fw 
	 * @param {number} dt 
	 */
	onUpdate(fw, dt) {
		this.timer.tick(dt);

		let dx = this.target[0] - this.x;
		let dy = this.target[1] - this.y;
		let mag = Math.sqrt(dx * dx + dy * dy);
		dx /= mag;
		dy /= mag;

		let angle = Math.atan2(dy, dx) + Math.PI * 2.0;
		let dir = ~~Math.floor((angle - Math.PI / 8.0) / (Math.PI / 4.0)) % 8;

		if (fw.isMousePressed(0)) {
			let pos = Math.isometricFromScreen(fw.mouse[0], fw.mouse[1]);
			this.goto(pos[0], pos[1]);
		}

		switch (this.state) {
			default: break;
			case PST_RUN_TOWARDS_THROW: {
				if (this.timer.frame % 8 >= 7) this.state = PST_RUN_TOWARDS;
				this.direction = dir;

				this.x += dx * 16.0 * dt;
				this.y += dy * 16.0 * dt;

				if (mag <= 1.0) {
					this.state = PST_IDLE;
				}
			} break;
			case PST_RUN_TOWARDS: {
				this.direction = dir;

				this.x += dx * dt;
				this.y += dy * dt;

				console.log(dx);

				if (mag <= 1.0) {
					this.state = PST_IDLE;
				}
			} break;
		}
	}

	/**
	 * 
	 * @param {Fw} fw 
	 */
	onDraw(fw) {
		let ren = fw.renderer;

		let fr = (this.timer.frame % 8);
		let frame = PAO_STAND + this.direction;
		switch (this.state) {
			default: break;
			case PST_RUN_TOWARDS_THROW: frame = PAO_RUN_THROW + (8 * this.direction) + fr; break;
			case PST_RUN_TOWARDS: frame = PAO_RUN + (8 * this.direction) + fr; break;
		}

		let pos = Math.isometricToScreen(this.x, this.y, 0);
		ren.tile(this.sprite, pos[0], pos[1], 0.5, 0.86, frame, 33, 8);
	}

	goto(x, y) {
		this.target = [x, y];
		if (this.state === PST_THROW) {
			this.state = PST_RUN_TOWARDS_THROW;
		} else {
			this.state = PST_RUN_TOWARDS;
		}
	}
}

class BTBGame extends Game {
	onLoad(content) {
		content.addImage("char", "character.png");
		content.addImage("blocks", "blocks.png");
	}

	onStart(fw) {
		fw.entities.add(new BasePlayer());
	}

	onUpdate(fw, dt) {
		let s = 1.0;
		if (fw.isMouseDown(0)) s = 10.0;
		t += dt * s;
	}

	onDraw(fw) {
		let content = fw.content.assets;
		let ren = fw.renderer;

		ren.clear();

		let mp = Math.isometricFromScreen(fw.mouse[0], fw.mouse[1]);
		mp[0] = ~~Math.round(mp[0] / 32.0) * 32.0;
		mp[1] = ~~Math.round(mp[1] / 32.0) * 32.0;
		let mps = Math.isometricToScreen(mp[0], mp[1], 0.0);

		ren.tile(content["blocks"], mps[0], mps[1], 0.5, 0.5, 10, 16, 8);
		fw.entities.render(fw, "player");
		
		ren.flush("none", false);
	}
}

new Fw(800, 600).run(new BTBGame());

