//=============================================================================
// KIN_DamageBarrier.js
//=============================================================================

/*:ja
 * @plugindesc 規定量までのダメージを無効化するバリアを張るスキルを作ります。
 *
 * @author Agaricus_Mushroom
 *
 * @param barrier_sound
 * @desc バリアでダメージを無効化した際のSEを設定します。
 * (デフォルト = Parry) 
 * @default Parry
 *
 * @help ※再定義をするため、なるべく上の方に設置してください。
 * 
 * ～使い方～
 * バリアとして扱うステートのメモ欄に以下の記述をします。
 * <barrier:X>
 * Xに、バリアで防げるダメージを代入します。
 * <barrier:all>…全てのダメージ
 * <barrier:physical>…物理ダメージ
 * <barrier:magical>…魔法ダメージ
 *
 *
 * バリアを張るスキルのメモ欄に以下の記述をします。
 * <barrier_state:X>
 * Xに、このスキルで付与されるバリアステートのＩＤを代入します。
 *
 * <barrier_type:X>
 * Xに、バリアの許容量に使用するプロパティを代入します。
 * プロパティは、以下のいずれかです。
 * <barrier_type:target_mhp>…対象の最大ＨＰ
 * <barrier_type:this_mhp>…使用者の最大ＨＰ
 * <barrier_type:damage>…このスキルで与えたダメージ（回復）
 * <barrier_type:formula>…このスキルのダメージ計算式の結果
 * <barrier_type:fixed>…固定値
 *
 * <barrier_value:X>
 * バリアの許容量を指定します。単位は%です。
 * <barrier_type:fixed>の場合は、valueの値がそのままバリアの許容量となります。
 * <barrier_type:formula>の場合は、valueに計算式を記述します。(例：a.mat * 5）
 *
 * －－－対象の最大ＨＰの１０％のバリアを張るスキルの記述例－－－
 * <barrier_state:11>
 * <barrier_type:target_mhp>
 * <barrier_value:10>
 * －－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－
 *
 * バグとか要望あればよろしく。
 */

