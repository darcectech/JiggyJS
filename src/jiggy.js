/**
 * Created by darylcecile on 09/02/2017.
 */

class Game{
    constructor(parent=document.body,width='640',height='460',flags){
        // sets up the game management component
        this.parent = parent;
        this.canvas = document.createElement('canvas');
        this.internalFunctions = {};

        this.canvas.width = width;
        this.canvas.height = height;

        this.context = this.canvas.getContext('2d');
        this.state = "playing";

        let miniMe = this;
        this.internalFunctions['render'] = function(c){ c.clearRect(0,0,miniMe.canvas.width,miniMe.canvas.height) };
        this.internalFunctions['update'] = function(){  };

        this.fps = 30;

        this.renderTimer = undefined;

        this.log = [];

        this.logic = {};

        this.parent.appendChild( this.canvas );

        this.keysActive = Game.gameKeys;
        this.combinationEvents = {};

        this.mousePos = {};

        this.changesMade = false;
        this.engineBusy = false;

        this.changesDrawn = false;

        this.instance = "single";

        this.pauseTimer = undefined;

        this.entities = [];

        this.spamBufferActive = false;

        this.performance = {
            'requiredFPS':1,
            'monitor':false,
            'smartBalance':false
        };

        if (window.gameSet == undefined){
            window.gameSet = this;
        }
        else{
            this.instance = "multiple";
            window.gameSet = false;
        }

        let me = this;
        window.addEventListener("keydown", function(event) {
            event.preventDefault();
            me.keysActive[Game.normalizeKey(event.keyCode.toString())] = true;
            me.changesMade=true;
        });

        window.addEventListener("keyup", function(event) {
            me.keysActive[Game.normalizeKey(event.keyCode.toString())] = false;

            for (let i = 0 ; i < Object.keys(me.keysActive).length ; i ++ ){
                me.keysActive[ Object.keys(me.keysActive)[i] ] = false;
            }
            me.changesMade = true;
        });

        this.canvas.addEventListener("mousemove",function(event){
            me.mousePos['x'] = event.layerX;
            me.mousePos['y'] = event.layerY;
            // me.changesMade = true;
        });

        this.debug = console;

        this.setFlags(flags);

    }

    set msPerFrames(v){
        this.performance.requiredFPS = (v == -1 ? 0 : v);
        if (this.performance.monitor == true){
            this.performance['currentFPS'] = this.fps;
            this.performance['requiredMillisecondsPerFrame'] = (v == -1 ? 0 : v);
        }
        if (this.performance.smartBalance == false) return;

        if (this.fps != (v == 0 ? 1 : (v == -1 ? 60 : v) ) ){
            let repFPS = (v == 0 ? 1 : (v == -1 ? 60 : v) );
            if (v == 0){
                repFPS = 500;
            }
            else if (v == -1){
                repFPS = 60;
            }
            else{
                repFPS = 1000/v
            }
            this.debug.info('RFPS: '+(repFPS));
            this.debug.info('MSPF: '+(1000/repFPS));

            if (this.state == "playing") this.shiftFPS( repFPS );
        }
    }

    setFlags(flags){
        if (flags != undefined){
            if (flags.indexOf('NO_ALERT') != -1) window.alert = function(c){ if (window.console) console.info('[ALERT]: ' + c) };
            if (flags.indexOf('NO_CONSOLE') != -1) window.console = {
                log:function(){},
                error:function(){},
                warn:function(){},
                info:function(){}
            };
            if (flags.indexOf('DEBUGGING') == -1) this.debug = {
                log:function(){},
                error:function(){},
                warn:function(){},
                info:function(){}
            };
        }
    }

    registerEntity(ent){
        this.entities.push(ent);
    }

    unregisterEntity(ent){
        this.entities.removeItem(ent);
    }

    get width(){
        return this.canvas.width;
    }

    get height(){
        return this.canvas.height;
    }

    get isSingleInstance(){
        return (this.instance == 'single')
    }

