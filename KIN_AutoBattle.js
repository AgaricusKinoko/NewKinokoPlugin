//=============================================================================
// KIN_AutoBattle.js
//=============================================================================

/*:ja
 * @plugindesc 自動戦闘のＡＩを調整します。
 *
 * @author Agaricus_Mushroom
 *
 * @param toleranceOverKill
 * @desc オーバーキルの許容値（1が敵の最大ＨＰと同量）
 * デフォルト:1.5
 * @default 1.5
 *
 * @help
 * ※ 再定義が複数あるので、プラグインリスト上部に配置してください。
 * ～使い方～
 * 自動戦闘のスキルの選択で、ランダム要素を撤廃します。（クリティカル、ダメージ分散など）
 * また、多少ですが消費ＭＰおよび消費ＴＰも考慮します。
 * さらに、デフォルトでは使用しないスキルを使用させる事が出来ます。
 * （対応済みのスキル）
 * 　・ステート付与
 * 　・ステート解除
 * 　・ＭＰダメージ・回復
 * 　・ＨＰ回復（％）
 * 　・ＭＰ回復（％）
 * 　・ＴＰ回復（％）
 *
 * ステートを使用させる場合は、ステートのメモ欄に以下の記述をしてください。
 * <add_rate:x>
 * そのステートを掛ける際の重み
 * <cure_rate:x>
 * そのステートを治す際の重み
 *
 * キャラの行動をある程度抑制する場合は、キャラのメモにrateを追加します。
 * <attack_rate:x>
 * ＨＰ攻撃、ＭＰ攻撃の選択に掛ける補正
 * ※デフォルトは1.0です。
 * <heal_rate:x>
 * ＨＰ回復、ＭＰ回復、ＴＰ回復の選択に掛ける補正
 * ※デフォルトは1.0です。
 * <state_rate:x>
 * ステート付与、ステート解除の選択に掛ける補正
 * ※デフォルトは1.0です。
 * <item_rate:x>
 * アイテム使用の選択に掛ける補正
 * ※デフォルトでは0.0になっており、アイテムを一切使用しません。
 * 　アイテムを使用させたい場合にrateを指定してください。
 *
 * ～プラグインコマンド～
 * KIN_AutoBattle auto_guard x
 * トループ内インデックスがxの敵が次の行動をするまで、全キャラに防御を実行させます。
 * ※スキルのメモ欄に<auto_guard>と記述する事でも、同様の効果を得られます。
 *
 * バグとか要望あればよろしく。
 */

(function() {

var kinokoGuardIndex = 0;
var kinokoValidateActions;

var parameters = PluginManager.parameters('KIN_AutoBattle');
var toleranceOverKill = Number(parameters['toleranceOverKill'] || 1.5);

    var _Game_Interpreter_pluginCommand =
            Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'KIN_AutoBattle') {
            switch (args[0]) {
            case 'auto_guard':
                kinokoGuardIndex = args[1];
                break;
            }
        }
    };


Kinoko_evaluate = Game_Action.prototype.evaluate;
Kinoko_evaluateWithTarget = Game_Action.prototype.evaluateWithTarget;
Kinoko_apply = Game_Action.prototype.apply;
Kinoko_battleStart = Scene_Battle.prototype.start;
Kinoko_startInput = BattleManager.startInput;
Kinoko_makeAutoBattleActions = Game_Actor.prototype.makeAutoBattleActions;

function initActions(){
    for(var i = 0; i < 4; i++){
        kinokoValidateActions[i] = {
            target:null,
            type:null,
            effects:new Array(),
        };
    }
}

BattleManager.startInput = function() {
    kinokoValidateActions = new Array();
    initActions();
    //console.log(kinokoValidateActions);
    Kinoko_startInput.call(this);
};

Scene_Battle.prototype.start = function() {
    Kinoko_battleStart.call(this);
    kinokoGuardIndex = 0;
};

