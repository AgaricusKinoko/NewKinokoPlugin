//=============================================================================
// KIN_ProbabilityParalysis.js
//=============================================================================

/*:ja
 * @plugindesc 一定確率で行動に失敗するステートを作成します。
 *
 * @author Agaricus_Mushroom
 *
 * @help ※再定義をするため、なるべく上の方に設置してください。
 *
 *～使い方～
 * 一定確率で行動に失敗するステートのメモ欄に以下の記述をします。
 * <paralysis:X>
 * X = 行動に失敗する確率
 *
 * ～仕様について～
 * ・行動制約を「なし」以外にすると、正常に動作しません。
 * ・行動に失敗した際に出るメッセージは、
 * 　「この状態が継続しているとき」のメッセージです。
 *
 * バグとか要望あればよろしく。
 */

(function() {

var Kinoko_Turn = BattleManager.processTurn;
var kinoko = -1;

BattleManager.processTurn = function() {
    var subject = this._subject;
    var action = subject.currentAction();
    if(action){
        for(var i = 0; i < subject.states().length; i++){
            var state = subject.states()[i];
            var par = state.meta.paralysis;
            par = parseInt(par);
            if(!(par>=0 || par<=0)) par = 0;
            if(Math.random() < (par * 0.01)){
                subject.setActionState('done');
                action = 0;
                kinoko = i;
                this._logWindow.displayParalysisState(subject,state.message3);
                break;
            }
        }
    }
    if (action) {
        action.prepare();
        if (action.isValid()) {
            this.startAction();
        }
        subject.removeCurrentAction();
    console.log(action);
    } else {
        subject.onAllActionsEnd();
        this.refreshStatus();
        this._logWindow.displayAutoAffectedStatus(subject);
        if(kinoko == -1){
            this._logWindow.displayCurrentState(subject);
        } else {
            kinoko = -1;
        }
        this._logWindow.displayRegeneration(subject);
        this._subject = this.getNextSubject();
    }
};

Window_BattleLog.prototype.displayParalysisState = function(subject,stateText) {
    if (stateText) {
        this.push('addParalysisText', subject.name() + stateText);
        this.push('wait');
        this.push('clear');
    }
};

Window_BattleLog.prototype.addParalysisText = function(text) {
    this._lines.push(text);
    this.refresh();
    this.wait();
};

})();