    start(fps=this.fps){
        if (this.spamBufferActive == true) return;
        this.fps = fps;
        this.log = [];

        if (this.state == "paused") {
            clearInterval(this.pauseTimer);
            this.state = "playing";
        }

        if ( this.internalFunctions['update'] == this.internalFunctions['render'] == undefined ) {
            this.log.push('ERROR: Render or Update not defined!');
            throw 'Render or Update not defined';
        }

        if ( this.renderTimer != undefined ) this.stop();

        let me = this;


        me.spamBufferActive = true;
        setTimeout(function(){ me.spamBufferActive=false },500);

        me.state = "playing";

        this.renderTimer = setInterval(function(){
            let startTime = Date.now();
            let didRender = false;
            me.process();
            if (me.changesDrawn == false && me.state == "playing") {
                didRender = true;
                me.internalFunctions['render'](me.context);
                me.dirtyAllEntities();
                me.renderAllEntities();
                me.changesDrawn = true;
            }
            let endTime = Date.now();
            me.msPerFrames = ( didRender == true ? (endTime-startTime) : -1);
        },1000/fps)

    }
    dirtyAllEntities(){
        for (let i = 0 ; i < this.entities.length ; i ++ ){
            this.entities[i].dirty();
        }
    }
    renderAllEntities(){
        for (let i = 0 ; i < this.entities.length ; i ++ ){
            this.entities[i].render();
        }
    }
    hasDirtyEntity(){
        let res= false;
        for (let i = 0 ; i < this.entities.length ; i ++ ){
           if ( this.entities[i].isDirty || (this.entities[i].ignoreGravity == false && this.entities[i].hasHitBottom == false) ) res = true;
        }
        return res;
    }
    stop(){
        this.state = "stopped";
        clearInterval(this.renderTimer);
        this.renderTimer = undefined;
    }

    pause(){
        if (this.spamBufferActive == true) return;
        this.state = "paused";
        let me = this;
        me.spamBufferActive = true;
        setTimeout(function(){ me.spamBufferActive=false },500);
    }

    shiftFPS(fps){
        this.start(fps);
    }

    dirty(){
        this.changesDrawn=false;
    }
    onRender(fnc){

        this.internalFunctions['render'] = fnc;

    }
    onUpdate(fnc){

        this.internalFunctions['update'] = fnc;

    }
    setLogic(name,value){

        this.logic[name] = value;

    }
    getLogic(name){

        return this.logic[name];

    }
    process(){
        if (this.hasDirtyEntity()) {
            this.changesMade = true;
            this.changesDrawn=false;
        }
        let me = this;
        me.internalFunctions['update'](
            {
                get:me.getLogic,
                set:me.setLogic
            },
            {
                get x(){
                    return me.mousePos['x'];
                },
                get y(){
                    return me.mousePos['y'];
                }
            },
            function(){
                return me.keysActive
            },
            function activeKeys(){

                let keys = [];

                for (let i = 0; i < Object.keys(me.keysActive).length; i++) {
                    if (me.keysActive[Object.keys(me.keysActive)[i]] == true) {
                        keys.push(Object.keys(me.keysActive)[i])
                    }
                }

                return keys;
            }
        );


        if (this.changesMade == false || this.engineBusy == true) return;

        let kA = [];

        for (let i = 0; i < Object.keys(me.keysActive).length; i++) {
            if (me.keysActive[Object.keys(me.keysActive)[i]] == true) {
                kA.push(Object.keys(me.keysActive)[i])
            }
        }

        for (let i = 0 ; i < Object.keys(this.combinationEvents).length ; i ++){

            let dataName = Object.keys(this.combinationEvents)[i];
            let keys = dataName.split(',');
            let match = true;
            let looped = false;

            if ( keys.length == kA.length && kA.length != 0 ){

                for (let kI = 0 ; kI < keys.length ; kI++ ){
                    if ( kA.indexOf( keys[kI] ) == -1 ) match = false;
                    looped=true;
                }

            }

            if (match && looped){
                //MATCH FOUND PROCESS HERE
                this.combinationEvents[dataName]({
                    get x(){
                        return me.mousePos['x'];
                    },
                    get y(){
                        return me.mousePos['y'];
                    }
                },{
                    get:me.getLogic,
                    set:me.setLogic
                });
            }

        }

        me.changesMade=false;
        me.engineBusy=false;
    }
    registerKeyCombination(keyComb,fnc){
        let combinationIdentifier = '';
        for (let i = 0; i < keyComb.length ; i++){
            combinationIdentifier += (i==0 ? '' : ',') + keyComb[i]
        }
        this.combinationEvents[combinationIdentifier] = fnc;
    }
    deregisterKeyCombination(keyComb){
        let combinationIdentifier = '';
        for (let i = 0; i < keyComb.length ; i++){
            combinationIdentifier += (i==0 ? '' : ',') + keyComb[i]
        }
        delete this.combinationEvents[combinationIdentifier];
    }
    static get gameKeys(){
        return {
            'SHIFT':'16',
            'CONTROL':'17',
            'ALT':'18',
            'COMMAND_LEFT':'91',
            'SPACE':'32',
            'COMMAND_RIGHT':'93',
            'ENTER':'13',
            'BACKSPACE': '8',
            'DELETE':'46',
            'CAPS_LOCK':'20',
            'TAB': '9',
            'ESCAPE':'27',
            'LEFT':'37',
            'UP':'38',
            'RIGHT':'39',
            'DOWN':'40',
            'W':'87',
            'S':'83',
            'A':'65',
            'D':'68',
            'Q':'81',
            'P':'80'
        };
    }
    static normalizeKey(k){
        let keys = Game.gameKeys;
        return Object.keys(keys)[ Object.values(keys).indexOf(k) ];
    }
}


