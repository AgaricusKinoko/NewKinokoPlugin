//=============================================================================
// KIN_Guts.js
//=============================================================================

/*:ja
 * @plugindesc 戦闘不能にならずにＨＰ１で耐える装備・ステートを作成出来ます。
 *
 * @author Agaricus_Mushroom
 *
 * @help 
 * ～使い方～
 * 装備、もしくはステートのメモ欄に以下の記述をしてください。
 * <guts:X>
 * Xには、ＨＰ１で耐える確率を代入してください。
 * ※ステートの場合、以下の記述を追加することで、発動時にステートを変動させることが出来ます。
 * <guts_after:x>
 * x = 0:ステートを解除します。
 * x = id:指定したidのステートを付与し、ステートを解除します。
 */

(function() {

var Kinoko_setHp = Game_Battler.prototype.setHp;

Game_BattlerBase.prototype.setHp = function(hp) {
    if(this._hp + hp < 1){
        var guts = 0;
        this.traitObjects().forEach(function(trait){
            if(trait.meta.guts){
                guts += (trait.meta.guts / 100);
            }
        });
        if(Math.random() < guts){
            hp = 1;
            this.states().forEach(function(state){
                if(state.meta.guts_after){
                    var id = Number(state.meta.guts_after || 0);
                    if(id != 0){
                        this.addState(id);
                    }
                    this.removeState(state.stateId);
                }
            });
        }
    }
    Kinoko_setHp.call(this, hp);
};

})();