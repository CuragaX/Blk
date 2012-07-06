/**
 * Copyright 2012 Google, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

goog.provide('blk.game.client.ClientGame');

goog.require('blk.assets.audio.BaseSounds');
goog.require('blk.game.client.MusicController');
goog.require('blk.graphics.RenderState');
goog.require('blk.net.packets');
goog.require('blk.ui.screens.GameScreen');
goog.require('blk.ui.screens.HelpScreen');
goog.require('blk.ui.screens.MainMenuScreen');
goog.require('blk.ui.screens.SettingsScreen');
goog.require('blk.ui.screens.SplashScreen');
goog.require('blk.ui.screens.StatusScreen');
goog.require('gf.Game');
goog.require('gf.assets.AssetManager');
goog.require('gf.audio.AudioManager');
goog.require('gf.dom.Display');
goog.require('gf.graphics.GraphicsContext');
goog.require('gf.input.InputManager');
goog.require('gf.log');
goog.require('gf.net');
goog.require('gf.net.AuthToken');
goog.require('gf.net.UserInfo');
goog.require('gf.ui.ScreenManager');
goog.require('goog.Uri');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');



/**
 * Main game instance.
 * This manages the game state and all modes.
 *
 * @constructor
 * @extends {gf.Game}
 * @param {!goog.dom.DomHelper} dom DOM helper.
 * @param {!blk.client.LaunchOptions} launchOptions Launch options.
 * @param {!blk.game.client.UserSettings} settings User settings.
 */
blk.game.client.ClientGame = function(dom, launchOptions, settings) {
  goog.base(this, launchOptions);

  /**
   * DOM helper.
   * @type {!goog.dom.DomHelper}
   */
  this.dom = dom;

  /**
   * User settings.
   * @type {!blk.game.client.UserSettings}
   */
  this.settings = settings;

  /**
   * Asset manager.
   * @private
   * @type {!gf.assets.AssetManager}
   */
  this.assetManager_ = new gf.assets.AssetManager(this, this.dom);
  this.registerDisposable(this.assetManager_);
  this.addComponent(this.assetManager_);

  /**
   * Game display window.
   * @private
   * @type {!gf.dom.Display}
   */
  this.display_ = new gf.dom.Display(this.dom);
  this.registerDisposable(this.display_);

  /**
   * Input manager.
   * @type {!gf.input.InputManager}
   */
  this.inputManager_ = new gf.input.InputManager(this,
      this.display_.getInputElement());
  this.registerDisposable(this.inputManager_);
  this.addComponent(this.inputManager_);
  this.inputManager_.keyboard.setFullScreenHandler(
      goog.bind(this.toggleFullscreen, this));

  /**
   * Graphics context.
   * @private
   * @type {!gf.graphics.GraphicsContext}
   */
  this.graphicsContext_ = new gf.graphics.GraphicsContext(
      this.dom, this.display_.canvas.el);
  this.registerDisposable(this.graphicsContext_);

  /**
   * BLK render state.
   * @type {!blk.graphics.RenderState}
   */
  this.renderState_ = new blk.graphics.RenderState(
      this, this.assetManager_, this.graphicsContext_);
  this.registerDisposable(this.renderState_);

  /**
   * Audio manager.
   * @private
   * @type {!gf.audio.AudioManager}
   */
  this.audioManager_ = new gf.audio.AudioManager(this, this.dom);
  this.registerDisposable(this.audioManager_);
  this.addComponent(this.audioManager_);

  /**
   * Music controller.
   * Handles automatic playback of music, track management, etc.
   * @private
   * @type {!blk.game.client.MusicController}
   */
  this.musicController_ = new blk.game.client.MusicController(this);
  this.registerDisposable(this.musicController_);

  /**
   * Sound bank for base game sounds (UI/etc).
   * @type {!gf.audio.SoundBank}
   */
  this.baseSounds_ = blk.assets.audio.BaseSounds.create(
      this.assetManager_, this.audioManager_.context);
  this.audioManager_.loadSoundBank(this.baseSounds_);

  /**
   * Screen manager.
   * @private
   * @type {!gf.ui.ScreenManager}
   */
  this.screenManager_ = new gf.ui.ScreenManager(this.dom);
  this.registerDisposable(this.screenManager_);

  /**
   * Whether the game is currently running.
   * @private
   * @type {boolean}
   */
  this.inGame_ = false;

  this.beginSetup_();
};
goog.inherits(blk.game.client.ClientGame, gf.Game);


