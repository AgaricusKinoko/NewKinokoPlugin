//=============================================================================
// KIN_StateParameter.js
//=============================================================================

/*:ja
 * @plugindesc ステートのプロパティを増やします。
 *
 * @author Agaricus_Mushroom
 *
 * @help ～プラグイン導入前の注意～
 * きぎぬ様のKGN_HitMinusEvaを使用している場合、
 * このプラグインはKGN_HitMinusEvaより下に配置してください。
 * （このプラグインが多分潰されるので）
 *
 * ～使い方～
 * ステートのメモ欄に以下の記述をします。
 *
 * <cause_physical:x>
 * 物理ダメージをx％上昇させます。
 * 例：<cause_physical:50>
 *
 * <cause_magical:x>
 * 物理ダメージをx％上昇させます。
 * 例：<cause_magical:50>
 *
 * <cause_elements:n:x>
 * n属性のダメージをx％上昇させます。
 * 例：<cause_elements:8:50>
 * 「,」で区切って複数の属性も指定出来ます。
 * 例：<cause_elements:2:50,3:-50>
 * （炎属性のダメージを５０％上昇させ、氷属性のダメージを５０％減少させる。）
 *
 * ※xには負の値も使用出来ます。
 *
 * <after_stateA:x>
 * ステートの自動解除タイミングでID「x」のステートを付与します。
 * 例：<after_stateA:1>
 * （自然に効果が切れると戦闘不能になる。死の宣告のようなもの）
 *
 * <after_stateD:x>
 * ステートのダメージ解除タイミングでID「x」のステートを付与します。
 * 例：<after_stateA:1>
 * （このステートにかかった状態でダメージを受けると戦闘不能になる。）
 *
 * <state_remove:"PARAMETER","PROPERTY",x>
 * ステートの解除条件を増やします。具体的には、"PROPATY"に判定する値を記述し、xに解除条件を記述します。
 * 【"PARAMETER"に入る値】
 * 　・HP…HP
 * 　・MP…MP
 * 【"PROPERTY"に入る値】
 * 　・OVER…x以上
 * 　・BELOW…x以下
 * xには割合値が入ります。
 * 例：<state_remove:HP,OVER,100%>
 * ＨＰが全快になると効果が解除されるステート
 *
 * ～注意～
 * 上昇、減少は合算です。
 * 例えば、物理ダメージを５０％上昇させるステートと２０％減少させるステートが
 * 同時にかかっていた場合、物理ダメージが３０％上昇します。
 * また、減少の下限は０％なので、ダメージが負の値を取る事はありません。
 *
 * オマケ機能として、ダメージを与えた時点でステートを解除する事も出来ます。
 * <oneAttack:x>
 * と記述すると、ダメージを与えた時点で対象のステートが解除されます。
 * xには以下のいずれかのプロパティを記述します。
 * 
 * just
 * 複数回攻撃や、全体攻撃であっても、最初の一撃でステートが解除されます。
 * 攻撃を外した場合は、ステートが解除されません。
 *
 * all
 * 複数回攻撃や、全体攻撃の場合、最後まで打ち終えた際にステートが解除されます。
 * 攻撃を外した場合でも、打ち終えた時点でステートが解除されます。
 *
 *
 * これらを組み合わせれば、
 * 某MMORPGの不意打ちの様なステートも作成出来ます。
 *
 * －－－不意打ちっぽいステートの例－－－
 * 特徴：追加能力値：会心率+100%
 * <cause_physical:50>
 * <oneAttack:just>
 * －－－－－－－－－－－－－－－－－－－
 *
 * 「次の物理攻撃一発のダメージを５０％上昇させ、かつ１００％クリティカルする。」
 * というステートになります。
 * クリティカル自体は物理、魔法問わないのがちょっと困る。
 * 増やせばいいんだけどね＾ｑ＾
 *
 * バグとか要望あればよろしく。
 */

