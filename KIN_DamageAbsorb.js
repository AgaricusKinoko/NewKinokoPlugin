//=============================================================================
// KIN_DamageAbsorb.js
//=============================================================================

/*:ja
 * @plugindesc 与・被ダメージをＨＰ・ＭＰに変換するプラグイン。
 *
 * @author Agaricus_Mushroom
 *
 * @help
 * ～使い方～
 *
 * 攻撃した際にＨＰを回復する場合は、装備、ステート、スキルのメモ欄に以下の記述をします。
 * <absorb_HP:x>
 * xにはダメージに対する回復量の割合を代入します。
 *
 * 攻撃した際にＭＰを回復する場合は、装備、ステート、スキルのメモ欄に以下の記述をします。
 * <absorb_MP:x>
 * xにはダメージに対する回復量の割合を代入します。
 *
 * 攻撃を受けた際にＭＰを回復する場合は、装備、ステートのメモ欄に以下の記述をします。
 * <conversion_MP:x>
 * xにはダメージに対する回復量の割合を代入します。
 */

(function() {

Object.defineProperty(Game_BattlerBase.prototype, 'abm', { 
	get: function() {
		var value = 0;
		this.traitObjects().forEach(function(object) {
			var abm = parseInt(object.meta.absorb_MP) || 0;
			value += abm;
		});
		return value;
	},
	configurable: true
});

Object.defineProperty(Game_BattlerBase.prototype, 'abh', { 
	get: function() {
		var value = 0;
		this.traitObjects().forEach(function(object) {
			var abh = parseInt(object.meta.absorb_HP) || 0;
			value += abh;
		});
		return value;
	},
	configurable: true
});

Object.defineProperty(Game_BattlerBase.prototype, 'com', { 
	get: function() {
		var value = 0;
		this.traitObjects().forEach(function(object) {
			var com = parseInt(object.meta.conversion_MP) || 0;
			value += com;
		});
		return value;
	},
	configurable: true
});

var Kinoko_executeDamage = Game_Action.prototype.executeDamage;	//元々のメソッドを待避

Game_Action.prototype.executeDamage = function(target, value) {
    if(this.isHpEffect() && value > 0){	//HPダメージかつ0ダメージより大きいなら
        var a = this.subject();		//攻撃者を取得
        var skill = this.item();	//スキルを取得

        /* 与ダメージをＭＰに変換 */
        if(a.abm != 0 || skill.meta.absorb_MP){
            a.gainMp(parseInt(value * (a.abm + (skill.meta.absorb_MP || 0)) / 100));
        }

        /* 与ダメージをＨＰに変換 */
        if(a.abh != 0 || skill.meta.absorb_HP){
            a.gainHp(parseInt(value * (a.abh + (skill.meta.absorb_HP || 0)) / 100));
        }
    
        /* 被ダメージをＭＰに変換 */
        if(target.com != 0){
            target.gainMp(parseInt(value * target.com / 100));
        }
    }

    Kinoko_executeDamage.call(this,target, value);	//元々のメソッドを呼び出す
};

})();