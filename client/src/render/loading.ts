type RetryCallback = () => void;

export function drawLoadingScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "white";
  ctx.font = "32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Loading...", width / 2, height / 2 - 50);

  const barWidth = 400;
  const barHeight = 30;
  const barX = (width - barWidth) / 2;
  const barY = height / 2;

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = "#b99cff";
  ctx.fillRect(barX, barY, barWidth * progress, barHeight);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`${Math.round(progress * 100)}%`, width / 2, barY + 65);
}

export function drawLoadingError(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  error: Error | unknown,
  onRetry: RetryCallback
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Loading failed", width / 2, height / 2 - 90);

  ctx.fillStyle = "#cfc5ff";
  ctx.font = "18px Arial";
  ctx.fillText("Failed to load game resources.", width / 2, height / 2 - 50);

  ctx.fillStyle = "#ff9f9f";
  ctx.font = "16px Arial";

  const errorMessage =
    error instanceof Error ? error.message : "Unknown error";

  ctx.fillText(errorMessage, width / 2, height / 2 - 20);

  const buttonWidth = 160;
  const buttonHeight = 50;
  const buttonX = (width - buttonWidth) / 2;
  const buttonY = height / 2 + 30;

  ctx.fillStyle = "#9b7cff";
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Arial";
  ctx.fillText("RETRY", width / 2, buttonY + 32);

  function handleClick(event: MouseEvent): void {
    const rect = ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (
      x >= buttonX &&
      x <= buttonX + buttonWidth &&
      y >= buttonY &&
      y <= buttonY + buttonHeight
    ) {
      ctx.canvas.removeEventListener("click", handleClick);
      onRetry();
    }
  }

  ctx.canvas.addEventListener("click", handleClick);
}

