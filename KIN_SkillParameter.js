//=============================================================================
// KIN_SkillParameter.js
//=============================================================================

/*:ja
 * @plugindesc スキルごとに命中率、クリティカル率を変動させることが可能になります。運の差でクリティカル率が変動するようにもなります。
 *
 * @author Agaricus_Mushroom
 *
 * @help ～使い方～
 * スキルのメモ欄に以下の記述をします。
 *
 * 【命中率を変動させたい場合】
 * <hit:x>
 * 例：命中率が通常より５０％高いスキル
 * <hit:50>
 *
 * 【クリティカル率を変動させたい場合】
 * <critical:x>
 * 例：必ずクリティカルするスキル
 * <critical:100>
 *
 * また、xには負の値も使用出来ます。
 * 例：命中率が通常より５０％低いスキル
 * <hit:-50>
 *
 * 使用者が特定のステートにかかっている時だけこれらを適用する事も出来ます。
 * その場合は、通常の記述に加えて、
 * <eff_state:x>
 * と記述します。（xにはステートIDが入ります）
 * 例：毒（IDが４）にかかっている時だけクリティカル率が２０％高くなるスキル
 * <critical:20>
 * <eff_state:4>
 *
 *
 * ～余談ダガー～
 * デフォルトの命中計算は、使用者がどれだけ命中率が高くても、
 * １００％以上は切り捨てられ、
 * 相手側の回避判定でミスだった場合は容赦なく回避されてしまいます。
 * このプラグインも例外ではないので、必中にしたい場合などは、
 * きぎぬ様のKGN_HitMinusEvaというプラグインと併用すると便利です(^o^)
 * バグとか要望あればよろしく。
 */

(function() {
var Kinoko_Hit = Game_Action.prototype.itemHit;
var Kinoko_EnemyI = Game_Enemy.prototype.initialize;

Game_Battler.prototype.notetags = function() {
	if (this.isEnemy) {return this.enemy().note.split(/[\r\n]+/)};
	if (this.isActor) {return this.actor().note.split(/[\r\n]+/)};
};

Game_Action.prototype.itemHit = function(target) {
    Kinoko_Hit.call(this,target);
    var hit = this.item().meta.hit;
    hit = parseInt(hit);
    if(!(hit>=0 || hit<=0)) hit = 0;
    var stateid = this.item().meta.eff_state;
    stateid = parseInt(stateid);
    if(!(stateid>=0 || stateid<=0)) stateid = 0;
    if(stateid > 0){
        if(!this.subject().isStateAffected(stateid)) hit = 0;
    }
    if (this.isPhysical()) {
        return this.item().successRate * 0.01 * this.subject().hit + (hit * 0.01);
    } else {
        return this.item().successRate * 0.01 + (hit * 0.01);
    }
};

})();