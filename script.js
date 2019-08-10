

var UNIT = 32;
var CHUNK_SIZE = UNIT *8; //collision elements should be larger than one chunk!


var keyboard = {}, keyboardStamps = {}, keyboardDoubles = {};

var worldObjects = [];
var sprites = [];

var timePosition = 0;
var char;


function createNode(pos, size, src) {
	dev = document.createElement("dev");
	dev.style.position = "absolute";
	dev.style.width = size.x +"px";
	dev.style.height = size.y +"px";
	dev.style["background-image"] = 'url("' +src +'")';


	node = {
		pos: pos,
		size: size,
		dev: dev,
		
		getPosition: function() { return this.pos; },
		
		getCenter: function() {
			return {x:(this.pos.x +Math.floor(this.size.x /2)), y:(this.pos.y +Math.floor(this.size.y /2))};
		},
		
		getSize: function() { return this.size; },

		transform: function(dir) {
			this.dev.style.transform = "scaleX(" +dir +")";
		},

		move: function(x, y) {
			this.pos = {x:x, y:y};
			this.dev.style.left = this.pos.x +"px";
			this.dev.style.top = this.pos.y +"px";
		}
	};

	node.move(pos.x, pos.y);
	document.getElementById("root").appendChild(dev);
	return node;
}

function getSurroundingWorldObjects(pos) {
	var chunkX = Math.floor(pos.x /CHUNK_SIZE);
	var chunkY = Math.floor(pos.y /CHUNK_SIZE);
	var objs = [];
	for (var x=-1; x < 2; x++) {
		for (var y=-1; y < 2; y++) {
			if (worldObjects[chunkX +x] && worldObjects[chunkX +x][chunkY +y]) {
				objs = objs.concat(worldObjects[chunkX +x][chunkY +y]);
			}
		}
	}
	return objs;
}

function createWorldObject(pos, size, src) {
	obj = createNode(pos, size, src);
	var chunkX = Math.floor(pos.x /CHUNK_SIZE);
	var chunkY = Math.floor(pos.y /CHUNK_SIZE);
	if (!worldObjects[chunkX]) worldObjects[chunkX] = [];
	if (!worldObjects[chunkX][chunkY]) worldObjects[chunkX][chunkY] = [];
	worldObjects[chunkX][chunkY].push(obj);

	obj.move = function(x, y) {
		var oldChunkX = Math.floor(this.pos.x /CHUNK_SIZE);
		var oldChunkY = Math.floor(this.pos.y /CHUNK_SIZE);
		var newChunkX = Math.floor(x /CHUNK_SIZE);
		var newChunkY = Math.floor(y /CHUNK_SIZE);

		if (oldChunkX != newChunkX || oldChunkY != newChunkY) {
			if (worldObjects[oldChunkX] && worldObjects[oldChunkX][oldChunkY]) {
				var oldChunk = worldObjects[oldChunkX][oldChunkY];
				for (var i = 0; i < oldChunk.length; i++) {
					if (oldChunk[i] == obj) {
						oldChunk.splice(i, 1);
						break;
					}
				}
				if (oldChunk.length == 0) {
					worldObjects[oldChunkX].splice(oldChunkY, 1);
					if (worldObjects[oldChunkX].length == 0) worldObjects.splice(oldChunkX, 1);
				}
			}
			if (!worldObjects[newChunkX]) worldObjects[newChunkX] = [];
			if (!worldObjects[newChunkX][newChunkY]) worldObjects[newChunkX][newChunkY] = [];
			worldObjects[newChunkX][newChunkY].push(obj);
		}
		this.pos = {x:x, y:y};
		this.dev.style.left = this.pos.x +"px";
		this.dev.style.top = this.pos.y +"px";
	};

	return obj;
}

function createSprite(pos, size, src) {
	sprite = createNode(pos, size, src);

	sprite.anim = null;
	sprite.animations = {};

	sprite.setFrame = function(x, y, killAnim) {
		if (killAnim) this.anim = null;
		this.dev.style["background-position"] = (-x *this.size.x) +"px " +(-y *this.size.y) +"px";
	};

	sprite.setAnimation = function(id, settings) {
		if (!settings) settings = {};
		if (this.anim == null || settings.override) {
			var anim = this.animations[id];
			anim.startTime = timePosition;
			anim.framePosition = 0;
			anim.loop = settings.loop;
			this.anim = anim;
		}
	};

	sprite.addAnimation = function(id, sequence, ticks) {
		this.animations[id] = {
			sequence: sequence,
			ticks: ticks,
		};
	};

	sprites.push(sprite);
	return sprite;
}

function createCharacter(x, y, src, controls) {
	var chr = createSprite({x:x, y:y}, {x:UNIT /2, y:UNIT}, src);
	chr.addAnimation("walking", [{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:6, y:0}], 5);
	chr.addAnimation("running", [{x:1, y:1}, {x:2, y:1}, {x:3, y:1}, {x:4, y:1}, {x:5, y:1}, {x:6, y:1}], 3);
	chr.addAnimation("jumping", [{x:0, y:2}, {x:1, y:2}, {x:2, y:2}], 3);
	chr.controls = controls;
	chr.velY = 0;
	return chr
}


