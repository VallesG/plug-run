/**
 * Portrait Mode Enforcement Utility
 * Creates an overlay that forces mobile users to rotate to portrait mode
 */

export function createPortraitOverlay(scene) {
  const W = scene.scale.width;
  const H = scene.scale.height;

  // Create overlay elements (hidden by default)
  const overlay = scene.add.container(0, 0).setDepth(100000).setVisible(false).setScrollFactor(0);

  // Dark background
  const bg = scene.add.rectangle(W/2, H/2, W, H, 0x000000, 0.95).setScrollFactor(0);

  // Rotate phone icon (using text emoji)
  const icon = scene.add.text(W/2, H/2 - 40, '📱 ↻', {
    fontSize: '64px',
    color: '#ffffff'
  }).setOrigin(0.5).setScrollFactor(0);

  // Message text
  const message = scene.add.text(W/2, H/2 + 40, 'Please rotate to portrait\nand refresh page', {
    fontSize: '20px',
    color: '#ffffff',
    fontStyle: 'bold',
    align: 'center'
  }).setOrigin(0.5).setScrollFactor(0);

  overlay.add([bg, icon, message]);

  // Function to check orientation
  const checkOrientation = () => {
    // Use window dimensions instead of Phaser scale (more reliable on mobile rotation)
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;
    const isMobile = width < 768; // Mobile breakpoint

    // Show overlay if mobile AND landscape
    const shouldShow = isMobile && isLandscape;
    overlay.setVisible(shouldShow);

    // Update sizes based on Phaser scale (for rendering)
    const sceneWidth = scene.scale.width;
    const sceneHeight = scene.scale.height;
    // Null check to prevent errors when scene is shutting down
    if (bg && bg.active) {
      bg.setPosition(sceneWidth/2, sceneHeight/2).setSize(sceneWidth, sceneHeight);
    }
    if (icon && icon.active) {
      icon.setPosition(sceneWidth/2, sceneHeight/2 - 40);
    }
    if (message && message.active) {
      message.setPosition(sceneWidth/2, sceneHeight/2 + 40);
    }
  };

  // Check on Phaser resize
  scene.scale.on('resize', checkOrientation);

  // Also listen to window events for mobile orientation changes
  const onWindowResize = () => {
    // Small delay to ensure scale manager has updated
    if (scene.time) {
      scene.time.delayedCall(100, checkOrientation);
    }
  };
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('orientationchange', onWindowResize);

  // Initial check
  checkOrientation();

  // Clean up window listeners when scene shuts down
  scene.events.once('shutdown', () => {
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('orientationchange', onWindowResize);
    overlay.destroy();
  });

  return { overlay, checkOrientation };
}
