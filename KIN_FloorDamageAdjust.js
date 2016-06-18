//=============================================================================
// KIN_FloorDamageAdjust.js
//=============================================================================

/*:ja
 * @plugindesc ダメージ床で受けるダメージを調整するプラグインです。
 *
 * @author Agaricus_Mushroom
 *
 * @help
 * ～使い方～
 * プラグインコマンドを使って、ダメージ床のダメージをリージョン・地形タグ単位で指定します。
 * リージョンや地形タグが設定されていない、もしくは該当リージョン、地形タグのダメージが設定されていない場合は
 * デフォルトのダメージ(defaultDamage)が適用されます。
 * リージョンと地形タグが両方設定されている場合、リージョンのダメージが優先されます。
 *
 * ～プラグインコマンド～
 * KIN_FloorDamageAdjust setDefaultDamage n
 * 　ダメージ床のデフォルトのダメージを「n」に変更します。
 * KIN_FloorDamageAdjust setRegionDamage id n
 * 　リージョン「id」が設定されたダメージ床のダメージを「n」に変更します。
 * KIN_FloorDamageAdjust setTerrainDamage id n
 * 　地形タグ「id」が設定されたダメージ床のダメージを「n」に変更します。
 *
 * ※「n」はJavaScriptコードとして評価されるため、変数を指定することも可能です。
 * 　たとえば、「this.hp」とすると、ダメージ床を受けるキャラのHPとなります。
 * 　また、演算も可能です。たとえば、「this.hp/10」とすると、HPの10%分のダメージを受けます。
 * 　注意点として、引数は空白文字で区切るため、「this.hp / 10」としてしまうと、this.hpしか評価されません。
 *
 * バグとか要望あればよろしく。
 * 
 * @param defaultDamage
 * @desc ダメージ床のダメージの初期値
 * @default 10
 */

(function() {

var parameters = PluginManager.parameters('KIN_FloorDamageAdjust');
var kinokoDefault = Number(parameters['defaultDamage'] || 10);

    var _Game_Interpreter_pluginCommand =
            Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'KIN_FloorDamageAdjust') {
            switch (args[0]) {
            case 'setDefaultDamage':
                $gamePlayer.kinokoTagDamage()[0] = args[1];
                break;
            case 'setRegionDamage':
                $gamePlayer.kinokoRegionDamage()[args[1]] = args[2];
                break;
            case 'setTerrainDamage':
                $gamePlayer.kinokoTagDamage()[args[1]] = args[2];
                break;
            }
        }
    };



Kinoko_basicFloorDamage = Game_Actor.prototype.basicFloorDamage;
Kinoko_PlayerInitialize = Game_Player.prototype.initialize;

//リージョンダメージ初期設定
Game_Player.prototype.initRegionDamage = function() {
    this._kinokoRegionDamage = [];
    for(var i = 0; i < 256; i++){
        this._kinokoRegionDamage[i] = -1;
    }
}

//地形タグダメージ初期設定
Game_Player.prototype.initTagDamage = function() {
    this._kinokoTagDamage = [];
    this._kinokoTagDamage[0] = kinokoDefault;	//デフォルトのダメージ
    for(var i = 1; i < 8; i++){
        this._kinokoTagDamage[i] = -1;
    }
}

//リージョンダメージの呼び出し
Game_Player.prototype.kinokoRegionDamage = function() {
    if(!this._kinokoRegionDamage){	//定義されてる？
        this.initRegionDamage();
    }
    return this._kinokoRegionDamage;
}

//地形タグダメージの呼び出し
Game_Player.prototype.kinokoTagDamage = function() {
    if(!this._kinokoTagDamage){		//定義されてる？
        this.initTagDamage();
    }
    return this._kinokoTagDamage;
}

Game_Player.prototype.initialize = function() {
    Kinoko_PlayerInitialize.call(this);
    this.initRegionDamage();
    this.initTagDamage();
}

//床ダメージを渡す
Game_Actor.prototype.basicFloorDamage = function() {
    Kinoko_basicFloorDamage.call(this);
    var p = this;
    if($gamePlayer.kinokoRegionDamage()[$gamePlayer.regionId()] == -1){		//リージョンＩＤが設定されているならば
        return eval($gamePlayer.kinokoTagDamage()[$gameMap.terrainTag($gamePlayer._x, $gamePlayer._y)]);
    } else {	//そうでなければ
        return eval($gamePlayer.kinokoRegionDamage()[$gamePlayer.regionId()]);	//地形タグ0ならデフォルトのダメージ扱い
    }
};


})();