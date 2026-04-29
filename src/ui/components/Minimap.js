const minimap = document.getElementById('minimap');
const minimapCtx = minimap.getContext('2d');

export function initMinimap() {
  // Clear minimap
  minimapCtx.fillStyle = '#000';
  minimapCtx.fillRect(0, 0, minimap.width, minimap.height);

  // Draw border
  minimapCtx.strokeStyle = '#fff';
  minimapCtx.strokeRect(0, 0, minimap.width, minimap.height);
}

export function updateMinimap(playerPos, entities) {
  // Clear minimap
  minimapCtx.fillStyle = '#000';
  minimapCtx.fillRect(0, 0, minimap.width, minimap.height);

  // Draw player position
  minimapCtx.fillStyle = '#0f0';
  minimapCtx.beginPath();
  minimapCtx.arc(
    (playerPos.x / 2000) * minimap.width,
    (playerPos.y / 2000) * minimap.height,
    2,
    0,
    Math.PI * 2
  );
  minimapCtx.fill();

  // Draw border
  minimapCtx.strokeStyle = '#fff';
  minimapCtx.strokeRect(0, 0, minimap.width, minimap.height);
}
