/**
 * Created by darylcecile on 09/02/2017.
 */

class Game{
    constructor(parent=document.body,width='640',height='460',flags){
        this.status = {
            'render_Needed':false,
            'update_Needed':false
        };

        let me = this;

        this.performance = {
            'FPS':30,
            'TimePerFrame':10,
            'Frames':0,
            'previousFPS':0
        };
        this.timers = {
            'processing':undefined,
            'clock':undefined,
            'renderer':undefined,
            'busyTimer':setTimeout(function(){},500)
        };

        this.timers.renderer = setInterval(function(){
            (function(){
                this._render()
            }).call(me)
        },1000/this.performance.FPS);
        this.timers.processing = setInterval(function(){
            (function(){
                this.process()
            }).call(me)
        },100);
        this.timers.clock = setInterval(function(){
            (function(){
                this.tick()
            }).call(me);
        },1000);

        this.memory = {};
        this.instance = 'single';

        this.state = this.states.RUNNING;

        this.parent = parent;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');

        this.internalFunctions = {
            'update':function(){},
            'render':function(c){ c.clearRect(0,0,me.canvas.width,me.canvas.height) }
        };

        this.canvas.width = width;
        this.canvas.height = height;

        this.keys = {};
        this.logic = {};
        this.mousePosition = {
            x:0,
            y:0
        };

        this._spamBufferActive = false;

        this.combinationEvents = {};

        window.addEventListener("keydown", function(event) {
            event.preventDefault();
            me.keys[Game.normalizeKey(event.keyCode.toString())] = true;
            me.status.update_Needed = true;
        });

        window.addEventListener("keyup", function(event) {
            me.keysActive[Game.normalizeKey(event.keyCode.toString())] = false;

            for (let i = 0 ; i < Object.keys(me.keys).length ; i ++ ){
                me.keys[ Object.keys(me.keys)[i] ] = false;
            }
            me.status.update_Needed = true;
        });

        this.canvas.addEventListener("mousemove",function(event){
            me.mousePosition['x'] = event.layerX;
            me.mousePosition['y'] = event.layerY;
        });

        this.settings = {
            'smartFPS':false,
            'monitor':false
        };

        if (window.gameSet == undefined){
            window.gameSet = this;
        }
        else{
            this.instance = "multiple";
            window.gameSet = false;
        }

        this.entities = [];

        this.parent.appendChild( this.canvas );

        this.debug = console;

        this.setFlags(flags);
    }
    get states () {
        return {
            'STOPPED':0,
            'PAUSED':1,
            'RUNNING':2
        }
    };
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
    play(fps=this.FPS){
        if (this.state == this.states.RUNNING) this.stop();
        let me = this;
        this.timers.renderer = setInterval(function(){
            (function(){
                this._render()
            }).call(me)
        },1000/fps);
        this.timers.processing = setInterval(function(){
            (function(){
                this.process()
            }).call(me)
        },1);
        this.state = this.states.RUNNING;
    }
    pause(){
        this.stop();
        this.state = this.states.PAUSED;
    }
    stop(){
        this.state = this.states.STOPPED;
        clearInterval(this.timers.processing);
        clearInterval(this.timers.renderer);
    }
    dirty(){
        this.status.render_Needed = true;
    }
    _render(){
        if (this.hasDirtyEntity() == true) this.status.render_Needed = true;

        let startTime = performance.now();


        if (this.status.render_Needed == false) return;

            this.internalFunctions.render(this.context);

            this.dirtyAllEntities();
            this.renderAllEntities();

            this.status.render_Needed = false;
            let endTime = performance.now();
            let mx = 1000/(endTime - startTime);
            this.performance.TimePerFrame =  (mx > 500 ? (mx/12) : mx) ;
    }
    _update(){
        //TODO check if render is needed
        let me = this;
        this.internalFunctions.update({
                get:me.getLogic,
                set:me.setLogic
            },
            {
                get x(){
                    return me.mousePosition['x'];
                },
                get y(){
                    return me.mousePosition['y'];
                }
            },
            function(){
                return me.keys
            },
            function activeKeys(){

                let keys = [];

                for (let i = 0; i < Object.keys(me.keys).length; i++) {
                    if (me.keys[Object.keys(me.keys)[i]] == true) {
                        keys.push(Object.keys(me.keys)[i])
                    }
                }

                return keys;
            });
        this.status.update_Needed = false;
        //TODO check all entities to see if they need rendering
        if (this.hasDirtyEntity()) this.status.render_Needed = true;
    }
    _shiftFPS(newFPS){
        if (newFPS == 0) newFPS = 30;
        this.stop();
        this.play(newFPS);
    }
    process(){
        this.status.update_Needed = true;
        if (this.state == this.states.RUNNING){
            this.handleEvents();
            this._update();
        }

        if (this.settings.monitor == true && this.settings.smartFPS == true){
            let renderFPS;
            let tpf = this.performance.TimePerFrame;
            renderFPS = (tpf == 0 ? 30 : tpf);
            if (this.FPS != renderFPS) this.FPS = tpf;
        }
    }
    handleEvents(){


        if (this.busy) return;
        //TODO keyboard key events
        this.busy = true;

        let kA = [];
        let me = this;

        for (let i = 0; i < Object.keys(me.keys).length; i++) {
            if (me.keys[Object.keys(me.keys)[i]] == true) {
                kA.push(Object.keys(me.keys)[i])
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
                        return me.mousePosition['x'];
                    },
                    get y(){
                        return me.mousePosition['y'];
                    }
                },{
                    get:me.getLogic,
                    set:me.setLogic
                });
            }

        }

    }
    setLogic(name,value){

        this.logic[name] = value;

    }
    getLogic(name){

        return this.logic[name];

    }
    tick(){
        if (this.settings.monitor == true){
            let tpf = this.performance.TimePerFrame;
            this.debug.warn('[FPS]: '+tpf);
        }
        if (this.FPS == this.performance.previousFPS){
            this.FPS = 0;
        }
        this.performance.TimePerFrame = this.FPS;
        this.performance.previousFPS = this.FPS;
    }
    onRender(fnc){
        this.internalFunctions.render = fnc;
    }
    onUpdate(fnc){
        this.internalFunctions.update = fnc;
    }
    get busy(){
        return (this._spamBufferActive)
    }
    set busy(v){
        this._spamBufferActive = v;
        clearTimeout(this.timers.busyTimer);
        if (v == true){
            let me = this;
            this.timers.busyTimer = setTimeout(function(){
                me.busy = false;
            },500);
        }
    }

    /**
     * @return {number}
     */
    get FPS(){
        return this.performance.FPS;
    }

    /**
     * @param v {number}
     */
    set FPS(v){
        if (this.FPS == v) return;
        this.performance.FPS = v;
        this._shiftFPS(v);
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
        if (this.width != width || this.height != height) this.isDirty = true;
        this.width = width;
        this.height = height;
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
        if (this.isDirty == false) return;
        // if this element hasnt been updated, dont render

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

        this.isDirty = (this.hasHitBottom == false);
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