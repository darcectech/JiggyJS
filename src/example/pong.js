
const game = new Game();
const player = new GameEntity(); // When only one Game is initialized, gameEntity will automatically register

// When initializing multiple Games, use isRegistered to check if game is in single instance
// When in multiple instances, entities will have to be registed with the game manually

//OPTIONAL
game.onUpdate(function(logic,mousePos,gameKeys,activeKeys){

    player.setPositions(mousePos.x,mousePos.y)

});

//OPTIONAL
game.onRender(function(canvasContext){
    canvasContext.fillStyle = '#6500AA';
    canvasContext.fillRect(0,0,game.width,game.height);

    game.debug.log('DRAWING CANVAS');
});

// Register keyboard key combinations to a handler
game.registerKeyCombination(['SPACE'],function(mousePos){

    if (game.state == "playing"){
        game.pause();
    }
    else{
        game.start();
    }

});

// draw game board
player.onRender(function(gameboard , pos , size){
    gameboard.context.fillStyle = '#FF0000';
    gameboard.context.fillRect(pos.x,pos.y,size.width,size.height);
});

player.ignoreGravity = true; // disable gravity effect on the entity

game.setFlags(['NO_ALERT','DEBUGGING']); // add DEBUGGING to see console output from game

game.performance.smartBalance = true; // automatically update FPS based on performance

game.start(60);