class GameEntity{
    constructor(){

        this.isDirty = false;
        this.myID = undefined;
        this.internalFunctions = {};
        this.parent = undefined;

        if (window.gameSet != undefined && window.gameSet != false){
            window.gameSet.registerEntity(this);
            this.parent = window.gameSet;
        }

        this.internalFunctions['render'] = function(){};

        this.width = 30;
        this.height = 40;
        this.realX = 0;
        this.realY = 0;

        this.ignoreGravity = true;

        this.speedY = 0;
        this.gravity = 0.05;
        this.gravitySpeed = 0;


    }
    setDimensions(width,height){
        this.width = width;
        this.height = height;
        this.isDirty = true;
    }
    setPositions(x,y){
        if (this.x != x || this.y != y) this.isDirty = true;
        this.x = x;
        this.y = y;
    }

    get x(){
        return (this.realX + (this.width/2));
    }
    set x(v){
        this.realX = v - (this.width/2);
    }
    get y(){
        return (this.realY + (this.height/2));
    }
    set y(v){
        this.realY = v - (this.height/2);
    }

    get id(){
        return ( this.myID || (function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min;
        })(1111,9999) );
    }
    render(){
        let skipParentDirty = false;
        if (this.ignoreGravity == false) {
            this.gravityMove();
            skipParentDirty = true;
        }
        if (this.isDirty) skipParentDirty = true;
        if (this.isDirty == false && skipParentDirty == false) return;
        // if this element hasnt been updated, dont render
        if (skipParentDirty){
            this.parent.changesMade = true;
            this.parent.changesDrawn=false;
        }

        let me =this;
        (function(){
            me.internalFunctions['render']( me.parent , {'x':me.realX,'y':me.realY} , {'width':me.width,'height':me.height} );
            me.parent.debug.info('rendering');
            me.parent.debug.log(me.realX + ' -> ' + me.x);
        })();

        this.isDirty = false;

    }
    get isRegistered(){
        return (this.parent != undefined);
    }
    onRender(fnc){
        this.internalFunctions['render'] = fnc;
        this.isDirty=true;
    }
    dirty(bool=true){
        this.isDirty = bool;
    }
    gravityMove(){
        if (this.ignoreGravity) return;
        this.gravitySpeed += this.gravity;
        this.y += this.speedY + this.gravitySpeed;
        this.hitBottom();

        this.isDirty = !this.hasHitBottom;
    }
    hitBottom(){
        let rockbottom = (this.parent.canvas.height - (this.height/2)) + this.parent.canvas.offsetTop;
        if (this.y > rockbottom) {
            this.y = rockbottom;
            this.gravitySpeed = 0;
        }
    }
    get hasHitBottom(){
        let rockbottom = (this.parent.canvas.height - this.height) + this.parent.canvas.offsetTop;
        return (this.y == rockbottom);
    }
}