Game_Action.prototype.apply = function(target) {
    Kinoko_apply.call(this, target);
    if(this.subject().isEnemy() && this.subject().index() == kinokoGuardIndex){
        kinokoGuardIndex = 0;
    }
    if(this.item().meta.auto_guard){
        kinokoGuardIndex = this.subject().index();
    }
};

Game_Actor.prototype.makeAutoBattleActions = function() {
    Kinoko_makeAutoBattleActions.call(this);
    var action = this.action(0);
    if(action && action.isForFriend()){
        kinokoValidateActions[this.index()].target = action._targetIndex;
        kinokoValidateActions[this.index()].type = action.item().damage.type;
        kinokoValidateActions[this.index()].effects = action.item().effects;
    }
    //console.log(kinokoValidateActions);
};

Game_Actor.prototype.usableItems = function() {
    return $gameParty.allItems().filter(function(item) {
        return this.canUse(item);
    }, this);
};

Game_Actor.prototype.makeActionList = function() {
    var list = [];
    var action = new Game_Action(this);
    action.setAttack();
    list.push(action);
    action = new Game_Action(this);
    action.setGuard();
    list.push(action);
    this.usableSkills().forEach(function(skill) {
        action = new Game_Action(this);
        action.setSkill(skill.id);
        list.push(action);
    }, this);
    this.usableItems().forEach(function(item) {
        action = new Game_Action(this);
        action.setItem(item.id);
        list.push(action);
    }, this);
    return list;
};

Game_Action.prototype.evaluate = function() {
    var value = 0;
    this.itemTargetCandidates().forEach(function(target) {
        var targetValue = this.evaluateWithTarget(target);
        if (this.isForAll()) {
            value += targetValue;
        } else if (targetValue > value) {
            value = targetValue;
            this._targetIndex = target.index();
        }
    }, this);
    //console.log(this.item().name + ":" + value);
    value *= this.numRepeats();
    /*if (value > 0) {
        value += Math.random();
    }*/
    return value;
};

Game_Battler.prototype.notetags = function() {
	if (this.isEnemy) {return this.enemy().note.split(/[\r\n]+/)};
	if (this.isActor) {return this.actor().note.split(/[\r\n]+/)};
};

Game_Action.prototype.isOverlap = function(action, target){
    //console.log("---"+this.subject().name()+":"+action.item().name+"---");
    var index;
    var item = action.item();
    if(action.isForAll()){
        index = -1;
    } else {
        index = target.index();
    }
    //console.log(kinokoValidateActions);
    for(var i = 0; i < 4; i++){
        if(kinokoValidateActions[i].target != null && kinokoValidateActions[i].target == index || (kinokoValidateActions[i].target == -1 || index == -1)){
            if(kinokoValidateActions[i].type == item.damage.type){ return true; }
            if(kinokoValidateActions.effects){
                for(var j = 0; j < kinokoValidateActions.effects.length; j++){
                    for(var k = 0; k < item.effects.length; k++){
                        if(kinokoValidateActions[i].effects[j].code == item.effects[k].code && kinokoValidateActions[i].effects[j].dataId == item.effects[k].dataId){
                            return true;
                        }
                        if((kinokoValidateActions[i].type == 3 && item.effects[k].code == 11) || (kinokoValidateActions[i].effects[j].code == 11 && item.damage.type == 3)){
                            return true;
                        }
                        if(kinokoValidateActions[i].type == 4 && item.effects[k].code == 12 || (kinokoValidateActions[i].effects[j].code == 12 && item.damage.type == 4)){
                            return true;
                        }
                    }
                }
            }
        }
    }
    /*
    kinokoValidateActions.forEach(function(act){
        //console.log("target1:"+act.target+" target2:"+index);
        //console.log("target1type:"+act.type+" target2:"+item.damage.type);
        if(act.target != null && act.target == index){
            //alert(item.name);
            //alert(act.type == item.damage.type);
            if(act.type == item.damage.type){ return true; }
            act.effects.forEach(function(effect){
                item.effects.forEach(function(eff){
                    if(effect.code == eff.code && effect.dataId == eff.dataId){
                        return true;
                    }
                });
            });
        }
    });
    */
    return false;
}