/**
 * @override
 */
blk.game.client.ClientGame.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};


/**
 * @return {!gf.assets.AssetManager} Asset manager.
 */
blk.game.client.ClientGame.prototype.getAssetManager = function() {
  return this.assetManager_;
};


/**
 * @return {!gf.dom.Display} Display.
 */
blk.game.client.ClientGame.prototype.getDisplay = function() {
  return this.display_;
};


/**
 * @return {!gf.input.InputManager} Input manager.
 */
blk.game.client.ClientGame.prototype.getInputManager = function() {
  return this.inputManager_;
};


/**
 * @return {!gf.graphics.GraphicsContext} Graphics context.
 */
blk.game.client.ClientGame.prototype.getGraphicsContext = function() {
  return this.graphicsContext_;
};


/**
 * @return {!blk.graphics.RenderState} BLK render state.
 */
blk.game.client.ClientGame.prototype.getRenderState = function() {
  return this.renderState_;
};


/**
 * @return {!gf.audio.AudioManager} Audio manager.
 */
blk.game.client.ClientGame.prototype.getAudioManager = function() {
  return this.audioManager_;
};


/**
 * @return {!blk.game.client.MusicController} Music controller.
 */
blk.game.client.ClientGame.prototype.getMusicController = function() {
  return this.musicController_;
};


/**
 * @return {!gf.ui.ScreenManager} Screen manager.
 */
blk.game.client.ClientGame.prototype.getScreenManager = function() {
  return this.screenManager_;
};


/**
 * @return {boolean} True if a game is currently in progress.
 */
blk.game.client.ClientGame.prototype.isInGame = function() {
  return this.inGame_;
};


/**
 * Refreshes settings from the user settings object.
 * @private
 */
blk.game.client.ClientGame.prototype.refreshSettings_ = function() {
  // Reset input settings
  var inputManager = this.inputManager_;
  inputManager.mouse.setSensitivity(this.settings.mouseSensitivity);
  inputManager.mouse.setLockOnFocus(this.settings.mouseLock);
  if (this.inGame_ && this.settings.mouseLock) {
    inputManager.mouse.lock();
  } else {
    inputManager.mouse.unlock();
  }

  // Toggle global mutes
  this.musicController_.setMuted(this.settings.musicMuted);

  // TODO(benvanik): set multiplayer info if connected
  // var user = this.session.getLocalUser();
  // goog.asserts.assert(user);
  // var userInfo = user.info.clone();
  // userInfo.displayName = this.settings.userName;
  // this.session.updateUserInfo(userInfo);
};


/**
 * Begins the async setup chain.
 * A splash screen will be shown while setup is processing. Depending on the
 * outcome of the setup either {@see #setupSucceeded_} or {@see setupFailed_}
 * will be called.
 * @private
 */
blk.game.client.ClientGame.prototype.beginSetup_ = function() {
  var deferred = new goog.async.Deferred();

  // Show the splash screen
  var splashScreen = new blk.ui.screens.SplashScreen(
      this.dom, this.display_.getDomElement());
  this.screenManager_.setScreen(splashScreen);

  // Setup graphics
  var attributes = /** @type {!WebGLContextAttributes} */ ({
    alpha: false,
    // TODO(benvanik): make configurable - right now makes things ugly and
    //     and slow as hell on OSX (Air)
    antialias: false
  });
  this.graphicsContext_.setup(attributes).addCallbacks(function() {
    // Graphics ready, setup render state
    this.renderState_.setup().addCallbacks(function() {
      this.setupSucceeded_();
    }, function(arg) {
      // Render state failed
      this.setupFailed_('Unable to setup graphics resources', arg);
    }, this);
  }, function(arg) {
    // Graphics failed
    this.setupFailed_('Unable to create the graphics context', arg);
  }, this);

  return deferred;
};


/**
 * Handles successful async setup and next-steps on launch.
 * @private
 */
