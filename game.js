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


class Ball extends Entity {
	constructor() {
		super();
		this.z = 0;
		this.ball = null;
		this.shadow = null;
		this.force = [0, 0, 0];
		this.tag = "ball";
	}

	/**
	 * 
	 * @param {Fw} fw 
	 */
	onCreate(fw) {
		this.ball = fw.content.assets["ball0"];
		this.shadow = fw.content.assets["ball_shadow"];
	}

	/**
	 * 
	 * @param {Fw} fw 
	 */
	onDraw(fw) {
		let spos = Math.isometricToScreen(this.x, this.y, 0);
		fw.renderer.tile(this.shadow, spos[0], spos[1], 0.5, 0.5, 0, 1, 1);

		let pos = Math.isometricToScreen(this.x, this.y, this.z);
		fw.renderer.tile(this.ball, pos[0], pos[1], 0.5, 0.5, 0, 1, 1);
	}

	/**
	 * 
	 * @param {Fw} fw 
	 */
	onUpdate(fw, dt) {
		this.force[2] -= 120 * dt;
		
		this.x += this.force[0] * dt;
		this.y += this.force[1] * dt;
		this.z += this.force[2] * dt;

		this.force[0] *= 0.97;
		this.force[1] *= 0.97;

		if (this.z <= 0.0) {
			this.force[2] = 0.0;
			this.z = 0.0;
		}
	}
}

class BasePlayer extends Entity {
	constructor() {
		super();
		
		this.timer = new Timer(1.0 / 20.0);
		this.sprite = null;
		this.tag = "player";

		this.direction = 0;

		this.target = [0, 0];
		this.vector = [0, 0];
		this.state = PST_IDLE;

		this.threw = false;
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
		
		let pos = Math.isometricFromScreen(fw.mouse[0], fw.mouse[1]);
		pos[0] = ~~Math.round(pos[0] / 32.0) * 32;
		pos[1] = ~~Math.round(pos[1] / 32.0) * 32;

		let dx = this.vector[0];
		let dy = this.vector[1];

		if (fw.isMousePressed(0)) {
			this.goto(pos[0], pos[1]);
		} else if (fw.isMousePressed(2)) {
			let dx = pos[0] - this.x,
				dy = pos[1] - this.y;
			
			let angle = Math.atan2(dy, dx) + Math.PI * 2.0;
			this.direction = ~~Math.floor((angle - Math.PI / 8.0) / (Math.PI / 4.0)) % 8;

			this.state = PST_THROW;
			this.timer.frame = 0;
			this.threw = true;
		}

		switch (this.state) {
			default: break;
			case PST_THROW: {
				if (this.timer.frame % 8 === 5 && this.threw) {
					let b = new Ball();
					b.x = this.x;
					b.y = this.y;
					b.z = 32;

					let dx = pos[0] - this.x,
						dy = pos[1] - this.y,
						dz = 1.0;
					let mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
					b.force[0] = (dx / mag) * 300.0;
					b.force[1] = (dy / mag) * 300.0;
					b.force[2] = (dz / mag) * 500.0;
					fw.entities.add(b);
					this.threw = false;
				} else if (this.timer.frame % 8 >= 7) this.state = PST_IDLE;
			} break;
			case PST_RUN_TOWARDS_THROW: {
				if (this.timer.frame % 8 >= 7) this.state = PST_RUN_TOWARDS;

				this.x += this.vector[0] * 150.0 * dt;
				this.y += this.vector[1] * 150.0 * dt;

				let angle = Math.atan2(dy, dx) + Math.PI * 2.0;
				let dir = ~~Math.floor((angle - Math.PI / 8.0) / (Math.PI / 4.0)) % 8;
				this.direction = dir;

				let mag = Math.distance(this.target[0], this.target[1], this.x, this.y);
				if (mag <= 2.0) {
					this.state = PST_IDLE;
				}
			} break;
			case PST_RUN_TOWARDS: {
				this.x += this.vector[0] * 150.0 * dt;
				this.y += this.vector[1] * 150.0 * dt;

				let angle = Math.atan2(dy, dx) + Math.PI * 2.0;
				let dir = ~~Math.floor((angle - Math.PI / 8.0) / (Math.PI / 4.0)) % 8;
				this.direction = dir;

				let mag = Math.distance(this.target[0], this.target[1], this.x, this.y);
				if (mag <= 2.0) {
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
			case PST_THROW: frame = PAO_STAND_THROW + (8 * this.direction) + fr; break;
		}

		let pos = Math.isometricToScreen(this.x, this.y, 0);
		ren.tile(this.sprite, pos[0], pos[1]-30, 0.5, 0.5, frame, 33, 8);
	}

	goto(x, y) {
		this.target = [x, y];
		
		let dx = x - this.x;
		let dy = y - this.y;
		let mag = Math.sqrt(dx * dx + dy * dy);
		this.vector = [dx/mag, dy/mag];

		if (this.state === PST_THROW) {
			this.state = PST_RUN_TOWARDS_THROW;
		} else {
			this.state = PST_RUN_TOWARDS;
		}
		this.timer.frame = 0;
	}
}

class BTBGame extends Game {
	constructor() {
		super();
		this.player = new BasePlayer();
	}

	onLoad(content) {
		content.addImage("char", "character.png");
		content.addImage("blocks", "blocks.png");
		content.addImage("ball0", "ball0.png");
		content.addImage("ball_shadow", "ball_shadow.png");
	}

	onStart(fw) {
		fw.entities.add(this.player);
	}

	onUpdate(fw, dt) {
		let s = 1.0;
		if (fw.isMouseDown(0)) s = 10.0;
		t += dt * s;
	}

	onDraw(fw) {
		let content = fw.content.assets;
		let ren = fw.renderer;

		ren.camera = Math.isometricToScreen(this.player.x, this.player.y, 0);

		ren.clear();

		let mp = Math.isometricFromScreen(fw.mouse[0], fw.mouse[1]);
		mp[0] = ~~Math.round(mp[0] / 32.0) * 32.0;
		mp[1] = ~~Math.round(mp[1] / 32.0) * 32.0;
		let mps = Math.isometricToScreen(mp[0], mp[1], 0.0);

		for (let y = 0; y < 32; y++) {
			for (let x = 0; x < 32; x++) {
				let pos = Math.isometricToScreen(x * 32, y * 32, 0);

				let mag = Math.distance(x * 32, y * 32, this.player.x, this.player.y);
				let fade = 1.0 - Math.max(Math.min(mag / (5 * 32), 1.0), 0.0);
				fade = Math.smoothstep(0.0, 0.8, fade);

				let col = [fade, fade, fade];

				ren.tile(content["blocks"], pos[0], pos[1]-32, 0.5, 0.5, 3, 16, 8, col);
				ren.tile(content["blocks"], pos[0], pos[1], 0.5, 0.5, 11, 16, 8, col);
			}
		}

		ren.tile(content["blocks"], mps[0], mps[1], 0.5, 0.5, 10, 16, 8);
		ren.flush();

		fw.entities.render(fw, "player");
		fw.entities.render(fw, "ball");
		
		ren.flush("y-");
	}
}

new Fw(800, 600).run(new BTBGame());