Game_Action.prototype.evaluateWithTarget = function(target) {
    var action = this;
    var item = this.item();
    var value = 0;
    var a = this.subject();
    var attack_rate = 1.0;
    var heal_rate = 1.0;
    var state_rate = 1.0;
    var item_rate = 0.0;
    if(action.isForFriend()){
        if(this.isOverlap(action, target)){ return 0; }
    }
    a.notetags().forEach(function(note){
        if(note.indexOf("<attack_rate") >= 0){
            attack_rate = note.replace(/[^0-9^\.]/g,"");
        } else if(note.indexOf("<heal_rate") >= 0){
            heal_rate = note.replace(/[^0-9^\.]/g,"");
        } else if(note.indexOf("<state_rate") >= 0){
            state_rate = note.replace(/[^0-9^\.]/g,"");
        } else if(note.indexOf("<item_rate") >= 0){
            item_rate = note.replace(/[^0-9^\.]/g,"");
        }
    });
    if (this.isHpEffect()) {
        var tmp = item.damage.variance;
        item.damage.variance = 0;
        value = this.makeDamageValue(target, false);
        item.damage.variance = tmp;
        if (this.isForOpponent()) {
            if(target.hp == 0)return 0;
            value = (value / Math.min(target.hp, a.mhp * 10)) * attack_rate;
        } else {
            var recovery = Math.min(-value, target.mhp - target.hp);
            value = ((recovery / target.mhp) * heal_rate) || 0;
        }
        if(value > toleranceOverKill) value = toleranceOverKill;
    } else if (this.isMpEffect()) {
        var tmp = item.damage.variance;
        item.damage.variance = 0;
        value = this.makeDamageValue(target, false);
        item.damage.variance = tmp;
        if (this.isForOpponent()) {
            value = 0;
        } else {
            var recovery = Math.min(-value, target.mmp - target.mp);
            value = ((recovery / target.mmp) * heal_rate) || 0;
        }
    }
    item.effects.forEach(function(effect){
        if(effect.code == 11){    //ＨＰ回復
            var recovery = Math.min(target.mhp * effect.value1, target.mhp - target.hp);
            value += ((recovery / target.mhp) * heal_rate) || 0;
        }
        if(effect.code == 12){    //ＭＰ回復
            var recovery = Math.min(target.mmp * effect.value1, target.mmp - target.mp);
            value += ((recovery / target.mmp) * heal_rate) || 0;
        }
        if(effect.code == 13){    //ＴＰ回復
            var recovery = Math.min(target.maxTp * effect.value1, target.maxTp - target.tp);
            value += (recovery / target.maxTp()) || 0;
        }
        if(effect.code == 21 && effect.dataId != 0){    //ステート付与
            if(effect.dataId == 2){
                if(kinokoGuardIndex > 0){
                    value = 100;
                }
                a.states().forEach(function(state){
                    if(state.meta.auto_guard){
                        value = 100;
                    }
                });
            } else if(target.isStateAddable(effect.dataId)){
                var add_rate = $dataStates[effect.dataId].meta.add_rate || 0;
                if(!target.isStateAffected(effect.dataId)) value += (add_rate * effect.value1 * target.stateRate(effect.dataId) * action.KIN_levelRate(target)) * state_rate;
            }
        }
        if(effect.code == 22 && effect.dataId != 0){    //ステート解除
            var cure_rate = $dataStates[effect.dataId].meta.cure_rate || 0;
            if(target.isStateAffected(effect.dataId)) value += (cure_rate * effect.value1) * state_rate;
        }
    });
    if(item.price != undefined){
        value -= (item.price / 100000 || 0);
        value *= item_rate;
    } else {
        value -= ((item.mpCost / 1000 + item.tpCost / 1000) || 0);
    }
    return value;
};

})();