function getCollision(pos, size, obstacles) {
	var collision = [];
	for (var i=0; i < obstacles.length; i++) {
		var p = obstacles[i].getPosition(), s = obstacles[i].getSize();
		if (pos.x +size.x > p.x && pos.x < p.x +s.x &&
			pos.y +size.y > p.y && pos.y < p.y +s.y) {
			collision.push(obstacles[i]);
		}
	}
	return collision;
}


function update() {
	timePosition++;

	if (timePosition %2 == 0) {
		var walking, running, canJump;

		var pos = char.getPosition();
		if (keyboard[char.controls.left]) {
			if (keyboardDoubles[char.controls.left]) {
				pos.x -= 3;
				running = true;
			}
			pos.x -= 3;
			char.transform(-1);
			walking = true;
		}
		else if (keyboard[char.controls.right]) {
			if (keyboardDoubles[char.controls.right]) {
				pos.x += 3;
				running = true;
			}
			pos.x += 3;
			char.transform(1);
			walking = true;
		}

		var charSize = char.getSize();

		var col = getCollision(pos, charSize, getSurroundingWorldObjects(pos));
		for (var i=0; i < col.length; i++) {
			var colPosition = col[i].getPosition(), colSize = col[i].getSize();
			var charCenter = char.getCenter(), colCenter = col[i].getCenter();
			if (charCenter.x -colCenter.x > 0) {
				pos.x = colPosition.x +colSize.x;
			} else {
				pos.x = colPosition.x -charSize.x;
			}
		}

		char.velY += 1.5;
		char.velY = Math.max(Math.min(char.velY, 48), -48);
		var fall = Math.floor(char.velY);
		var step = 16;

		for (var j = 0; j <= Math.floor(Math.abs(char.velY /step)); j++) {

			if (j == 0) pos.y += Math.floor(char.velY %step);
			else if (char.velY > 0) pos.y += step;
			else pos.y -= step;

			var breakFall;

			col = getCollision(pos, charSize, getSurroundingWorldObjects(pos));
			for (var i=0; i < col.length; i++) {
				var colPosition = col[i].getPosition(), colSize = col[i].getSize();
				var charCenter = char.getCenter(), colCenter = col[i].getCenter();
				if (charCenter.y -colCenter.y > 0) {
					pos.y = colPosition.y +colSize.y;
					char.velY = 0;
					breakFall = true;
				} else {
					pos.y = colPosition.y -charSize.y;
					char.velY = 0;
					canJump = true;
					breakFall = true;
				}
			}
			if (breakFall) break;
		}

		if (canJump) {
			if (keyboard[char.controls.up]) {
				char.setAnimation("jumping", {override: true});
				char.velY = -16;
			} else if (running) char.setAnimation("running");
			else if (walking) char.setAnimation("walking");
			else char.setFrame(0, 0, true);
		}
		else if (char.velY > 0) char.setFrame(2, 2, true);

		char.move(pos.x, pos.y);
	}
}


function animate() {
	for (var i=0; i < sprites.length; i++) {
		var sprite = sprites[i];
		if (sprite.anim && (timePosition -sprite.anim.startTime) %sprite.anim.ticks == 0) {
			var pos = sprite.anim.framePosition;
			var frame = sprite.anim.sequence[pos];
			sprite.setFrame(frame.x, frame.y);
			sprite.anim.framePosition++;
			if (sprite.anim.framePosition == sprite.anim.sequence.length) {
				if (sprite.anim.loop) sprite.anim.framePosition = 0;
				else sprite.anim = null;
			}
		};
	};
}



function loop() {

	update();
	animate();

	window.requestAnimationFrame(loop);
}


function main() {

	createWorldObject({x:-UNIT *4, y:0}, {x:UNIT *12, y:UNIT}, "images/block.png");
	createWorldObject({x:-UNIT *4, y:-UNIT}, {x:UNIT, y:UNIT}, "images/block.png");
	createWorldObject({x:UNIT *3, y:-UNIT *2}, {x:UNIT, y:UNIT *2}, "images/block.png");
	createWorldObject({x:-UNIT *2, y:-UNIT *2}, {x:UNIT, y:UNIT}, "images/block.png");
	createWorldObject({x:UNIT, y:-UNIT *3}, {x:UNIT, y:UNIT}, "images/block.png");

	char = createCharacter(-UNIT /4, -UNIT, "images/char.png", {
		left: "KeyA",
		up: "KeyW",
		right: "KeyD",
		down: "KeyS"
	});


	var bull = createSprite({x:128, y:-44}, {x:64, y:44}, "images/bull.png");
	bull.addAnimation("walking", [
		{x:1, y:0}, {x:2, y:0}, {x:3, y:0},
		{x:1, y:1}, {x:2, y:1}, {x:3, y:1}
	], 5);
	bull.setAnimation("walking", {loop: true});



	document.addEventListener("keydown", function(evt) {
		if (!keyboard[evt.code] && keyboardStamps[evt.code] && timePosition -keyboardStamps[evt.code] < 15) {
			//console.log(evt.code);
			keyboardDoubles[evt.code] = true;
		}
		keyboard[evt.code] = true;
		keyboardStamps[evt.code] = timePosition;
	});
	document.addEventListener("keyup", function(evt) {
		delete keyboard[evt.code];
		delete keyboardDoubles[evt.code];
	});

	loop();
}


main();