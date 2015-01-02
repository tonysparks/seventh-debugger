var ws = null;
var paused = false;

function connect()
{
  if ("WebSocket" in window)
  {             
	 paused=false;
	 // Let us open a web socket
	 ws = new WebSocket("ws://localhost:8088/seventh/server");
	 ws.onopen = function() {             
	 };
	 ws.onmessage = function (event)  { 
		if (! paused ) {			
			//console.log(event.data);
			refreshUI(event.data);
		}
	 };
	 ws.onclose = function() { 
	 };
  }
  else
  {
	 // The browser doesn't support WebSocket
	 alert("WebSocket NOT supported by your Browser!");
  }
}

function disconnect() {
	if ( ws != null ) {
		ws.close();
	}
}

function togglePause() {
	paused = !paused; 
	if( paused ) {
		$(pauseBtnId).html( 'Resume' );
	}
	else {
		$(pauseBtnId).html( 'Pause' );
	}
}


var KEY = {
	UP: 38,
	DOWN: 40,
	LEFT: 37,
	RIGHT: 39
}
var BUTTONS = {
    LEFT: 0,
	MIDDLE: 1,
	RIGHT: 2
}


var camera ={
	x: 0,
	y: 0
}
var mouse = {
	x: 0,
	y: 0,
	pressedBtns: []
}

camera.pressedKeys = [];
var selectedEntity = null;
var gameState = null;

window.onkeydown = function(e) {
	camera.pressedKeys[e.keyCode] = true;
}

window.onkeyup = function(e) {
	camera.pressedKeys[e.keyCode] = false;
}

function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
	  x: evt.clientX - rect.left,
	  y: evt.clientY - rect.top
	};
}
var canvas = document.getElementById('myCanvas');
var context = canvas.getContext('2d');

/*
canvas.addEventListener('mousemove', function(evt) {
	var pos = getMousePos(canvas, evt);
	mousePos.x = pos.x;
	mousePos.y = pos.y;
}, false);*/

canvas.addEventListener('mouseup', function(evt) {
	var pos = getMousePos(canvas, evt);
	mouse.x = pos.x;
	mouse.y = pos.y;
	mouse.pressedBtns[evt.button] = false;
	
	if(gameState != null) {
		checkIfPlayerSelected(gameState, mouse);
	}
	
}, false);

canvas.addEventListener('mousedown', function(evt) {
	var pos = getMousePos(canvas, evt);
	mouse.x = pos.x;
	mouse.y = pos.y;
	mouse.pressedBtns[evt.button] = true;
}, false);

function checkIfPlayerSelected(gameState, mouse) {
	var game_type = gameState.game_type;
	for(var t = 0; t < game_type.teams.length; t++) {
		var team = game_type.teams[t];
		for(var p = 0; p < team.players.length; p++) {
			var player = team.players[p];
			
			if(player.isAlive) {
				var entity = gameState.entities[player.entity_id];
				if(entity!=null) {
				
					var pos = {
						x: mouse.x - camera.x,
						y: mouse.y - camera.y
					}
					if( rectCollides(entity.bounds, pos) ) {
					    onSelectedEntity(entity);
						return;
					}
				}
			}
		}
	}	
}

function onSelectedEntity(entity) {
	selectedEntity = entity.id;	
	updateSelectedEntity(entity);
	/*if( entity != null) {
		$('code').html( JSON.stringify(selectedEntity) );
	}*/
}

function updateSelectedEntity(entity) {
//TEMP to always follow bot
selectedEntity = 0;

	if(selectedEntity != null) {
		if(selectedEntity == entity.id) {
		
			if( entity != null) {
				$('#id').html( entity.id );
				$('#state').html( entity.state );
				$('#pos').html( JSON.stringify(entity.pos) );
				$('#facing').html( JSON.stringify(entity.facing) );
				$('#health').html( entity.health );
				$('#orientation').html( entity.orientation );
				
				camera.x = entity.pos.x - camera.width/2;
				camera.y = entity.pos.y - camera.height/2;
			}
		}
	}
}

function rectCollides(a, b) {
    var w = a.width;
	var h = a.height;
	if ((w | h) < 0) {
		// At least one of the dimensions is negative...
		return false;
	}
	// Note: if either dimension is zero, tests below must return false...
	var x = a.x;
	var y = a.y;
	if (b.x < x || b.y < y) {
		return false;
	}
	w += x;
	h += y;
	//    overflow || intersect
	return ((w < x || w > b.x) && (h < y || h > b.y));
}

function moveCamera(camera) {
	var xVel = 10;
	var yVel = 10;
	
	if(camera.pressedKeys[KEY.UP]) {
		camera.y -= yVel;
	}
	else if(camera.pressedKeys[KEY.DOWN]) {
		camera.y += yVel;
	}
	
	
	if(camera.pressedKeys[KEY.LEFT]) {
		camera.x -= xVel;
	}
	else if(camera.pressedKeys[KEY.RIGHT]) {
		camera.x += xVel;
	}
}


