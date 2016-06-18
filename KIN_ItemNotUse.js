//=============================================================================
// KIN_ItemNotUse.js
//=============================================================================

/*:ja
 * @plugindesc 特定アイテムを使用不可状態にします。
 *
 * @author Agaricus_Mushroom
 *
 * @help
 * ～使い方～
 * アイテムのメモ欄に以下の記述をします。
 * <notUse:n>
 * スイッチ「n」がＯＮの場合、このアイテムを使用不可にします。
 *
 * バグとか要望あればよろしく。
 */

(function() {

Kinoko_isOccasionOk = Game_BattlerBase.prototype.isOccasionOk;

Game_BattlerBase.prototype.isOccasionOk = function(item) {
    Kinoko_isOccasionOk.call(this, item);
    if(item.meta.notUse){
        var switchValue = item.meta.notUse;
        if($gameSwitches.value(switchValue)){
            return false;
        }
    }
    if ($gameParty.inBattle()) {
        return item.occasion === 0 || item.occasion === 1;
    } else {
        return item.occasion === 0 || item.occasion === 2;
    }
};

})();