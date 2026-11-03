// Platform adapter. The default build is a no-op: no ads, no network, no SDKs.
// Every callback fires immediately so game code never waits on a portal.
//
// FUTURE (each needs its own portal approval and its own commit; do not add before approval):
//   Playgama Bridge:  load https://bridge.playgama.com/... via the portal's documented snippet,
//                     then in init() await bridge.initialize(); map showRewarded -> bridge.advertisement.showRewarded().
//   CrazyGames SDK:   window.CrazyGames.SDK.init(); gameplayStart/Stop -> SDK.game.gameplayStart()/gameplayStop();
//                     ads -> SDK.ad.requestAd('rewarded'|'midgame', callbacks).
//   Poki SDK:         PokiSDK.init(); gameplayStart/Stop -> PokiSDK.gameplayStart()/gameplayStop();
//                     ads -> PokiSDK.rewardedBreak() / PokiSDK.commercialBreak().
const platform = {
  name: 'none',
  init() { return Promise.resolve(); },
  gameplayStart() {},
  gameplayStop() {},
  showRewarded(onReward, onFail) { try { onReward && onReward(); } catch (e) { onFail && onFail(e); } },
  showInterstitial(done) { done && done(); },
};
export default platform;
