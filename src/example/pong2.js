/**
 * Created by darylcecile on 09/02/2017.
 */

const game = new Game();
const player = new GameEntity();
const ball = new GameEntity();
const AI = new GameEntity();

game.onUpdate(function(logic,mousePos,gameKeys,activeKeys){
    if ( player.y != mousePos.y ){
        player.y = mousePos.y;
        player.x = 20;
        player.setDimensions(10,80);
        player.dirty();
    }

    if (ball.x < game.width){
        ball.x += 1;
        ball.dirty();
    }

    if ( AI.y < ball.y ){
        AI.y += 1;
        AI.x = game.width - ( AI.width - 20);
        AI.dirty();
    }
    else if(AI.y > ball.y){
        AI.y -= 1;
        AI.x = game.width - ( 30);
        AI.dirty();
    }
});

game.onRender(function(canvasContext){
    canvasContext.fillStyle = '#6500AA';
    canvasContext.fillRect(0,0,game.width,game.height);
    console.error('CANVAS RENDERED');
});

player.onRender(function(gameboard , pos , size){
    gameboard.context.fillStyle = '#FF0000';
    gameboard.context.fillRect(pos.x,pos.y,size.width,size.height);
});

ball.onRender(function(gameboard , pos , size){
    gameboard.context.fillStyle = 'orange';
    gameboard.context.fillRect(pos.x,pos.y,30,30);
});

AI.onRender(function(gameboard , pos , size){
    gameboard.context.fillStyle = '#00FF00';
    gameboard.context.fillRect(pos.x,pos.y,size.width,size.height);
});

AI.setPositions(game.width - 30,game.height - 90);
AI.setDimensions(10,80);

// ball.ignoreGravity=true;

game.settings.smartFPS = true;
game.settings.monitor = true;

game.setFlags(['NO_ALERT']);

game.play(60);

setInterval(function(){
    let r = document.getElementById('fps');
    r.innerHTML = game.FPS+" Paints Per Second"
},1000);