blk.game.client.ClientGame.prototype.setupSucceeded_ = function() {
  // Clear all screens (should be just the splash)
  this.screenManager_.popAllScreens();

  // Start ticking the game
  this.startTicking();

  // Determine if we are launching directly into a game or if we should drop to
  // the main menu
  if (this.launchOptions.host) {
    // Connect to host
    this.connectToHost(this.launchOptions.host);
  } else {
    // Main menu
    this.gotoMainMenuScreen();
  }
};


/**
 * Handles failed async setup.
 * @private
 * @param {string} message Error message.
 * @param {*} arg Deferred callback error argument.
 */
blk.game.client.ClientGame.prototype.setupFailed_ = function(message, arg) {
  // Clear all screens (should be just the splash)
  this.screenManager_.popAllScreens();

  // Show an error dialog
  this.showErrorPopup('setup', message, arg);

  // NOTE: since we don't do any more work after this, nothing else will happen
};


/**
 * @override
 */
blk.game.client.ClientGame.prototype.update = function(frame) {
  this.screenManager_.update(frame);
};


/**
 * @override
 */
blk.game.client.ClientGame.prototype.render = function(frame) {
  this.screenManager_.render(frame);
};


/**
 * Plays the 'click' sound (if sound is enabled).
 */
blk.game.client.ClientGame.prototype.playClick = function() {
  if (!this.settings.soundFxMuted) {
    this.baseSounds_.playAmbient('click');
  }
};


/**
 * Toggles fullscreen mode.
 * This only works when called from a key or mouse handler.
 */
blk.game.client.ClientGame.prototype.toggleFullscreen = function() {
  this.playClick();

  // Toggle fullscreen
  var goingFullScreen = !this.display_.isFullScreen;
  this.display_.toggleFullScreen();

  // Attempt to lock the mouse if we are transitioning into fullscreen
  if (this.inGame_ &&
      goingFullScreen &&
      this.inputManager_.mouse.supportsLocking &&
      this.settings.mouseLock) {
    this.inputManager_.mouse.lock();
  }
};


/**
 * Navigates to the main menu screen, replacing all other screens.
 */
blk.game.client.ClientGame.prototype.gotoMainMenuScreen = function() {
  if (this.isInGame()) {
    this.exitGame_();
  }

  var mainMenuScreen = new blk.ui.screens.MainMenuScreen(
      this.dom, this.display_.getDomElement());
  this.screenManager_.setScreen(mainMenuScreen);
};


/**
 * Navigates to the single-player game selection screen.
 */
blk.game.client.ClientGame.prototype.pushSinglePlayerMenuScreen = function() {
  goog.asserts.assert(!this.isInGame());

  // var singlePlayerMenuScreen = new blk.ui.screens.SinglePlayerMenuScreen(
  //     this.dom, this.display_.getDomElement());
  // this.screenManager_.pushScreen(singlePlayerMenuScreen);
};


/**
 * Navigates to the multi-player game selection screen.
 */
blk.game.client.ClientGame.prototype.pushMultiPlayerMenuScreen = function() {
  goog.asserts.assert(!this.isInGame());

  // var multiPlayerMenuScreen = new blk.ui.screens.MultiPlayerMenuScreen(
  //     this.dom, this.display_.getDomElement());
  // this.screenManager_.pushScreen(multiPlayerMenuScreen);
};


/**
 * Navigates to the single-player map creation screen.
 */
blk.game.client.ClientGame.prototype.pushCreateMapMenuScreen = function() {
  goog.asserts.assert(!this.isInGame());

  // var createMapMenuScreen = new blk.ui.screens.CreateMapMenuScreen(
  //     this.dom, this.display_.getDomElement());
  // this.screenManager_.pushScreen(createMapMenuScreen);
};


/**
 * Pauses display state before a popup dialog is displayed.
 * @private
 */
blk.game.client.ClientGame.prototype.prePopup_ = function() {
  this.playClick();

  // Disable input if in game
  if (this.isInGame()) {
    this.inputManager_.setEnabled(false);
  }
};


/**
 * Resumes display state after a popup dialog is displayed.
 * @private
 */
blk.game.client.ClientGame.prototype.postPopup_ = function() {
  this.playClick();

  // Re-enable input if in game
  if (this.isInGame()) {
    this.inputManager_.setEnabled(true);
  }
};


