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
            'Frames':0,
            'ms':0,
            'startingFPS':60,
            'blockerIncrement':0
        };
        this.timers = {
            'processing':undefined,
            'clock':undefined,
            'renderer':undefined,
            'busyTimer':setTimeout(function(){},500)
        };

        this.timers.renderer = setInterval(function(){
            (function(){
                this.forceRender()
            }).call(me)
        },1000/this.performance.startingFPS);
        this.timers.processing = setInterval(function(){
            (function(){
                this.process()
            }).call(me)
        },1);
        this.timers.clock = setInterval(function(){
            (function(){
                this.tick()
            }).call(me);
        },1000);

        this.memory = {};
        this.instance = 'single';

        this.state = Game.states.RUNNING;

        this.parent = parent;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');

        this.internalFunctions = {
            'update':function(){},
            'render':function(c){ c.clearRect(0,0,me.canvas.width,me.canvas.height) },
            'setup':function(){}
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
            me.keys[Game.keyCodes[event.keyCode]] = true;
            me.status.update_Needed = true;
            event.preventDefault();
        });

        window.addEventListener("keyup", function(event) {
            me.keys[Game.keyCodes[event.keyCode]] = false;

            for (let i = 0 ; i < Object.keys(me.keys).length ; i ++ ){
                me.keys[ Object.keys(me.keys)[i] ] = false;
            }
            setTimeout(function(){me.status.update_Needed = true;},200);
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
    static get states () {
        return {
            'STOPPED':0,
            'PAUSED':1,
            'RUNNING':2
        }
    };
    setup(fnc=this.internalFunctions.setup){
        fnc();
        this.internalFunctions.setup = fnc;
        return this;
    }
    restart(){
        this.stop();
        this.setup();
        this.play();
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
    play(fps=this.performance.startingFPS){
        console.log('Started game with '+fps+' FPS');
        if (this.state == Game.states.RUNNING) this.stop();
        let me = this;
        this.timers.renderer = setInterval(function(){
            (function(){
                this.forceRender()
            }).call(me)
        },1000/fps);
        this.performance.startingFPS = fps;
        this.state = Game.states.RUNNING;
        return this;
    }
    pause(){
        this.stop();
        this.state = Game.states.PAUSED;
        return this;
    }
    stop(){
        this.state = Game.states.STOPPED;
        // clearInterval(this.timers.processing);
        clearInterval(this.timers.renderer);
        return this;
    }
    dirty(){
        this.status.render_Needed = true;
        return this;
    }
    forceRender(){
        if (this.hasDirtyEntity() == true) this.status.render_Needed = true;

        if (this.status.render_Needed == false || this.state == Game.states.PAUSED || this.state == Game.states.STOPPED) return;

        this.internalFunctions.render(this.context);

        this.dirtyAllEntities();
        this.renderAllEntities();

        this.status.render_Needed = false;
        this.performance.Frames += 1;
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
                    return me.mousePosition['x'] - me.x;
                },
                get y(){
                    return me.mousePosition['y'] - me.y;
                },
                get realX(){
                    return me.mousePosition['x'];
                },
                get realY(){
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
    process(){
        this.handleEvents();
        if (this.state == Game.states.RUNNING){
            this._update();
        }
    }
    handleEvents(){

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

        me.keys = {};

    }
    setLogic(name,value){

        this.logic[name] = value;

    }
    getLogic(name){

        return this.logic[name];

    }
    block(ms){
        let me = this;
        this.pause();
        setTimeout(function(){
            me.play();
        },ms);
    }
    tick(){
        this.FPS = this.performance.Frames;
        this.performance.Frames = 0;
    }
    onRender(fnc){
        this.internalFunctions.render = fnc;
        return this;
    }
    onUpdate(fnc){
        this.internalFunctions.update = fnc;
        return this;
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
            },100);
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
    }
    registerEntity(ent){
        this.entities.push(ent);
        return this;
    }

    unregisterEntity(ent){
        this.entities.removeItem(ent);
        return this;
    }

    get width(){
        return this.canvas.width;
    }

    get height(){
        return this.canvas.height;
    }

    get x(){
        return this.canvas.clientLeft + this.canvas.offsetLeft;
    }

    get y(){
        return this.canvas.clientTop + this.canvas.offsetTop;
    }

    get isSingleInstance(){
        return (this.instance == 'single')
    }
    dirtyAllEntities(){
        for (let i = 0 ; i < this.entities.length ; i ++ ){
            this.entities[i].dirty();
        }
        return this;
    }
    renderAllEntities(){
        for (let i = 0 ; i < this.entities.length ; i ++ ){
            this.entities[i].render();
        }
        return this;
    }
    hasDirtyEntity(){
        let res= false;
        for (let i = 0 ; i < this.entities.length ; i ++ ){
            if ( this.entities[i].isDirty || (this.entities[i].ignoreGravity == false && this.entities[i].hasHitBottom == false) ) res = true;
        }
        return res;
    }

    static get keyCodes(){
        return {
            3 :  ["BREAK"],
            8 :  ["BACKSPACE", "DELETE"],
            9 :  ["TAB"],
            12 : ["CLEAR"],
            13 : ["ENTER"],
            16 : ["SHIFT"],
            17 : ["CONTROL"],
            18 : ["ALT"],
            19 : ["PAUSE","BREAK"],
            20 : ["CAPS_LOCK"],
            27 : ["ESCAPE"],
            32 : ["SPACEBAR"],
            33 : ["PAGE_UP"],
            34 : ["PAGE_DOWN"],
            35 : ["END"],
            36 : ["HOME"],
            37 : ["LEFT"],
            38 : ["UP"],
            39 : ["RIGHT"],
            40 : ["DOWN"],
            41 : ["SELECT"],
            42 : ["PRINT"],
            43 : ["EXECUTE"],
            44 : ["PRINT_SCREEN"],
            45 : ["INSERT"],
            46 : ["DELETE"],
            48 : ["0"],
            49 : ["1"],
            50 : ["2"],
            51 : ["3"],
            52 : ["4"],
            53 : ["5"],
            54 : ["6"],
            55 : ["7"],
            56 : ["8"],
            57 : ["9"],
            58 : ["COLON"],
            59 : ['EQUALS'],
            60 : ["LESS_THAN"],
            61 : ["EQUALS"],
            63 : ["ß"],
            64 : ["@"],
            65 : ["a"],
            66 : ["b"],
            67 : ["c"],
            68 : ["d"],
            69 : ["e"],
            70 : ["f"],
            71 : ["g"],
            72 : ["h"],
            73 : ["i"],
            74 : ["j"],
            75 : ["k"],
            76 : ["l"],
            77 : ["m"],
            78 : ["n"],
            79 : ["o"],
            80 : ["p"],
            81 : ["q"],
            82 : ["r"],
            83 : ["s"],
            84 : ["t"],
            85 : ["u"],
            86 : ["v"],
            87 : ["w"],
            88 : ["x"],
            89 : ["y"],
            90 : ["z"],
            91 : ["WINDOWS","LEFT_COMMAND","SEARCH"],
            92 : ["RIGHT","RIGHT_WINDOWS"],
            93 : ["WINOWS_MENU","RIGHT_COMMAND"],
            96 : ["NUMPAD_0"],
            97 : ["NUMPAD_1"],
            98 : ["NUMPAD_2"],
            99 : ["NUMPAD_3"],
            100 :["NUMPAD_4"],
            101 :["NUMPAD_5"],
            102 :["NUMPAD_6"],
            103 :["NUMPAD_7"],
            104 :["NUMPAD_8"],
            105 :["NUMPAD_9"],
            106 :["MULTIPLY"],
            107 :[ "ADD"],
            108 :[ "NUMPAD_PERIOD"],
            109 :[ "SUBTRACT"],
            110 :[ "DOT"],
            111 :[ "DIVIDE"],
            112 :[ "F1"],
            113 :[ "F2"],
            114 :[ "F3"],
            115 :[ "F4"],
            116 :[ "F5"],
            117 :[ "F6"],
            118 :[ "F7"],
            119 :[ "F8"],
            120 :[ "F9"],
            121 :[ "F10"],
            122 :[ "F11"],
            123 :[ "F12"],
            124 :[ "F13"],
            125 :[ "F14"],
            126 :[ "F15"],
            127 :[ "F16"],
            128 :[ "F17"],
            129 :[ "F18"],
            130 :[ "F19"],
            131 :[ "F20"],
            132 :[ "F21"],
            133 :[ "F22"],
            134 :[ "F23"],
            135 :[ "F24"],
            144 :[ "NUMBER_LOCK"],
            145 :[ "SCROLL_LOCK"],
            160 :[ "^"],
            161: ['!'],
            163 :[ "#"],
            164: ['$'],
            165: ['ù'],
            166 :[ "PAGE_BACKWARDS"],
            167 :[ "PAGE_FORWARDS"],
            170: ['*'],
            171 :[ "~","*"],
            173 :[ "MUTE"],
            174 :[ "DECREASE_VOLUME"],
            175 :[ "INCREASE_VOLUME"],
            176 :[ "NEXT"],
            177 :[ "PREVIOUS"],
            178 :[ "STOP"],
            179 :[ "PLAY"],
            180 :[ "EMAIL"],
            181 :[ "MUTE"],
            182 :[ "DECREASE_VOLUME"],
            183 :[ "INCREASE_VOLUME"],
            186 :[ "SEMICOLOON"],
            187 :[ "EQUAL"],
            188 :[ "COMMA"],
            189 :[ "DASH"],
            190 :[ "PERIOD"],
            191 :[ "FORWARD_SLASH"],
            193 :[ "?"],
            194 :[ "NUMPAD_PERIOD"],
            219 :[ "OPEN_BRACKET"],
            220 :[ "BACK_SLASH"],
            221 :[ "CLOSE_BRACKET"],
            222 :[ "SINGLE_QUOTE"],
            223 :[ "`"],
            224 :[ "COMMAND"]
        };
    }
    registerKeyCombination(keyComb,fnc){
        let combinationIdentifier = '';
        for (let i = 0; i < keyComb.length ; i++){
            combinationIdentifier += (i==0 ? '' : ',') + keyComb[i]
        }
        this.combinationEvents[combinationIdentifier] = fnc;
        return this;
    }
    deregisterKeyCombination(keyComb){
        let combinationIdentifier = '';
        for (let i = 0; i < keyComb.length ; i++){
            combinationIdentifier += (i==0 ? '' : ',') + keyComb[i]
        }
        delete this.combinationEvents[combinationIdentifier];
        return this;
    }
    togglePause(){
        if (this.state == Game.states.PAUSED){
            this.play();
        }
        else{
            this.pause();
        }
        return this;
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

        this.variables = {};
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
        return ((this.realX ) + (this.width/2)) ;
    }
    set x(v){
        this.realX = (v  - (this.width/2) );
    }
    get y(){
        return ((this.realY ) + (this.height/2));
    }
    set y(v){
        this.realY =  ( v - (this.height/2) );
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
            me.internalFunctions['render']( me.parent.context , {'x':me.realX,'y':me.realY} , {'width':me.width,'height':me.height} );
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
        let rockbottom = (this.parent.canvas.height - (this.height/2));
        if (this.y > rockbottom) {
            this.y = rockbottom;
            this.gravitySpeed = 0;
        }
    }
    get hasHitBottom(){
        let rockbottom = (this.parent.canvas.height - this.height);
        return (this.y == rockbottom);
    }

    isOffscreen(){
        return (this.realX < 0 || this.realX > this.parent.width || this.realY < 0 || this.realY > this.parent.height);
    }

    atBorder(){
        if (this.realX == 0 || this.realX == this.parent.width - this.width || this.realY == 0 || this.realY == this.parent.height - this.height){
            return true;
        }
        else{
            if (this.realX < 0 && this.realX + this.width > 0){
                return true;
            }
            else if (this.realX < this.parent.width && this.realX + this.width > this.parent.width){
                return true;
            }
            else if (this.realY < 0 && this.realY + this.height > 0){
                return true;
            }
            else if (this.realY < this.parent.height && this.realY + this.height > this.parent.height){
                return true;
            }
            else{
                return false;
            }
        }
    }

    whichBorder(){
        if (this.realX < 0 && this.realX + this.width > 0){
            return 'LEFT';
        }
        else if (this.realX < this.parent.width && this.realX + this.width > this.parent.width){
            return 'RIGHT';
        }
        else if (this.realY < 0 && this.realY + this.height > 0){
            return 'TOP';
        }
        else if (this.realY < this.parent.height && this.realY + this.height > this.parent.height){
            return 'BOTTOM';
        }
        else{
            return 'NONE';
        }
    }

    hits(gameEntity,exactMatch=false){
        //workout exact matches
        if (this.x == gameEntity.x && this.y == gameEntity.y){
            return true;
        }
        else{
            if (exactMatch) return false;

            let Ax = this.realX,
                Ay = this.realY,
                Aw = this.width,
                Ah = this.height;

            let Bx = gameEntity.realX,
                By = gameEntity.realY,
                Bw = gameEntity.width,
                Bh = gameEntity.height;
            return ( ( Ax + Aw >= Bx && Ax <= Bx + Bw ) && ( Ay + Ah >= By && Ay <= By + Bh ) )
        }

    }

    distanceFrom(gameEntity,fromMid=false){
        if (fromMid){
            let a = gameEntity.x - this.x;
            let b = gameEntity.y - this.y;
            return Math.sqrt( a*a + b*b );
        }
        else{
            let x1 = this.realX,
                y1 = this.realY,
                x1b = this.realX + this.width,
                y1b = this.realY + this.height;
            let x2 = gameEntity.realX,
                y2 = gameEntity.realY,
                x2b = gameEntity.realX + gameEntity.width,
                y2b = gameEntity.realY + gameEntity.height;

            let left = x2b < x1;
            let right = x1b < x2;
            let bottom = y2b < y1;
            let top = y1b < y2;
            if (top && left){
                let a = x2b - x1;
                let b = y2 - y1b;
                return Math.sqrt( a*a + b*b );
            }
            else if (left && bottom){
                let a = x2b - x1;
                let b = y2b - y1;
                return Math.sqrt( a*a + b*b );
            }
            else if (bottom && right){
                let a = x2 - x1b;
                let b = y2b - y1;
                return Math.sqrt( a*a + b*b );
            }
            else if (right && top){
                let a = x2 - x1b;
                let b = y2 - y1b;
                return Math.sqrt( a*a + b*b );
            }
            else if (left){
                return x1 - x2b;
            }
            else if (right){
                return x2 - x1b;
            }
            else if (bottom){
                return y1 - y2b;
            }
            else if (top){
                return y2 - y1b;
            }
            else{
                return 0;
            }
        }
    }

    distanceFromPoint(x,y){
        let a = x - this.x;
        let b = y - this.y;
        return Math.sqrt( a*a + b*b );
    }
}

function Timer(length, fps, oninstance, oncomplete)
{
    let steps = (length / 100) * (fps / 10),
        speed = length / steps,
        count = 0,
        start = new Date().getTime();

    function instance()
    {
        if(count++ == steps)
        {
            oncomplete(steps, count);
        }
        else
        {
            oninstance(steps, count);

            let diff = (new Date().getTime() - start) - (count * speed);
            window.setTimeout(instance, (speed - diff));
        }
    }

    window.setTimeout(instance, speed);
}