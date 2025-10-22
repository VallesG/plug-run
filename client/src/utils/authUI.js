// Authentication UI helpers - modals for claiming accounts, signing in, and signing out
// Handles form validation, error display, and integration with Supabase

import { claimAccount, isGuestAccount, getCurrentUserSync } from './userManager.js';
import { signInWithEmail, signOut, isUsernameAvailable } from './supabaseClient.js';

// Color palette (matching game's visual style)
const COLORS = {
  panel: 0x0a0d1a,
  stroke: 0x2f3660,
  claim: 0xfbbf24,  // Gold/yellow (like STASH)
  signIn: 0x60a5fa,  // Blue (like selected card)
  signOut: 0xef4444, // Red (warning)
  success: 0x86efac, // Green
  error: 0xef4444,   // Red
  textPrimary: '#cbd1ff',
  textSecondary: '#aab5ff',
  textError: '#f87171'
};

/**
 * Show claim account modal
 * @param {Phaser.Scene} scene - The scene to create UI in
 * @param {Function} onSuccess - Callback when account is claimed successfully
 * @param {Function} onCancel - Callback when user cancels
 */
export function showClaimAccountModal(scene, onSuccess, onCancel) {
  const Z = 25000; // Above game modals
  const cx = scene.cameras.main.centerX;
  const cy = scene.cameras.main.centerY;
  const W = scene.scale.gameSize?.width || scene.scale.width;
  const H = scene.scale.gameSize?.height || scene.scale.height;

  // Dark veil
  const veil = scene.add.rectangle(cx, cy, W, H, 0x000000, 0.85)
    .setScrollFactor(0).setDepth(Z).setInteractive();

  // Panel (interactive to block clicks from reaching veil)
  const panelW = Math.min(400, W - 40);
  const panelH = Math.min(480, H - 60);
  const panel = scene.add.rectangle(cx, cy, panelW, panelH, COLORS.panel, 0.98)
    .setStrokeStyle(3, COLORS.claim).setScrollFactor(0).setDepth(Z + 1)
    .setInteractive();

  // Title
  const title = scene.add.text(cx, cy - panelH/2 + 30, 'CLAIM YOUR ACCOUNT', {
    color: COLORS.textPrimary,
    fontSize: '20px',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  // Subtitle
  const subtitle = scene.add.text(cx, cy - panelH/2 + 55, 'Lock in your scores forever', {
    color: COLORS.textSecondary,
    fontSize: '13px',
    fontStyle: 'italic'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  const elements = [veil, panel, title, subtitle];

  // Disable game keyboard input while modal is open
  const wasKeyboardEnabled = scene.input?.keyboard?.enabled ?? true;
  if (scene.input?.keyboard) {
    scene.input.keyboard.enabled = false;
  }

  // Form fields
  const fieldY = cy - panelH/2 + 100;
  const fieldW = panelW - 80; // Shorter fields (was -60)
  const fieldH = 36;
  const fieldSpacing = 65;
  const fieldX = cx - panelW/2 + 30; // Left-aligned with labels

  // Username field
  const usernameLabel = scene.add.text(fieldX, fieldY, 'Username', {
    color: COLORS.textSecondary,
    fontSize: '12px'
  }).setOrigin(0, 1).setDepth(Z + 2).setScrollFactor(0);

  const usernameInput = createHTMLInput(scene, fieldX + fieldW/2, fieldY + 22, fieldW, fieldH, 'text', 'Choose a username');

  // Pre-fill with guest username (stripped of @guests.plugrun.la domain)
  try {
    const currentUsername = getUsername();
    if (currentUsername && currentUsername.includes('@guests.plugrun.la')) {
      // Extract just the "userXXXXX" part
      const usernamePart = currentUsername.split('@')[0];
      usernameInput.value = usernamePart;
    }
  } catch {}

  const usernameError = scene.add.text(fieldX, fieldY + 45, '', {
    color: COLORS.textError,
    fontSize: '11px'
  }).setOrigin(0, 0).setDepth(Z + 2).setScrollFactor(0);

  elements.push(usernameLabel, usernameError);

  // Email field
  const emailY = fieldY + fieldSpacing;
  const emailLabel = scene.add.text(fieldX, emailY, 'Email', {
    color: COLORS.textSecondary,
    fontSize: '12px'
  }).setOrigin(0, 1).setDepth(Z + 2).setScrollFactor(0);

  const emailInput = createHTMLInput(scene, fieldX + fieldW/2, emailY + 22, fieldW, fieldH, 'email', 'your@email.com');
  const emailError = scene.add.text(fieldX, emailY + 45, '', {
    color: COLORS.textError,
    fontSize: '11px'
  }).setOrigin(0, 0).setDepth(Z + 2).setScrollFactor(0);

  elements.push(emailLabel, emailError);

  // Password field
  const passwordY = emailY + fieldSpacing;
  const passwordLabel = scene.add.text(fieldX, passwordY, 'Password', {
    color: COLORS.textSecondary,
    fontSize: '12px'
  }).setOrigin(0, 1).setDepth(Z + 2).setScrollFactor(0);

  const passwordInput = createHTMLInput(scene, fieldX + fieldW/2, passwordY + 22, fieldW, fieldH, 'password', 'Min 6 characters');
  const passwordError = scene.add.text(fieldX, passwordY + 45, '', {
    color: COLORS.textError,
    fontSize: '11px'
  }).setOrigin(0, 0).setDepth(Z + 2).setScrollFactor(0);

  elements.push(passwordLabel, passwordError);

  // Confirm Password field
  const confirmY = passwordY + fieldSpacing;
  const confirmLabel = scene.add.text(fieldX, confirmY, 'Confirm Password', {
    color: COLORS.textSecondary,
    fontSize: '12px'
  }).setOrigin(0, 1).setDepth(Z + 2).setScrollFactor(0);

  const confirmInput = createHTMLInput(scene, fieldX + fieldW/2, confirmY + 22, fieldW, fieldH, 'password', 'Re-enter password');
  const confirmError = scene.add.text(fieldX, confirmY + 45, '', {
    color: COLORS.textError,
    fontSize: '11px'
  }).setOrigin(0, 0).setDepth(Z + 2).setScrollFactor(0);

  elements.push(confirmLabel, confirmError);

  // Prevent input clicks from closing modal and keyboard events from reaching Phaser
  [usernameInput, emailInput, passwordInput, confirmInput].forEach(input => {
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('click', (e) => e.stopPropagation());
    // Stop keyboard events from propagating to Phaser (prevents A/D movement keys from interfering)
    input.addEventListener('keydown', (e) => e.stopPropagation());
    input.addEventListener('keyup', (e) => e.stopPropagation());
    input.addEventListener('keypress', (e) => e.stopPropagation());
  });

  // Loading indicator (hidden initially)
  const loadingText = scene.add.text(cx, cy + panelH/2 - 110, 'Creating account...', {
    color: COLORS.textPrimary,
    fontSize: '14px'
  }).setOrigin(0.5).setDepth(Z + 3).setScrollFactor(0).setVisible(false);
  elements.push(loadingText);

  // Buttons
  const btnY = cy + panelH/2 - 70;
  const btnW = 140;
  const btnH = 38;

  // Claim button
  const claimBg = scene.add.rectangle(cx - btnW/2 - 5, btnY, btnW, btnH, COLORS.claim, 1)
    .setStrokeStyle(2, 0xffd700).setDepth(Z + 2).setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  const claimText = scene.add.text(claimBg.x, claimBg.y, 'Claim Account', {
    color: '#000000',
    fontSize: '14px',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  // Cancel button
  const cancelBg = scene.add.rectangle(cx + btnW/2 + 5, btnY, btnW, btnH, 0x1a2038, 1)
    .setStrokeStyle(2, COLORS.stroke).setDepth(Z + 2).setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  const cancelText = scene.add.text(cancelBg.x, cancelBg.y, 'Cancel', {
    color: COLORS.textPrimary,
    fontSize: '14px'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  elements.push(claimBg, claimText, cancelBg, cancelText);

  // Sign in link
  const signInLink = scene.add.text(cx, cy + panelH/2 - 25, 'Already have an account? Sign in', {
    color: '#60a5fa',
    fontSize: '12px',
    fontStyle: 'italic'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  elements.push(signInLink);

  signInLink.on('pointerover', () => signInLink.setColor('#93c5fd'));
  signInLink.on('pointerout', () => signInLink.setColor('#60a5fa'));
  signInLink.on('pointerdown', () => {
    destroyAll();
    showSignInModal(scene, onSuccess, onCancel);
  });

  // Validation
  let usernameValid = false;
  let emailValid = false;
  let passwordValid = false;
  let confirmValid = false;
  let isSubmitting = false;

  // Username validation (debounced check)
  let usernameCheckTimeout = null;
  usernameInput.addEventListener('input', () => {
    const value = usernameInput.value.trim();
    clearTimeout(usernameCheckTimeout);

    if (value.length === 0) {
      usernameError.setText('');
      usernameValid = false;
      return;
    }

    if (value.length < 3 || value.length > 20) {
      usernameError.setText('Username must be 3-20 characters');
      usernameValid = false;
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      usernameError.setText('Only letters, numbers, and underscores');
      usernameValid = false;
      return;
    }

    // Check availability (debounced)
    usernameError.setText('Checking...');
    usernameCheckTimeout = setTimeout(async () => {
      try {
        const { available, error } = await isUsernameAvailable(value);
        if (error) {
          usernameError.setText('Error checking username');
          usernameValid = false;
        } else if (!available) {
          usernameError.setText('Username already taken');
          usernameValid = false;
        } else {
          usernameError.setText('✓ Available').setColor('#86efac');
          usernameValid = true;
        }
      } catch (err) {
        usernameError.setText('Error checking username');
        usernameValid = false;
      }
    }, 500);
  });

  // Email validation
  emailInput.addEventListener('input', () => {
    const value = emailInput.value.trim();
    emailError.setColor(COLORS.textError);

    if (value.length === 0) {
      emailError.setText('');
      emailValid = false;
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      emailError.setText('Invalid email format');
      emailValid = false;
    } else {
      emailError.setText('');
      emailValid = true;
    }
  });

  // Password validation
  passwordInput.addEventListener('input', () => {
    const value = passwordInput.value;
    passwordError.setColor(COLORS.textError);

    if (value.length === 0) {
      passwordError.setText('');
      passwordValid = false;
      return;
    }

    if (value.length < 6) {
      passwordError.setText('Password must be at least 6 characters');
      passwordValid = false;
    } else {
      passwordError.setText('');
      passwordValid = true;
    }

    // Re-validate confirm password if it has a value
    if (confirmInput.value.length > 0) {
      confirmInput.dispatchEvent(new Event('input'));
    }
  });

  // Confirm password validation
  confirmInput.addEventListener('input', () => {
    const value = confirmInput.value;
    confirmError.setColor(COLORS.textError);

    if (value.length === 0) {
      confirmError.setText('');
      confirmValid = false;
      return;
    }

    if (value !== passwordInput.value) {
      confirmError.setText('Passwords don\'t match');
      confirmValid = false;
    } else {
      confirmError.setText('');
      confirmValid = true;
    }
  });

  // Claim button handler
  claimBg.on('pointerdown', async () => {
    if (isSubmitting) return;

    // Trigger validation
    usernameInput.dispatchEvent(new Event('input'));
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.dispatchEvent(new Event('input'));
    confirmInput.dispatchEvent(new Event('input'));

    // Wait briefly for async username check
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!usernameValid || !emailValid || !passwordValid || !confirmValid) {
      // Show toast error
      showToast(scene, 'Please fix errors before submitting');
      return;
    }

    isSubmitting = true;
    loadingText.setVisible(true);
    claimBg.setInteractive(false);
    claimText.setAlpha(0.5);

    try {
      const result = await claimAccount(
        usernameInput.value.trim(),
        emailInput.value.trim(),
        passwordInput.value
      );

      if (result.success) {
        showToast(scene, 'Account claimed! You\'re all set.', COLORS.success);
        destroyAll();
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Failed to claim account');
      }
    } catch (error) {
      console.error('[AuthUI] Claim failed:', error);
      showToast(scene, error.message || 'Failed to claim account. Try again.');
      loadingText.setVisible(false);
      claimBg.setInteractive({ useHandCursor: true });
      claimText.setAlpha(1);
      isSubmitting = false;
    }
  });

  // Cancel button handler
  cancelBg.on('pointerdown', () => {
    destroyAll();
    onCancel?.();
  });

  // Veil click closes modal (but not if clicking on input fields)
  veil.on('pointerdown', () => {
    // Don't close if an input field is focused or if clicking on an input
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'INPUT') {
      return;
    }
    destroyAll();
    onCancel?.();
  });

  // Cleanup function
  function destroyAll() {
    clearTimeout(usernameCheckTimeout);
    usernameInput.remove();
    emailInput.remove();
    passwordInput.remove();
    confirmInput.remove();
    elements.forEach(el => el?.destroy?.());
    // Re-enable game keyboard input
    if (scene.input?.keyboard) {
      scene.input.keyboard.enabled = wasKeyboardEnabled;
    }
  }

  return { destroy: destroyAll };
}

/**
 * Show sign in modal
 * @param {Phaser.Scene} scene - The scene to create UI in
 * @param {Function} onSuccess - Callback when signed in successfully
 * @param {Function} onCancel - Callback when user cancels
 */
export function showSignInModal(scene, onSuccess, onCancel) {
  const Z = 25000;
  const cx = scene.cameras.main.centerX;
  const cy = scene.cameras.main.centerY;
  const W = scene.scale.gameSize?.width || scene.scale.width;
  const H = scene.scale.gameSize?.height || scene.scale.height;

  // Dark veil
  const veil = scene.add.rectangle(cx, cy, W, H, 0x000000, 0.85)
    .setScrollFactor(0).setDepth(Z).setInteractive();

  // Panel (interactive to block clicks from reaching veil)
  const panelW = Math.min(380, W - 40);
  const panelH = Math.min(360, H - 80);
  const panel = scene.add.rectangle(cx, cy, panelW, panelH, COLORS.panel, 0.98)
    .setStrokeStyle(3, COLORS.signIn).setScrollFactor(0).setDepth(Z + 1)
    .setInteractive();

  // Title
  const title = scene.add.text(cx, cy - panelH/2 + 30, 'SIGN IN', {
    color: COLORS.textPrimary,
    fontSize: '20px',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  // Subtitle
  const subtitle = scene.add.text(cx, cy - panelH/2 + 55, 'Welcome back to the streets', {
    color: COLORS.textSecondary,
    fontSize: '13px',
    fontStyle: 'italic'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  const elements = [veil, panel, title, subtitle];

  // Disable game keyboard input while modal is open
  const wasKeyboardEnabled = scene.input?.keyboard?.enabled ?? true;
  if (scene.input?.keyboard) {
    scene.input.keyboard.enabled = false;
  }

  // Form fields
  const fieldY = cy - panelH/2 + 110;
  const fieldW = panelW - 80; // Shorter fields (was -60)
  const fieldH = 36;
  const fieldSpacing = 70;
  const fieldX = cx - panelW/2 + 30; // Left-aligned with labels

  // Email field
  const emailLabel = scene.add.text(fieldX, fieldY, 'Email', {
    color: COLORS.textSecondary,
    fontSize: '12px'
  }).setOrigin(0, 1).setDepth(Z + 2).setScrollFactor(0);

  const emailInput = createHTMLInput(scene, fieldX + fieldW/2, fieldY + 22, fieldW, fieldH, 'email', 'your@email.com');
  const emailError = scene.add.text(fieldX, fieldY + 45, '', {
    color: COLORS.textError,
    fontSize: '11px'
  }).setOrigin(0, 0).setDepth(Z + 2).setScrollFactor(0);

  elements.push(emailLabel, emailError);

  // Password field
  const passwordY = fieldY + fieldSpacing;
  const passwordLabel = scene.add.text(fieldX, passwordY, 'Password', {
    color: COLORS.textSecondary,
    fontSize: '12px'
  }).setOrigin(0, 1).setDepth(Z + 2).setScrollFactor(0);

  const passwordInput = createHTMLInput(scene, fieldX + fieldW/2, passwordY + 22, fieldW, fieldH, 'password', 'Enter password');
  const passwordError = scene.add.text(fieldX, passwordY + 45, '', {
    color: COLORS.textError,
    fontSize: '11px'
  }).setOrigin(0, 0).setDepth(Z + 2).setScrollFactor(0);

  elements.push(passwordLabel, passwordError);

  // Prevent input clicks from closing modal and keyboard events from reaching Phaser
  [emailInput, passwordInput].forEach(input => {
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('click', (e) => e.stopPropagation());
    // Stop keyboard events from propagating to Phaser (prevents A/D movement keys from interfering)
    input.addEventListener('keydown', (e) => e.stopPropagation());
    input.addEventListener('keyup', (e) => e.stopPropagation());
    input.addEventListener('keypress', (e) => e.stopPropagation());
  });

  // Loading indicator
  const loadingText = scene.add.text(cx, cy + panelH/2 - 110, 'Signing in...', {
    color: COLORS.textPrimary,
    fontSize: '14px'
  }).setOrigin(0.5).setDepth(Z + 3).setScrollFactor(0).setVisible(false);
  elements.push(loadingText);

  // Buttons
  const btnY = cy + panelH/2 - 70;
  const btnW = 110;
  const btnH = 38;
  const btnGap = 16; // Closer together (was 10, but with wider spacing)

  // Sign In button
  const signInBg = scene.add.rectangle(cx - btnW/2 - btnGap/2, btnY, btnW, btnH, COLORS.signIn, 1)
    .setStrokeStyle(2, 0x93c5fd).setDepth(Z + 2).setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  const signInText = scene.add.text(signInBg.x, signInBg.y, 'Sign In', {
    color: '#000000',
    fontSize: '14px',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  // Cancel button
  const cancelBg = scene.add.rectangle(cx + btnW/2 + btnGap/2, btnY, btnW, btnH, 0x1a2038, 1)
    .setStrokeStyle(2, COLORS.stroke).setDepth(Z + 2).setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  const cancelText = scene.add.text(cancelBg.x, cancelBg.y, 'Cancel', {
    color: COLORS.textPrimary,
    fontSize: '14px'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  elements.push(signInBg, signInText, cancelBg, cancelText);

  // Back to claim link
  const claimLink = scene.add.text(cx, cy + panelH/2 - 25, 'Need an account? Claim yours', {
    color: '#fbbf24',
    fontSize: '12px',
    fontStyle: 'italic'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  elements.push(claimLink);

  claimLink.on('pointerover', () => claimLink.setColor('#ffd166'));
  claimLink.on('pointerout', () => claimLink.setColor('#fbbf24'));
  claimLink.on('pointerdown', () => {
    destroyAll();
    showClaimAccountModal(scene, onSuccess, onCancel);
  });

  let isSubmitting = false;

  // Sign In button handler
  signInBg.on('pointerdown', async () => {
    if (isSubmitting) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Basic validation
    if (!email || !password) {
      showToast(scene, 'Please fill in all fields');
      return;
    }

    isSubmitting = true;
    loadingText.setVisible(true);
    signInBg.setInteractive(false);
    signInText.setAlpha(0.5);

    try {
      const { user, error } = await signInWithEmail(email, password);

      if (error) {
        throw new Error(error);
      }

      if (user) {
        const username = user.user_metadata?.username || 'Player';
        showToast(scene, `Welcome back, ${username}!`, COLORS.success);
        destroyAll();
        onSuccess?.();
      }
    } catch (error) {
      console.error('[AuthUI] Sign in failed:', error);
      const message = error.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : 'Sign in failed. Check your connection.';
      showToast(scene, message);
      loadingText.setVisible(false);
      signInBg.setInteractive({ useHandCursor: true });
      signInText.setAlpha(1);
      isSubmitting = false;
    }
  });

  // Cancel button handler
  cancelBg.on('pointerdown', () => {
    destroyAll();
    onCancel?.();
  });

  // Veil click closes modal (but not if clicking on input fields)
  veil.on('pointerdown', () => {
    // Don't close if an input field is focused or if clicking on an input
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'INPUT') {
      return;
    }
    destroyAll();
    onCancel?.();
  });

  // Cleanup function
  function destroyAll() {
    emailInput.remove();
    passwordInput.remove();
    elements.forEach(el => el?.destroy?.());
    // Re-enable game keyboard input
    if (scene.input?.keyboard) {
      scene.input.keyboard.enabled = wasKeyboardEnabled;
    }
  }

  return { destroy: destroyAll };
}

/**
 * Show sign out confirmation modal
 * @param {Phaser.Scene} scene - The scene to create UI in
 * @param {Function} onConfirm - Callback when user confirms sign out
 * @param {Function} onCancel - Callback when user cancels
 */
export function showSignOutModal(scene, onConfirm, onCancel) {
  const Z = 25000;
  const cx = scene.cameras.main.centerX;
  const cy = scene.cameras.main.centerY;
  const W = scene.scale.gameSize?.width || scene.scale.width;
  const H = scene.scale.gameSize?.height || scene.scale.height;

  const user = getCurrentUserSync();
  const isGuest = user.isGuest;
  const username = user.username;

  // Dark veil
  const veil = scene.add.rectangle(cx, cy, W, H, 0x000000, 0.85)
    .setScrollFactor(0).setDepth(Z).setInteractive();

  // Panel (interactive to block clicks from reaching veil)
  const panelW = Math.min(360, W - 40);
  const panelH = 220;
  const panel = scene.add.rectangle(cx, cy, panelW, panelH, COLORS.panel, 0.98)
    .setStrokeStyle(2, COLORS.signOut).setScrollFactor(0).setDepth(Z + 1)
    .setInteractive();

  // Title
  const title = scene.add.text(cx, cy - panelH/2 + 30, 'SIGN OUT?', {
    color: COLORS.textPrimary,
    fontSize: '20px',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  // Warning message
  const warningText = isGuest
    ? 'Your progress will be lost unless\nyou\'ve claimed your account.'
    : `Sign out of ${username}?`;

  const warning = scene.add.text(cx, cy - 10, warningText, {
    color: COLORS.textSecondary,
    fontSize: '14px',
    align: 'center'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  const elements = [veil, panel, title, warning];

  // Disable game keyboard input while modal is open
  const wasKeyboardEnabled = scene.input?.keyboard?.enabled ?? true;
  if (scene.input?.keyboard) {
    scene.input.keyboard.enabled = false;
  }

  // Buttons
  const btnY = cy + panelH/2 - 40;
  const btnW = 120;
  const btnH = 36;
  const btnGap = 12;

  // Sign Out button
  const signOutBg = scene.add.rectangle(cx - btnW/2 - btnGap/2, btnY, btnW, btnH, COLORS.signOut, 1)
    .setStrokeStyle(2, 0xfca5a5).setDepth(Z + 2).setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  const signOutText = scene.add.text(signOutBg.x, signOutBg.y, 'Sign Out', {
    color: '#ffffff',
    fontSize: '14px',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  // Cancel button
  const cancelBg = scene.add.rectangle(cx + btnW/2 + btnGap/2, btnY, btnW, btnH, 0x1a2038, 1)
    .setStrokeStyle(2, COLORS.stroke).setDepth(Z + 2).setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  const cancelText = scene.add.text(cancelBg.x, cancelBg.y, 'Cancel', {
    color: COLORS.textPrimary,
    fontSize: '14px'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  elements.push(signOutBg, signOutText, cancelBg, cancelText);

  // Sign Out button handler
  signOutBg.on('pointerdown', async () => {
    try {
      await signOut();
      showToast(scene, 'Signed out successfully', COLORS.success);
      destroyAll();
      onConfirm?.();
    } catch (error) {
      console.error('[AuthUI] Sign out failed:', error);
      showToast(scene, 'Failed to sign out');
    }
  });

  // Cancel button handler
  cancelBg.on('pointerdown', () => {
    destroyAll();
    onCancel?.();
  });

  // Veil click closes modal (but not if clicking on input fields)
  veil.on('pointerdown', () => {
    // Don't close if an input field is focused or if clicking on an input
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'INPUT') {
      return;
    }
    destroyAll();
    onCancel?.();
  });

  // Cleanup function
  function destroyAll() {
    elements.forEach(el => el?.destroy?.());
    // Re-enable game keyboard input
    if (scene.input?.keyboard) {
      scene.input.keyboard.enabled = wasKeyboardEnabled;
    }
  }

  return { destroy: destroyAll };
}

/**
 * Create an HTML input element positioned in the Phaser scene
 * @param {Phaser.Scene} scene
 * @param {number} x - Center X position (world coords)
 * @param {number} y - Center Y position (world coords)
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @param {string} type - Input type (text, email, password)
 * @param {string} placeholder - Placeholder text
 * @returns {HTMLInputElement}
 */
function createHTMLInput(scene, x, y, width, height, type, placeholder) {
  const input = document.createElement('input');
  input.type = type;
  input.placeholder = placeholder;
  input.style.position = 'absolute';
  input.style.width = width + 'px';
  input.style.height = height + 'px';
  input.style.fontSize = '14px';
  input.style.padding = '0 12px';
  input.style.border = '2px solid #2f3660';
  input.style.borderRadius = '4px';
  input.style.backgroundColor = '#1a2038';
  input.style.color = '#cbd1ff';
  input.style.outline = 'none';
  input.style.fontFamily = 'inherit';
  input.style.zIndex = '26000'; // Above modal

  // Focus styles
  input.addEventListener('focus', () => {
    input.style.borderColor = '#60a5fa';
    input.style.backgroundColor = '#1e2844';
  });
  input.addEventListener('blur', () => {
    input.style.borderColor = '#2f3660';
    input.style.backgroundColor = '#1a2038';
  });

  // Position relative to game canvas
  const updatePosition = () => {
    const canvas = scene.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / scene.scale.width;
    const scaleY = canvas.height / scene.scale.height;

    const screenX = canvasRect.left + (x * canvasRect.width / scene.scale.width);
    const screenY = canvasRect.top + (y * canvasRect.height / scene.scale.height);

    input.style.left = (screenX - width/2) + 'px';
    input.style.top = (screenY - height/2) + 'px';
  };

  updatePosition();

  // Update position on window resize
  const resizeHandler = () => updatePosition();
  window.addEventListener('resize', resizeHandler);

  // Store cleanup function
  const originalRemove = input.remove.bind(input);
  input.remove = () => {
    window.removeEventListener('resize', resizeHandler);
    originalRemove();
  };

  // Add to DOM
  document.body.appendChild(input);

  return input;
}

/**
 * Create compact bottom-left buttons for in-game modals
 * Returns array of objects to register with modal
 * @param {Phaser.Scene} scene - The scene to create buttons in
 * @param {number} panelX - Center X of modal panel
 * @param {number} panelY - Center Y of modal panel
 * @param {number} panelW - Width of modal panel
 * @param {number} panelH - Height of modal panel
 * @param {number} Z - Depth
 * @returns {Array} Array of Phaser objects to add to modal
 */
export function createBottomLeftButtons(scene, panelX, panelY, panelW, panelH, Z = 20005) {
  const elements = [];
  const btnW = 70;
  const btnH = 26;
  const iconBtnW = 32; // Settings icon button (square)
  const gap = 8;
  const isGuest = isGuestAccount();

  // Position at bottom-left of the panel (inside the panel)
  const leftEdge = panelX - panelW/2 + 16; // 16px padding from left edge
  const bottomEdge = panelY + panelH/2 - 85 - btnH/2; // 85px padding from bottom (well inside panel)

  // Claim Account button (only for guests)
  if (isGuest) {
    const claimBg = scene.add.rectangle(leftEdge + btnW/2, bottomEdge, btnW, btnH, COLORS.claim, 0.95)
      .setStrokeStyle(1, 0xffd700)
      .setDepth(Z)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    const claimText = scene.add.text(leftEdge + btnW/2, bottomEdge, 'Claim', {
      color: '#000000',
      fontSize: '11px',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(Z + 1).setScrollFactor(0);

    claimBg.on('pointerdown', () => {
      // Close current modal
      if (scene.currentModal?.destroy) {
        scene.currentModal.destroy();
      }

      showClaimAccountModal(scene, () => {
        // On success, reload
        window.location.reload();
      }, () => {
        // On cancel, do nothing (game continues)
      });
    });

    elements.push(claimBg, claimText);
  }

  // Settings button (always visible) - just icon, no text
  const settingsX = isGuest ? leftEdge + btnW + gap + iconBtnW/2 : leftEdge + iconBtnW/2;
  const settingsBg = scene.add.rectangle(settingsX, bottomEdge, iconBtnW, btnH, 0x1a2038, 0.95)
    .setStrokeStyle(1, 0x2f3660)
    .setDepth(Z)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  const settingsIcon = scene.add.text(settingsX, bottomEdge, '⚙', {
    color: '#cbd1ff',
    fontSize: '16px'
  }).setOrigin(0.5).setDepth(Z + 1).setScrollFactor(0);

  settingsBg.on('pointerdown', () => {
    showInGameSettings(scene, Z + 10);
  });

  elements.push(settingsBg, settingsIcon);

  return elements;
}

/**
 * Show compact settings modal for in-game use
 * @param {Phaser.Scene} scene
 * @param {number} Z - Depth (should be above game modal)
 */
function showInGameSettings(scene, Z = 25000) {
  const cx = scene.cameras.main.centerX;
  const cy = scene.cameras.main.centerY;
  const W = scene.scale.gameSize?.width || scene.scale.width;
  const H = scene.scale.gameSize?.height || scene.scale.height;

  // Semi-transparent veil
  const veil = scene.add.rectangle(cx, cy, W, H, 0x000000, 0.7)
    .setScrollFactor(0).setDepth(Z).setInteractive();

  // Compact panel
  const panelW = Math.min(280, W - 60);
  const panelH = 160;
  const panel = scene.add.rectangle(cx, cy, panelW, panelH, 0x0a0d1a, 0.98)
    .setStrokeStyle(2, 0x2f3660).setScrollFactor(0).setDepth(Z + 1);

  const title = scene.add.text(cx, cy - panelH/2 + 20, 'Settings', {
    color: '#cbd1ff',
    fontSize: '16px',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  const elements = [veil, panel, title];

  // Get AudioManager if available
  let audio = null;
  try {
    const AudioManager = require('../audio/AudioManager.js').default;
    audio = AudioManager.get(scene);
  } catch (e) {
    console.warn('[AuthUI] AudioManager not available');
  }

  const btnW = 84, btnH = 28;
  const labelX = cx - panelW/2 + 16;

  // Music toggle
  const musicY = cy - 10;
  const musicLabel = scene.add.text(labelX, musicY, 'Music', {
    color: '#aab5ff',
    fontSize: '13px'
  }).setOrigin(0, 0.5).setDepth(Z + 2).setScrollFactor(0);

  const musicBg = scene.add.rectangle(cx + panelW/2 - btnW/2 - 12, musicY, btnW, btnH, 0x1a2038, 1)
    .setStrokeStyle(1, 0x2f3660)
    .setDepth(Z + 2)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  let musicOn = audio ? !audio.isMusicMuted() : true;
  const musicText = scene.add.text(musicBg.x, musicBg.y, musicOn ? 'ON' : 'OFF', {
    color: musicOn ? '#86efac' : '#cbd1ff',
    fontSize: '13px'
  }).setOrigin(0.5).setDepth(Z + 3).setScrollFactor(0);

  musicBg.on('pointerdown', () => {
    musicOn = !musicOn;
    musicText.setText(musicOn ? 'ON' : 'OFF').setColor(musicOn ? '#86efac' : '#cbd1ff');
    if (audio) {
      audio.setMusicMute(!musicOn);
    }
  });

  elements.push(musicLabel, musicBg, musicText);

  // Sounds toggle
  const soundsY = cy + 30;
  const soundsLabel = scene.add.text(labelX, soundsY, 'Sounds', {
    color: '#aab5ff',
    fontSize: '13px'
  }).setOrigin(0, 0.5).setDepth(Z + 2).setScrollFactor(0);

  const soundsBg = scene.add.rectangle(cx + panelW/2 - btnW/2 - 12, soundsY, btnW, btnH, 0x1a2038, 1)
    .setStrokeStyle(1, 0x2f3660)
    .setDepth(Z + 2)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  let soundsOn = true;
  try {
    const saved = localStorage.getItem('soundsMuted');
    if (saved !== null) soundsOn = saved === 'false';
  } catch {}

  const soundsText = scene.add.text(soundsBg.x, soundsBg.y, soundsOn ? 'ON' : 'OFF', {
    color: soundsOn ? '#86efac' : '#cbd1ff',
    fontSize: '13px'
  }).setOrigin(0.5).setDepth(Z + 3).setScrollFactor(0);

  soundsBg.on('pointerdown', () => {
    soundsOn = !soundsOn;
    soundsText.setText(soundsOn ? 'ON' : 'OFF').setColor(soundsOn ? '#86efac' : '#cbd1ff');

    // Mute/unmute SFX
    scene.sound.sounds.forEach(sound => {
      if (sound.key !== 'bg_main' && sound.key !== 'bg_plug' && sound.key !== 'bg_learn') {
        sound.setMute(!soundsOn);
      }
    });

    try {
      localStorage.setItem('soundsMuted', String(!soundsOn));
    } catch {}
  });

  elements.push(soundsLabel, soundsBg, soundsText);

  // Close button
  const closeBg = scene.add.rectangle(cx, cy + panelH/2 - 20, 80, 26, 0x1a2038, 1)
    .setStrokeStyle(1, 0x2f3660)
    .setDepth(Z + 2)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  const closeText = scene.add.text(cx, cy + panelH/2 - 20, 'Close', {
    color: '#cbd1ff',
    fontSize: '13px'
  }).setOrigin(0.5).setDepth(Z + 3).setScrollFactor(0);

  elements.push(closeBg, closeText);

  const destroyAll = () => {
    elements.forEach(el => el?.destroy?.());
  };

  closeBg.on('pointerdown', destroyAll);
  veil.on('pointerdown', destroyAll);

  return { destroy: destroyAll };
}

/**
 * Show a toast message
 * @param {Phaser.Scene} scene
 * @param {string} message
 * @param {number} color - Background color (optional, defaults to error red)
 */
function showToast(scene, message, color = COLORS.error) {
  const Z = 30000;
  const cx = scene.cameras.main.centerX;
  const W = scene.scale.gameSize?.width || scene.scale.width;
  const H = scene.scale.gameSize?.height || scene.scale.height;

  const y = H * 0.15;
  const maxW = Math.min(360, W - 40);

  // Create toast container
  const bg = scene.add.rectangle(cx, y, maxW, 50, color, 0.95)
    .setStrokeStyle(2, color === COLORS.success ? 0xa7f3d0 : 0xfca5a5)
    .setDepth(Z).setScrollFactor(0);

  const text = scene.add.text(cx, y, message, {
    color: '#ffffff',
    fontSize: '14px',
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: maxW - 20 }
  }).setOrigin(0.5).setDepth(Z + 1).setScrollFactor(0);

  // Fade in
  bg.setAlpha(0);
  text.setAlpha(0);

  scene.tweens.add({
    targets: [bg, text],
    alpha: 1,
    duration: 200,
    ease: 'Cubic.easeOut'
  });

  // Fade out and destroy
  scene.time.delayedCall(2500, () => {
    scene.tweens.add({
      targets: [bg, text],
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        bg.destroy();
        text.destroy();
      }
    });
  });
}