(function() {

var parameters = PluginManager.parameters('KIN_DamageBarrier');
var sound = String(parameters['barrier_sound'] || 'parry');

var Kinoko_Apply3 = Game_Action.prototype.apply;
var Kinoko_Binit = Game_Battler.prototype.initMembers;
var Kinoko_Damage2 = Game_Action.prototype.makeDamageValue;
var Kinoko_Execute = Game_Action.prototype.executeDamage;
var Kinoko_Hp = Game_Battler.prototype.regenerateHp;
var Kinoko_Mp = Game_Battler.prototype.regenerateMp;
var Kinoko_Add = Game_Action.prototype.itemEffectAddState;
var backup = null;

Game_Battler.prototype.initMembers = function() {
    Kinoko_Binit.call(this);
    this._damageBarrier = [];
    for(var i = 0; i < $dataStates.length; i++) this._damageBarrier[i] = 0;
    this._DOT = [];
    for(var i = 0; i < $dataStates.length; i++) this._DOT[i] = 0;
};

Game_Action.prototype.itemEffectAddState = function(target, effect) {
    Kinoko_Add.call(this,target,effect);
    if(effect.dataId > 0){
        var dotId = $dataStates[effect.dataId].meta.DOT;
        if(dotId != null){
            var a = this.subject();
            var b = target;
            var damage = target.result().hpDamage;
            var value = Math.floor(eval(dotId));
            value = this.Kinoko_calcDotDamage(value,a,target);
            target._DOT[effect.dataId] = value;
        }
    }
};

Game_Action.prototype.Kinoko_calcDotDamage = function(value,a,target) {
    var upper = 100;
    var item = this.item();
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
    return Math.floor(value);
};

Game_Action.prototype.apply = function(target) {
    Kinoko_Apply3.call(this,target);
    result = target.result();
    var stateid = this.item().meta.barrier_state;
    var solace = this.item().meta.afflatus_solace;
    stateid = parseInt(stateid);
    if(!(stateid>=0 || stateid<=0)) stateid = 0;
    if(solace != null){
        for(var i = 0; i < this.subject().states().length; i++){
            var state = this.subject().states()[i];
            solace = state.meta.afflatus_solace;
            if(solace != null){
                target.addState(stateid);
                break;
            }
        }
        if(i == this.subject().states().length) stateid = 0;
    }
    if(stateid > 0){
        var type = this.item().meta.barrier_type;
        var value = this.item().meta.barrier_value;
        value = parseInt(value);
        if(!(value>=0 || value<=0)) value = 0;
        if(type != null && type.indexOf("target_mhp") >= 0) target._damageBarrier[stateid] = parseInt(target.mhp * value / 100);
        if(type != null && type.indexOf("this_mhp") >= 0) target._damageBarrier[stateid] = parseInt(this.subject().mhp * value / 100);
        if(type != null && type.indexOf("damage") >= 0) target._damageBarrier[stateid] = parseInt(Math.abs(result.hpDamage) * value / 100);
        if(type != null && type.indexOf("fixed") >= 0) target._damageBarrier[stateid] = parseInt(value);
        if(type != null && type.indexOf("formula") >= 0) target._damageBarrier[stateid] = parseInt(eval(value));
    }
};

Game_Action.prototype.makeDamageValue = function(target, critical) {
    var value = Kinoko_Damage2.call(this,target,critical);
    return value;
};

Game_Battler.prototype.regenerateHp = function() {
    var value = Math.floor(this.mhp * this.hrg);
    var dot = 0;
    for(var i = 0; i < this.states().length; i++){
        var state = this.states()[i];
        var at = state.meta.DOT;
        if(at != null) dot += this._DOT[state.id];
    }
    value -= dot;
    value = Math.max(value, -this.maxSlipDamage());
    if(value < 0){
    for(var i = 0; i < this.states().length; i++){
        var state = this.states()[i];
        var bar = state.meta.barrier;
        if(bar != null){
            if(bar.indexOf("all") >= 0){
                value = this.KIN_barrierR(value,state);
                i--;
            }
        }
        if(value == 0){
            this.gainHp(value);
            break;
        }
    }
    }
    if (value !== 0) {
        this.gainHp(value);
    }
    var hot = 0;
    for(var i = 0; i < this.states().length; i++){
        var state = this.states()[i];
        var up = state.meta.HOT;
        up = parseInt(up);
        if(!(up>=0 || up<=0)) up = 0;
        hot += up;
    }
    var value = this.mhp * hot / 100;
    value *= this.rec;
    value = Math.floor(value);
    if (value !== 0) {
        this.gainHp(value);
    }
};

Game_Battler.prototype.regenerateMp = function() {
    var value = Math.floor(this.mmp * this.mrg);
    if(value < 0){
    for(var i = 0; i < this.states().length; i++){
        var state = this.states()[i];
        var bar = state.meta.barrier;
        if(bar != null){
            if(bar.indexOf("all") >= 0){
                value = this.KIN_barrierR(value,state);
                i--;
            }
        }
        if(value == 0){
            this.gainMp(value);
            break;
        }
    }
    }
    if (value !== 0) {
        this.gainMp(value);
    }
    var hot = 0;
    for(var i = 0; i < this.states().length; i++){
        var state = this.states()[i];
        var up = state.meta.MOT;
        up = parseInt(up);
        if(!(up>=0 || up<=0)) up = 0;
        hot += up;
    }
    var value = this.mmp * hot / 100;
    value *= this.rec;
    value = Math.floor(value);
    if (value !== 0) {
        this.gainMp(value);
    }
};

Game_Battler.prototype.KIN_barrierR = function(value,state) {
    if(this._damageBarrier[state.id] > -value){
        this._damageBarrier[state.id] -= -value;
        value = 0;
    } else {
        value += this._damageBarrier[state.id];
        this._damageBarrier[state.id] = 0;
        this.removeState(state.id);
    }
    return value;
};

Game_Action.prototype.KIN_barrier = function(target,value,state) {
    if(target._damageBarrier[state.id] > value){
        target._damageBarrier[state.id] -= value;
        value = 0;
        this.playBarrierSound();
    } else {
        value -= target._damageBarrier[state.id];
        if(value == 0) this.playBarrierSound();
        target._damageBarrier[state.id] = 0;
        target.removeState(state.id);
    }
    return value;
};

Game_Action.prototype.playBarrierSound = function() {
    if (sound === '') return;
    var barrierSound = {
      name:   sound,
      volume: 90,
      pitch:  100,
      pan:    0
    };
    AudioManager.playSe(barrierSound);
};

Game_Action.prototype.executeDamage = function(target, value) {
    var type = this.item().meta.barrier_type;
    if(value > 0){
        for(var i = 0; i < target.states().length; i++){
            var state = target.states()[i];
            var bar = state.meta.barrier;
            if(bar != null){
                if(this.isPhysical() && (bar.indexOf("all") >= 0 || bar.indexOf("physical") >= 0)){
                    value = this.KIN_barrier(target,value,state);
                    i--;
                } else if(this.isMagical() && (bar.indexOf("all") >= 0 || bar.indexOf("magical") >= 0)){
                    value = this.KIN_barrier(target,value,state);
                    i--;
                } else if(bar.indexOf("all") >= 0){
                    value = this.KIN_barrier(target,value,state);
                    i--;
                }
            }
            if(value == 0) break;
        }
    }
    Kinoko_Execute.call(this,target,value);
};

})();