/**
 * Shows the settings popup.
 */
blk.game.client.ClientGame.prototype.showSettingsPopup = function() {
  this.prePopup_();

  var settingsScreen = new blk.ui.screens.SettingsScreen(
      this.dom, this.display_.getDomElement());
  this.screenManager_.pushScreen(settingsScreen);

  settingsScreen.deferred.addCallback(
      function(buttonid) {
        if (buttonId == 'save') {
          this.refreshSettings_();
        }

        this.postPopup_();
      }, this);
};


/**
 * Shows the help popup.
 */
blk.game.client.ClientGame.prototype.showHelpPopup = function() {
  this.prePopup_();

  var helpScreen = new blk.ui.screens.HelpScreen(
      this.dom, this.display_.getDomElement());
  this.screenManager_.pushScreen(helpScreen);

  helpScreen.deferred.addBoth(
      function() {
        this.postPopup_();
      }, this);
};


/**
 * Shows the error popup.
 * @param {string} location Location the error occurred ('setup', 'networking').
 * @param {string} message Error message.
 * @param {*=} opt_arg Optional argument from a deferred callback.
 */
blk.game.client.ClientGame.prototype.showErrorPopup = function(
    location, message, opt_arg) {
  blk.ui.screens.StatusScreen.showError(
      this.screenManager_, this.display_.getDomElement(),
      location, message, opt_arg || null);
};


/**
 * Connects to the given host.
 * @param {string} address Host address, either local or remote.
 */
blk.game.client.ClientGame.prototype.connectToHost = function(address) {
  // Show the connecting dialog
  var dialogDeferred = blk.ui.screens.StatusScreen.showConnecting(
      this.screenManager_, this.display_.getDomElement(),
      address);

  var deferred = new goog.async.Deferred();

  // Create a URI
  var uri = new goog.Uri(address);
  var validAddress =
      uri.getScheme() != '' &&
      uri.getDomain() != '' &&
      uri.getPort() != '';
  if (!validAddress) {
    deferred.errback('Invalid address format: \"' + address + '\"');
  }

  // Prepare auth/user info
  var authToken = new gf.net.AuthToken(); // = new gf.net.auth.GplusToken();
  var userInfo = new gf.net.UserInfo();
  //userInfo.authType = gf.net.AuthType.GPLUS;
  //userInfo.authId = 'gplus_id';
  userInfo.displayName = gf.net.UserInfo.sanitizeDisplayName(settings.userName);

  // Attempt connection
  if (!deferred.hasFired()) {
    switch (uri.getScheme()) {
      case 'ws':
        // Remote
        this.connectToRemoteHost_(uri, authToken, userInfo, deferred);
        break;
      case 'local':
        // Local
        this.connectToLocalHost_(uri, authToken, userInfo, deferred);
        break;
      default:
        deferred.errback('Unsupported scheme \"' + uri.getScheme() + '\"');
        break;
    }
  }

  deferred.addCallbacks(
      function(session) {
        gf.log.write('Connection established to ' + address);
        // Connection ready!
        dialogDeferred.cancel();

        // Start the game
        this.gotoGameScreen_(session);
      }, function(arg) {
        gf.log.write('Error connecting to ' + address, arg);

        // Connection failed
        dialogDeferred.cancel();

        // Show error dialog
        // TODO(benvanik): allow this to loop back around to the main screen?
        blk.ui.screens.StatusScreen.showConnectionFailed(
            this.screenManager_, this.display_.getDomElement(),
            arg);
      }, this);
};


/**
 * Shared workers are harder to debug than dedicated workers - disable when
 * developing.
 * @private
 * @const
 * @type {boolean}
 */
blk.game.client.ClientGame.ENABLE_SHARED_WORKERS_ = false;


/**
 * Connects to the given local host.
 * @private
 * @param {!goog.Uri} uri Local host URI.
 * @param {!gf.net.AuthToken} authToken Authentication information.
 * @param {!gf.net.UserInfo} userInfo Client user information.
 * @param {!goog.async.Deferred} deferred A deferred to callback with the
 *     session once it has been established.
 */
