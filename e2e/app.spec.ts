import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper: Create a simple test image file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testImagePath = path.join(__dirname, 'fixtures', 'test-image.png');

test.describe('VisionEdit E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the upload area on initial load', async ({ page }) => {
    await expect(page.getByText(/Import Media/i)).toBeVisible();
    await expect(page.getByText(/Th3rdAI Vision Studio/i)).toBeVisible();
  });

  test('should show the header with app title', async ({ page }) => {
    await expect(page.locator('header')).toContainText('Th3rdAI Vision Studio');
  });

  test('should display drag and drop instructions', async ({ page }) => {
    await expect(page.getByText(/DRAG AND DROP OR CLICK TO BROWSE/i)).toBeVisible();
  });

  test('should show feature descriptions', async ({ page }) => {
    await expect(page.getByText(/Analysis/i)).toBeVisible();
    await expect(page.getByText(/Precision/i)).toBeVisible();
    await expect(page.getByText(/Velocity/i)).toBeVisible();
  });

  // Note: The following tests would require:
  // 1. Backend server running on localhost:3001
  // 2. Valid GOOGLE_API_KEY configured
  // 3. Test fixtures (sample images)
  // These are commented out as they require full setup

  /*
  test('Workflow 1: Upload and view image', async ({ page }) => {
    // Upload an image
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);

    // Wait for image to load
    await expect(page.getByText(/STATE: RAW INPUT/i)).toBeVisible({ timeout: 10000 });

    // Verify adjustment panel appears
    await expect(page.getByText(/Adjustment Panel/i)).toBeVisible();
    await expect(page.getByText(/Natural Language Prompt/i)).toBeVisible();
  });

  test('Workflow 2: Preset Macro Usage', async ({ page }) => {
    // Upload image first
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText(/STATE: RAW INPUT/i)).toBeVisible({ timeout: 10000 });

    // Click a preset macro
    await page.getByRole('button', { name: /Future Vibe/i }).click();

    // Verify prompt was filled
    const promptTextarea = page.locator('textarea');
    await expect(promptTextarea).toHaveValue(/futuristic.*neon/i);
  });

  test('Workflow 3: Background Removal (requires backend)', async ({ page }) => {
    // Upload image
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText(/STATE: RAW INPUT/i)).toBeVisible({ timeout: 10000 });

    // Click Remove Background
    await page.getByRole('button', { name: /Remove Background/i }).click();

    // Wait for processing (can take 5-15 seconds on first run)
    await expect(page.getByText(/Removing Background/i)).toBeVisible();

    // Wait for completion (timeout extended for model download on first run)
    await expect(page.getByText(/STATE: SYNTHESIZED/i)).toBeVisible({ timeout: 30000 });
  });

  test('Workflow 4: Reset Workspace', async ({ page }) => {
    // Upload image
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText(/STATE: RAW INPUT/i)).toBeVisible({ timeout: 10000 });

    // Click Reset Workspace
    await page.getByRole('button', { name: /Reset Workspace/i }).click();

    // Verify back to upload screen
    await expect(page.getByText(/Import Media/i)).toBeVisible();
  });

  test('Workflow 5: Error handling - empty prompt', async ({ page }) => {
    // Upload image
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText(/STATE: RAW INPUT/i)).toBeVisible({ timeout: 10000 });

    // Try to submit without prompt
    const submitButton = page.getByRole('button', { name: /Process Synthesis/i });

    // Button should be disabled
    await expect(submitButton).toBeDisabled();
  });
  */
});
