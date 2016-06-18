//=============================================================================
// KIN_ShakeAnimation.js
//=============================================================================

/*:ja
 * @plugindesc 戦闘アニメで画面をシェイクさせます。
 *
 * @author Agaricus_Mushroom
 *
 * @help フラッシュを画面にして、強さを0にするとシェイクとして扱います。
 * その場合、ＲＧＢの設定をシェイクの設定として扱います。
 * 上から、強さ、速さ、時間となっています。
 */

(function() {

var Kinoko_Timing = Sprite_Animation.prototype.processTimingData;

Sprite_Animation.prototype.processTimingData = function(timing) {
    var duration = timing.flashDuration * this._rate;
    switch (timing.flashScope) {
    case 1:
        this.startFlash(timing.flashColor, duration);
        break;
    case 2:
        if(timing.flashColor[3] == 0){
            $gameScreen.startShake(timing.flashColor[0], timing.flashColor[1], timing.flashColor[2]);
        } else {
            this.startScreenFlash(timing.flashColor, duration);
        }
        break;
    case 3:
        this.startHiding(duration);
        break;
    }
    if (!this._duplicated && timing.se) {
        AudioManager.playSe(timing.se);
    }
};

})();