blk.game.client.ClientGame.prototype.connectToLocalHost_ =
    function(uri, authToken, userInfo, deferred) {
  // // Request quota
  // // TODO(benvanik): pull from somewhere?
  // var quotaSize = 1024 * 1024 * 1024;
  // deferred = new goog.async.Deferred();
  // gf.io.requestQuota(
  //     gf.io.FileSystemType.PERSISTENT, quotaSize).addCallbacks(
  //     function(grantedBytes) {
  //       if (grantedBytes < quotaSize) {
  //         deferred.errback(null);
  //       } else {
  //         blk.client.launchLocalServer_(
  //             sourceMode,
  //             launchOptions.host,
  //             authToken,
  //             userInfo).chainDeferred(/** @type {!goog.async.Deferred} */ (
  //             deferred));
  //       }
  //     },
  //     function(arg) {
  //       gf.log.write('unable to get quota - no saving!');
  //       blk.client.launchLocalServer_(
  //           sourceMode,
  //           launchOptions.host,
  //           authToken,
  //           userInfo).chainDeferred(/** @type {!goog.async.Deferred} */ (
  //           deferred));
  //     });

  // // Launch worker
  // var deferred = new goog.async.Deferred();
  // goog.asserts.assert(!!goog.global.Worker);

  // // TODO(benvanik): name servers so there can be multiple/etc
  // var serverId = goog.uri.utils.getDomain(uri);
  // var name = 'server-' + serverId + (sourceMode ? '-uncompiled' : '');

  // // Launch worker
  // // Attempt to create a shared worker if it's supported - otherwise go
  // // dedicated so we at least work
  // var workerUri = sourceMode ?
  //     'worker-server-uncompiled.js' :
  //     'worker-server.js';
  // var worker;
  // var port;
  // // HACK: SharedWorker exists in WebKit, but is not working
  // if (blk.game.client.ClientGame.ENABLE_SHARED_WORKERS_ &&
  //     goog.userAgent.product.CHROME &&
  //     goog.global['SharedWorker']) {
  //   worker = new SharedWorker(workerUri, name);
  //   port = worker.port;
  // } else {
  //   worker = new Worker(workerUri);
  //   port = worker;
  // }

  // // Connect
  // var connectDeferred = gf.net.connect(
  //     /** @type {gf.net.Endpoint} */ (port),
  //     blk.net.packets.PROTOCOL_VERSION,
  //     authToken,
  //     userInfo);
  // connectDeferred.addCallbacks(function(session) {
  //   // Wait until here otherwise it will steal events from the session
  //   gf.log.installListener(port, '{server}');

  //   // TODO(benvanik): send server init

  //   deferred.callback(session);
  // }, function(arg) {
  //   deferred.errback(arg);
  // });
};


/**
 * Connects to the given remote host.
 * @private
 * @param {!goog.Uri} uri Remote host URI.
 * @param {!gf.net.AuthToken} authToken Authentication information.
 * @param {!gf.net.UserInfo} userInfo Client user information.
 * @param {!goog.async.Deferred} deferred A deferred to callback with the
 *     session once it has been established.
 */
blk.game.client.ClientGame.prototype.connectToRemoteHost_ =
    function(uri, authToken, userInfo, deferred) {
  var endpoint = /** @type {gf.net.Endpoint} */ (uri.toString());

  // Attempt connection
  var connectDeferred = gf.net.connect(
      endpoint,
      blk.net.packets.PROTOCOL_VERSION,
      authToken, userInfo);
  connectDeferred.chainDeferred(deferred);
};


/**
 * Navigates to the game screen, removing all other screens.
 * @private
 * @param {!gf.net.ClientSession} session Connected network session.
 */
blk.game.client.ClientGame.prototype.gotoGameScreen_ = function(session) {
  this.enterGame_();

  var gameScreen = new blk.ui.screens.GameScreen(this, session);
  this.screenManager_.setScreen(gameScreen);
};


/**
 * Handles pre-game logic.
 * @private
 */
blk.game.client.ClientGame.prototype.enterGame_ = function() {
  goog.asserts.assert(!this.isInGame());
  this.inGame_ = true;
};


/**
 * Handles post-game logic.
 * @private
 */
blk.game.client.ClientGame.prototype.exitGame_ = function() {
  goog.asserts.assert(this.isInGame());
  this.inGame_ = false;
};
