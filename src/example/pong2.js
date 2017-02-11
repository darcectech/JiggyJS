/**
 * Created by darylcecile on 09/02/2017.
 */

const game = new Game();
const player = new GameEntity();
const ball = new GameEntity();
const AI = new GameEntity();

game.onUpdate(function(logic,mousePos,gameKeys,activeKeys){
    if ( player.y != mousePos.realY ){
        player.y = mousePos.realY;
        player.x = 20;
        player.setDimensions(10,80);
        if (mousePos.realY < (player.height/2)) player.y = (player.height/2);
        if (mousePos.realY > game.height - (player.height/2)) player.y =  game.height - (player.height/2);
        player.dirty();
    }

    if (ball.variables['moving'] == false){
        ball.variables['moving'] = true;
    }
    else{
        ball.x +=  ball.variables.vx;
        ball.y += ball.variables.vy;
    }

    if (ball.atBorder()){

        if (ball.whichBorder() == 'LEFT' || ball.whichBorder() == 'RIGHT'){
            ball.variables.vx *= -1;
            game.restart();
        }
        else{
            ball.variables.vy *= -1;
        }

    }
    else if (ball.isOffscreen()){
        game.restart();
    }
    else if (ball.hits(AI)){
        ball.variables.vx *= -1;
    }
    else if (ball.hits(player)){
        ball.variables.vx *= -1;
    }

    if (ball.x >= game.width/2){
        if ( AI.y < ball.y ){
            AI.y += 1;
            AI.x = game.width - ( AI.width * 2 );
            AI.dirty();
        }
        else if(AI.y > ball.y){
            AI.y -= 1;
            AI.x = game.width - ( AI.width  * 2 );
            AI.dirty();
        }
    }
    AI.dirty();
});

game.onRender(function(canvasContext){
    canvasContext.fillStyle = 'dimgray';
    canvasContext.fillRect(0,0,game.width,game.height);
});

player.onRender(function(graphics , pos , size){
    graphics.fillStyle = 'rgba(255,0,0,.5)';
    graphics.fillRect(pos.x,pos.y,size.width,size.height);

    graphics.beginPath();
    graphics.strokeStyle = 'white';
    graphics.lineWidth = 1;
    graphics.rect(pos.x,pos.y,size.width,size.height);
    graphics.stroke();
});

ball.onRender(function(graphics , pos , size){
    graphics.fillStyle = 'rgba(255,255,255,1)';
    graphics.fillRect(pos.x,pos.y,size.width,size.height);

    graphics.beginPath();
    graphics.strokeStyle = 'white';
    graphics.lineWidth = 1;
    graphics.rect(pos.x,pos.y,size.width,size.height);
    graphics.stroke();
});

AI.onRender(function(graphics , pos , size){
    graphics.fillStyle = 'rgba(0,255,0,.5)';
    graphics.fillRect(pos.x,pos.y,size.width,size.height);

    graphics.beginPath();
    graphics.strokeStyle = 'white';
    graphics.lineWidth = 1;
    graphics.rect(pos.x,pos.y,size.width,size.height);
    graphics.stroke();
});

game.registerKeyCombination(['SPACEBAR'],function(){
    game.togglePause();
});

game.setup(function(){
    ball.setDimensions(5,5);
    ball.setPositions(game.width/2,game.height/2);
});

ball.variables['vx'] = 1.2;
ball.variables['vy'] = 1.2;
ball.variables['moving'] = false;

game.settings.monitor = true;

game.setFlags(['NO_ALERT']);

AI.setPositions(game.width - 30,game.height - 90);
AI.setDimensions(10,80);

game.play(30);