function refreshUI(gs) {
	var c = document.getElementById("myCanvas");
	c.focus();
	
	var ctx = c.getContext("2d");
	
	/* clear out the screen */
	ctx.clearRect(0,0, c.width, c.height);
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0,0, c.width, c.height);
	
	//ctx.fillRect(0,0,150,75);
	ctx.font = "12px Arial";
	//ctx.fillText(gameState, 10, 20);    

	camera.width = c.width;
	camera.height = c.height;
	
	moveCamera(camera);
	
	
	//console.log(gameState);
	//document.getElementById("json").innerHTML = gameState;	
	gameState = JSON.parse(gs);	
	
	
	//ctx.scale(0.5, 0.5)
	
	updateAI(gameState.ai)
	
	/* draw the map */
	drawMap(ctx, gameState.map, camera.x, camera.y, camera.width, camera.height)
	
	var entities = gameState.entities;
	drawEntities(ctx, camera, entities);
	drawPlayers(ctx, camera, gameState.game_type, entities);
	
	
	//ctx.scale(2, 2)
}

function drawEntities(context, camera, entities) {
	for(var i = 0; i < entities.length; ++i) {
		var ent = entities[i]
		if(ent!= null) {
			drawEntity( context, camera, ent )
		}
	}
}

function drawPlayers(context, camera, game_type, entities) {
	for(var t = 0; t < game_type.teams.length; t++) {
		var team = game_type.teams[t];
		for(var p = 0; p < team.players.length; p++) {
			drawPlayer(context, camera, team, entities, team.players[p]);			
		}
	}
}

function drawMap(context, map, cx, cy, vw, vh) {

	var tileWidth = map.tileWidth;
	var tileHeight = map.tileHeight;
	var tiles = map.tiles;
	var maxX = map.maxX;
	var maxY = map.maxY;


	var vx = 0;
	var vy = 0;
	
	// screen pixel x,y coordinate to draw the current tile to
	var pixelX = 0;
	var pixelY = 0;

	var indexX = 0;
	var indexY = 0;
	
	var toIndex_x=0, toIndex_y=0;
	
	// Current Tile offset (to pixels)
	var tileOffset_x =  -( cx % tileWidth );
	toIndex_x    = ( tileOffset_x + cx) / tileWidth;

	// current tile y offset (to pixels)
	var tileOffset_y =  -( cy % tileHeight);
	toIndex_y    = (tileOffset_y + cy) / tileHeight;
			
	indexY = toIndex_y;
	for (pixelY = tileOffset_y;
		 pixelY < vh && indexY < maxY; 		     
		 pixelY += tileHeight, indexY++) {
		
		for (pixelX = tileOffset_x, indexX = toIndex_x; 
			 pixelX < vw && indexX < maxX; 
			 pixelX += tileWidth, indexX++) {
			
			if ( (indexY >= 0 && indexX >= 0) && (indexY < maxY && indexX < maxX) ) {
			
				if (tiles[indexY][indexX] == 'X') {
					drawTile(context, pixelX + vx, pixelY + vy, tileWidth, tileHeight)
				}				
			}
		}
	}

	
}

function drawTile(context, x, y, tileWidth, tileHeight) {			
	context.beginPath();
	context.fillRect(x, y, tileWidth, tileHeight);
	context.fillStyle = 'black';
	context.fill();
	context.lineWidth = 7;
	context.strokeStyle = 'black';
	context.stroke();
	
}

function getColorForEntityType(type) {
	if(type=="PLAYER") {
	}
	else if(type=="DROPPED_ITEM") {
		return 0x3f4a4f8f;
	}
	else if(type=="BULLET") {
		return 'brown';
	}
	else if(type=="BULLET") {
		return 'brown';
	}
	else if(type=="GRENADE") {
		return 0xff4a4f8f;
	}
	
}

function getTeamColor(team) {
	// allied
	if(team.id == 2) {
		return '#8888ff';
	}
	// axis
	else if(team.id == 4) {
		return '#ff8888';
	}
	//spectator
	return '#443366';
}

function drawPlayer(context, camera, team, entities, player) {
	if (player.isAlive) {
		entity = entities[ player.entity_id ];
		context.beginPath();
		var pos = entity.pos;
		var bounds = entity.bounds
		context.arc(pos.x - camera.x, pos.y - camera.y, bounds.width/2, 0, 2 * Math.PI, false);
		context.fillStyle = getTeamColor(team);
		context.fill();
		context.lineWidth = 1;
		context.strokeStyle = '#663300';
		context.stroke();
		
		context.font = '12pt Courier New';
		var metrics = context.measureText(player.name);
		context.fillText( player.name, pos.x - camera.x - metrics.width/2, pos.y - camera.y + 30);
		
		var text = "(" + entity.state + ")"
		metrics = context.measureText(text);
		context.fillText( text, pos.x - camera.x - metrics.width/2, pos.y - camera.y + 50);
		
		context.translate(pos.x - camera.x, pos.y - camera.y);
		context.rotate( (entity.orientation - Math.PI/2) );
		context.beginPath();
		context.moveTo(0,0);
		context.lineTo(0,25);
		context.stroke();
		context.rotate( -(entity.orientation - Math.PI/2) );
		context.translate(-pos.x + camera.x, -pos.y + camera.y);
	}		
}

function drawEntity(context, camera, entity) {
//	console.log(entity)

	updateSelectedEntity(entity);
	if( entity.type != 'PLAYER' && entity.type != 'LIGHT_BULB' ) {
		if (entity.isAlive) {
			context.beginPath();
			var pos = entity.pos;
			var bounds = entity.bounds
			context.arc(pos.x - camera.x, pos.y - camera.y, bounds.width/2, 0, 2 * Math.PI, false);
			context.fillStyle = getColorForEntityType(entity.type);
			context.fill();
			context.lineWidth = 5;
			context.strokeStyle = '#003300';
			context.stroke();
		}
	}
}

function updateAI(ai) {
	$('#brainsPanelId').scope().updateAI(ai);
}
