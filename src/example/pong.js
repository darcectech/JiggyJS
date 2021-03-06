
const game = new Game();
const player = new GameEntity(); // When only one Game is initialized, gameEntity will automatically register

const ball = new GameEntity();

// When initializing multiple Games, use isRegistered to check if game is in single instance
// When in multiple instances, entities will have to be registed with the game manually

//OPTIONAL
game.onUpdate(function(logic,mousePos,gameKeys,activeKeys){
    if ( player.y != mousePos.y ){
        player.y = mousePos.y;
        player.x = 20;
        player.dirty();
    }

    if (ball.x < game.width){
        ball.x += 1;
        ball.dirty();
    }
});

//OPTIONAL
game.onRender(function(canvasContext){
    canvasContext.fillStyle = '#6500AA';
    canvasContext.fillRect(0,0,game.width,game.height);
});

// Register keyboard key combinations to a handler
game.registerKeyCombination(['SPACE'],function(mousePos){

    if (game.state == "playing"){ game.pause(); } else{ game.start(); }

});

// draw player on board
player.onRender(function(gameboard , pos , size){
    gameboard.context.fillStyle = '#FF0000';
    gameboard.context.fillRect(pos.x,pos.y,size.width,size.height);
});

ball.onRender(function(gameboard , pos, size){
    gameboard.context.fillStyle = 'orange';
    gameboard.context.fillRect(pos.x,pos.y,30,30);
});

player.ignoreGravity = true; // disable gravity effect on the entity
ball.ignoreGravity = true;

player.setDimensions(10,80);

game.setFlags(['NO_ALERT','DEBUGGING']); // add DEBUGGING to see console output from game

//game.performance.smartBalance = true; // automatically update FPS based on performance
game.performance.monitor = true;

game.start(60); //Start game with 60FPS