(function() {

var Kinoko_executeDamage = Game_Action.prototype.executeDamage;
var Kinoko_Damage = Game_Action.prototype.makeDamageValue;
var Kinoko_Apply = Game_Action.prototype.apply;
var Kinoko_RemoveAuto = Game_Battler.prototype.removeStatesAuto;
var Kinoko_RemoveDamage = Game_Battler.prototype.removeStatesByDamage;
var Kinoko_EffectAddState = Game_Action.prototype.itemEffectAddState;
var Kinoko_StateCounts = Game_BattlerBase.prototype.resetStateCounts;
var Kinoko_Battler = Game_Battler.prototype.initMembers
var Kinoko_Enemy = Game_Enemy.prototype.initialize;
var Kinoko_Load = Scene_Load.prototype.onLoadSuccess;
var Kinoko_RegeneHP = Game_Battler.prototype.regenerateHp;
var Kinoko_RegeneMP = Game_Battler.prototype.regenerateMp;
var Kinoko_Start = BattleManager.startAction;
var Kinoko_setHp = Game_BattlerBase.prototype.setHp;
var Kinoko_setMp = Game_BattlerBase.prototype.setMp;
var repeat_attack = 0;
var max_attack = 0;
var extension = 100;

Game_BattlerBase.prototype.KIN_removeState = function(){
    var battler = this;
    this.states().forEach(function(state){
        if(state.meta.state_remove){
            var array = state.meta.state_remove.split(/,/);
            var parameter;
            var parameter2;
            var property;
            var value;
            switch(array[0]){
            case "HP":
                parameter = "battler.hp";
                parameter2 = "battler.mhp";
                break;
            case "MP":
                parameter = "battler.mp";
                parameter2 = "battler.mmp";
                break;
            }
            switch(array[1]){
            case "OVER":
                property = ">=";
                break;
            case "BELOW":
                property = "<=";
                break;
            }
            var v = array[2].replace(/[^0-9^\.]/g,"");
            value = parseInt(eval(parameter2) * (v / 100));
            console.log(value);
            if(eval(parameter + property + value)){
                battler.removeState(state.id);
            }
        }
    });
};

Game_BattlerBase.prototype.setHp = function(hp) {
    Kinoko_setHp.call(this, hp);
    this.KIN_removeState();
};

Game_BattlerBase.prototype.setMp = function(mp) {
    Kinoko_setHp.call(this, mp);
    this.KIN_removeState();
};

Game_Action.prototype.executeDamage = function(target, value) {
    a = this.subject();
    if(value > 0){
    }
    for(var i = 0; i < a.states().length; i++){
        var state = a.states()[i];
        var at = state.meta.oneAttack;
        if(at != null && at.indexOf("just") >= 0) a.removeState(state.id);
    }
    for(var i = 0; i < target.states().length; i++){
        var state = target.states()[i];
        var count = state.meta.damage_count;
        if(count != null) $gameVariables.setValue(count,$gameVariables.value(count)+value);
    }
    if(a.isActor() != target.isActor()){
        for(var i = 0; i < target.states().length; i++){
            var state = target.states()[i];
            var at = state.meta.counterState;
            if(at != null){
                var counterArray = at.split(/:/);
                if(Math.random() * 100 < counterArray[1]){
                    if(counterArray[0] == 1){
                        a.addState(a.deathStateId())
                    } else {
                        a.addState(counterArray[0]);
                    }
                }
            }
            var at = state.meta.counterDamage;
            if(at != null){
                var counterValue = value * at / 100;
                if(a.isEnemy() && counterValue > a.mhp / 10) counterValue = a.mhp / 10;
                if (this.isPhysical()) {
                    counterValue *= a.pdr;
                }
                if (this.isMagical()) {
                    counterValue *= a.mdr;
                }
               counterValue = this.applyGuard(counterValue, a);
               counterValue = Math.round(counterValue);
               if(counterValue >= a.hp) counterValue = a.hp -1;
               this.executeDamage(a, counterValue);
            }
            var at = state.meta.counterSacrifice;
            if(at != null){
                if(target.isActor()){
                    for(var i = 0; i < $gameTroop.members().length; i++){
                        var sacTarget = $gameTroop.members()[i];
                        for(var j = 0; j < sacTarget.states().length; j++){
                            var state = sacTarget.states()[j];
                            var sac = state.meta.sacrifice;
                            if(sac != null){
                                var counterValue = value * at / 100;
                                if(counterValue > sacTarget.mhp / 10) counterValue = sacTarget.mhp / 10;
                                if (this.isPhysical()) {
                                    counterValue *= sacTarget.pdr;
                                }
                                if (this.isMagical()) {
                                    counterValue *= sacTarget.mdr;
                                }
                                counterValue = this.applyGuard(counterValue, sacTarget);
                                counterValue = Math.round(counterValue);
                                if(counterValue >= sacTarget.hp) counterValue = sacTarget.hp -1;
                                this.executeDamage(sacTarget, counterValue);
                                break;
                            }
                        }
                    }
                } else {
                    for(var i = 0; i < $gameParty.members().length; i++){
                        var sacTarget = $gameParty.members()[i];
                        for(var j = 0; j < sacTarget.states().length; j++){
                            var state = sacTarget.states()[j];
                            var sac = state.meta.sacrifice;
                            if(sac != null){
                                var counterValue = value * at / 100;
                                if (this.isPhysical()) {
                                    counterValue *= sacTarget.pdr;
                                }
                                if (this.isMagical()) {
                                    counterValue *= sacTarget.mdr;
                                }
                                counterValue = this.applyGuard(counterValue, sacTarget);
                                counterValue = Math.round(counterValue);
                                if(counterValue >= sacTarget.hp) counterValue = sacTarget.hp -1;
                                this.executeDamage(sacTarget, counterValue);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    if(value > target.hp) a._finishCount += 1;
    Kinoko_executeDamage.call(this,target, value);	//元々のメソッドを呼び出す
};

BattleManager.startAction = function() {
    Kinoko_Start.call(this);
    max_attack = 0;
};

Game_BattlerBase.prototype.attackSkillId = function() {
    if(this.isActor){
        for(var i = 0; i < this.notetags().length; i++){
            if(this.notetags()[0].indexOf("<magicAttack>") >= 0){
                return 5;
            }
            if(this.notetags()[0].indexOf("<fairyAttack>") >= 0){
                return 6;
            }
        }
        return 1;
    } else {
        return 1;
    }
};

Game_Actor.prototype.notetags = function() {
    return this.actor().note.split(/[\r\n]+/);
};

Game_Action.prototype.itemEffectGainTp = function(target, effect) {
    var value = effect.value1;
    if (value !== 0) {
        target.gainTp(value);
        this.makeSuccess(target);
    }
};

Game_Action.prototype.applyItemUserEffect = function(target) {
    var value = this.item().tpGain * this.subject().tcr;
    this.subject().gainSilentTp(value);
};

Game_Battler.prototype.chargeTpByDamage = function(damageRate) {
    var value = 50 * damageRate * this.tcr;
    this.gainSilentTp(value);
};

Game_Actor.prototype.gainTp = function(value) {
    this._result.tpDamage = -value;
    for(var i = 0; i < this.notetags().length; i++){
        if(this.notetags()[i].indexOf("<tpLevelRate>") >= 0){
            value = value * (this.level + 100) / 100;
            break;
        }
    }
    this.setTp(this.tp + value);
};


Game_Actor.prototype.gainSilentTp = function(value) {
    for(var i = 0; i < this.notetags().length; i++){
        if(this.notetags()[i].indexOf("<tpLevelRate>") >= 0){
            value = value * (this.level + 100) / 100;
            break;
        }
    }
    this.setTp(this.tp + value);
};

Game_Enemy.prototype.initialize = function(enemyId, x, y) {
    Kinoko_Enemy.call(this,enemyId,x,y);
    this._finishCount = 0;
    this._miseryDamage = 0;
};

Game_Battler.prototype.initMembers = function() {
    Kinoko_Battler.call(this);
    this._finishCount = 0;
    this._miseryDamage = 0;
};

Game_Action.prototype.itemEffectAddState = function(target, effect) {
    var a = this.subject();
    extension = 100;
    for(var i = 0; i < a.states().length; i++){
        var state = a.states()[i];
        var ext = state.meta.state_extension;
        var ignore = this.item().meta.ignore_extension;
        if(ignore != null){
            var ignore_array = ignore.split(/,/);
            /*for(var j = 0; j < ignore_array.length; j++){
                ignore_array[j] = parseInt(ignore_array[j]);
            }*/
        }
        ext = parseInt(ext);
        if(!(ext>=0 || ext<=0)) ext = 0;
        if(ignore != null){
            for(var j = 0; j < ignore_array.length; j++){
                if(state.id == ignore_array[j]) ext = 0;
            }
        }
        extension += ext;
    }
    if(extension < 0) extension = 0;
    Kinoko_EffectAddState.call(this,target,effect);
};

Game_BattlerBase.prototype.resetStateCounts = function(stateId) {
    Kinoko_StateCounts.call(this,stateId);
    if(extension != 100){
        this._stateTurns[stateId] = parseInt(this._stateTurns[stateId] * extension / 100);
        extension = 100;
    }
};

Game_Battler.prototype.removeStatesAuto = function(timing) {
    this.states().forEach(function(state) {
        if (this.isStateExpired(state.id) && state.autoRemovalTiming === timing) {
            var at = state.meta.after_stateA;
            at = parseInt(at);
            if(!(at>=0 || at<=0)) at = 0;
            if(at > 0) this.addState(at);
        }
    }, this);
    this.KIN_removeState();
    Kinoko_RemoveAuto.call(this,timing);
};

Game_Battler.prototype.removeStatesByDamage = function() {
    var at = new Array;
    var i = 0;
    this.states().forEach(function(state) {
        if (state.removeByDamage && Math.randomInt(100) < state.chanceByDamage) {
            at[i] = state.meta.after_stateD;
            at[i] = parseInt(at[i]);
            if(!(at[i]>=0 || at[i]<=0)) at[i] = 0;
            i++;
        }
    }, this);
    Kinoko_RemoveDamage.call(this);
    for(var i = 0; i < at.length; i++){
        if(at[i] > 0) this.addState(at[i]);
    }
};

Game_Action.prototype.apply = function(target) {
    if(max_attack == 0) max_attack = this.makeTargets().length;
    Kinoko_Apply.call(this,target);
    this.subject().KIN_removeState();
    var result = target.result();
    if (this.item().damage.type > 0) {
        repeat_attack += 1;
        if(repeat_attack >= max_attack){
            repeat_attack = 0;
            max_attack = 0;
            var a = this.subject();
            for(var i = 0; i < a.states().length; i++){
                var state = a.states()[i];
                var at = state.meta.oneAttack;
                if(at != null && at.indexOf("all") >= 0) a.removeState(state.id);
            }
        } 
    }
    var a = this.subject();
    if(a.isActor() && target.isActor()){
        if(a._actorId != target._actorId){
            for(var i = 0; i < target.states().length; i++){
                if(this.item().scope == 8 || this.item().scope == 10) break;
                var state = target.states()[i];
                var at = state.meta.infection;
                if(at != null){
                    if(at == 2){
                        for(var i = 0; i < a.states().length; i++){
                           var state2 = a.states()[i];
                           var at2 = state2.meta.infection;
                           if(at2 != null && at2 == 2){
                               target.addState(state2.id);
                               a.removeState(state2.id);
                           }
                        }
                        a.addState(state.id);
                        target.removeState(state.id);
                    } else {
                        a.addState(state.id);
                        if(at == 0) target.removeState(state.id);
                    }
                }
            }
        }
    }
    if(target.isEnemy() && $gameSwitches.value(433) == true){
        $gameSwitches.setValue(434,true);
        $gameVariables.setValue(173,this.item().id);
        for(var i = 0; $gameParty.members()[i]._actorId != a._actorId; i++);
        $gameVariables.setValue(174,i);
    }
    var burn = this.item().meta.burn;
    if(burn != null && result.hpDamage > 0){
        for(var i = 259; i < 263; i++){
            if(target.isStateAffected(i)){
                target.addState(Math.min(i+1,263));
                target.removeState(i);
                break;
            }
        }
        if(i == 263) target.addState(259);
    }
};


Game_Action.prototype.makeDamageValue = function(target, critical) {
    Kinoko_Damage.call(this,target,critical);
    var result = target.result();
    var item = this.item();
    var baseValue = this.evalDamageFormula(target);
    var value = baseValue * this.calcElementRate(target);
    var upper = 100;
    var a = this.subject();
    if (this.isPhysical()) {
        value *= target.pdr;
        if(a.isActor()){
            for(var i = 0; i < a.equips().length; i++){
                if(a.equips()[i] != null){
                    var equip = a.equips()[i];
                    var up = equip.meta.cause_physical;
                    up = parseInt(up);
                    if(!(up>=0 || up<=0)) up = 0;
                    upper += up;
                    if(equip.meta.Aeonic_Weapons != null) upper += parseInt((a.hp / a.mhp) * 100 / 2);
                }
            }
        }
        for(var i = 0; i < a.states().length; i++){
            var state = a.states()[i];
            var up = state.meta.cause_physical;
            up = parseInt(up);
            if(!(up>=0 || up<=0)) up = 0;
            upper += up;
        }
        for(var i = 0; i < target.states().length; i++){
            var state = target.states()[i];
            var up = state.meta.twice_physical;
            if(up != null) value = value * up;
            var up = state.meta.twice_magical;
            if(up != null) value = value / up;
            var up = state.meta.absorb_physical;
            if(value > 0 && up != null) value = value * -1 * up / 100;
        }
        if(upper < 0 ) upper = 0;
        value = value * upper / 100;
    }
    upper = 100;
    if (this.isMagical()) {
        if((item.stypeId == 1 || item.stypeId == 2) && item.scope == 2){
            value = value * (Math.max(10 - repeat_attack,5)) / 10;
        }
        value *= target.mdr;
        if(a.isActor()){
            for(var i = 0; i < a.equips().length; i++){
                if(a.equips()[i] != null){
                    var equip = a.equips()[i];
                    var up = equip.meta.cause_magical;
                    up = parseInt(up);
                    if(!(up>=0 || up<=0)) up = 0;
                    upper += up;
                    if(equip.meta.Aeonic_Weapons != null) upper += parseInt((a.hp / a.mhp) * 100 / 2);
                }
            }
        }
        for(var i = 0; i < a.states().length; i++){
            var state = a.states()[i];
            var up = state.meta.cause_magical;
            up = parseInt(up);
            if(!(up>=0 || up<=0)) up = 0;
            upper += up;
        }
        for(var i = 0; i < target.states().length; i++){
            var state = target.states()[i];
            var up = state.meta.twice_magical;
            if(up != null) value = value * up;
            var up = state.meta.twice_physical;
            if(up != null) value = value / up;
            var up = state.meta.absorb_magical;
            if(value > 0 && up != null) value = value * -1 * up / 100;
        }
        if(upper < 0 ) upper = 0;
        value = value * upper / 100;
    }
    upper = 100;
    for(var i = 0; i < a.states().length; i++){
        var state = a.states()[i];
        var up = state.meta.cause_elements;
        if(up != null){
            var up_array = up.split(/:|,/);
            if (this.item().damage.elementId < 0) {
                var kinoko_elements = this.subject().attackElements();
            } else {
                var kinoko_elements = this.item().damage.elementId;
            }
            for(var j = 0; j < up_array.length; j+=2){
                if(kinoko_elements == up_array[j]){
                    up = up_array[j+1];
                    up = parseInt(up);
                    if(!(up>=0 || up<=0)) up = 0;
                    upper += up;
                    break;
                }
            }
        }
    }
    if(upper < 0 ) upper = 0;
    value = value * upper / 100;
    if(item.meta.afflatus_misery != null) a._miseryDamage = 0;
    for(var i = 0; i < target.states().length; i++){
        var state = target.states()[i];
        if(value > 0 && state.meta.afflatus_misery != null) target._miseryDamage = value;
    }
    if (baseValue < 0) {
        value *= target.rec;
        upper = 100;
        if(a.isActor()){
            for(var i = 0; i < a.equips().length; i++){
                if(a.equips()[i] != null){
                    var equip = a.equips()[i];
                    var up = equip.meta.cause_heal;
                    up = parseInt(up);
                    if(!(up>=0 || up<=0)) up = 0;
                    upper += up;
                    if(equip.meta.Aeonic_Weapons != null) upper += parseInt((a.hp / a.mhp) * 100 / 2);
                }
            }
        }
        for(var i = 0; i < a.states().length; i++){
            var state = a.states()[i];
            var up = state.meta.cause_heal;
            up = parseInt(up);
            if(!(up>=0 || up<=0)) up = 0;
            upper += up;
        }
        if(upper < 0 ) upper = 0;
        value = value * upper / 100;
    }
    if (critical) {
        value = this.applyCritical(value);
    }
    value = this.applyVariance(value, item.damage.variance);
    value = this.applyGuard(value, target);
    value = Math.round(value);
    return value;
};

})();