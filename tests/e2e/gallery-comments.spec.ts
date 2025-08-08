import { test, expect } from '@playwright/test';

test.describe('Gallery Comments Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and login
    await page.goto('/login');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'testuser');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
    
    // Navigate to a project with images
    await page.goto('/project/1');
    await page.waitForSelector('h2:has-text("Images")');
  });

  test('should display gallery comments sidebar when gallery is opened', async ({ page }) => {
    // Click on first image to open gallery
    await page.locator('img[alt*="test-image"]').first().click();
    
    // Wait for gallery modal to appear
    await expect(page.locator('.fixed.inset-0')).toBeVisible();
    
    // Check that gallery comments section exists
    await expect(page.locator('h3:has-text("Gallery Comments")')).toBeVisible();
    
    // Check show/hide toggle exists
    await expect(page.locator('button:has-text("Show"), button:has-text("Hide")')).toBeVisible();
  });

  test('should show and hide gallery comments section', async ({ page }) => {
    // Open gallery
    await page.locator('img[alt*="test-image"]').first().click();
    await expect(page.locator('.fixed.inset-0')).toBeVisible();
    
    // Initially comments should be hidden (Show button visible)
    const toggleButton = page.locator('button:has-text("Show"), button:has-text("Hide")');
    
    if (await page.locator('button:has-text("Show")').isVisible()) {
      // Click Show to expand comments
      await page.click('button:has-text("Show")');
      
      // Check that comments input appears
      await expect(page.locator('input[placeholder*="Add a comment"]')).toBeVisible();
      await expect(page.locator('button:has-text("Add")')).toBeVisible();
      
      // Toggle button should now say "Hide"
      await expect(page.locator('button:has-text("Hide")')).toBeVisible();
      
      // Click Hide to collapse comments
      await page.click('button:has-text("Hide")');
      
      // Comments input should be hidden
      await expect(page.locator('input[placeholder*="Add a comment"]')).not.toBeVisible();
      
      // Toggle button should now say "Show"
      await expect(page.locator('button:has-text("Show")')).toBeVisible();
    }
  });

  test('should add gallery comments successfully', async ({ page }) => {
    // Open gallery and expand comments
    await page.locator('img[alt*="test-image"]').first().click();
    await expect(page.locator('.fixed.inset-0')).toBeVisible();
    
    // Show comments if hidden
    if (await page.locator('button:has-text("Show")').isVisible()) {
      await page.click('button:has-text("Show")');
    }
    
    // Wait for comments section to be visible
    await expect(page.locator('input[placeholder*="Add a comment"]')).toBeVisible();
    
    const commentText = 'E2E test gallery comment';
    
    // Type comment
    await page.fill('input[placeholder*="Add a comment"]', commentText);
    
    // Add button should be enabled
    await expect(page.locator('button:has-text("Add"):not([disabled])')).toBeVisible();
    
    // Submit comment
    await page.click('button:has-text("Add"):not([disabled])');
    
    // Wait for comment to appear
    await expect(page.locator(`text=${commentText}`)).toBeVisible();
    
    // Check that username and timestamp are displayed
    await expect(page.locator('text=testuser')).toBeVisible();
    
    // Input should be cleared
    await expect(page.locator('input[placeholder*="Add a comment"]')).toHaveValue('');
    
    // Add button should be disabled again
    await expect(page.locator('button:has-text("Add")[disabled]')).toBeVisible();
  });

  test('should display multiple gallery comments in chronological order', async ({ page }) => {
    // Open gallery and expand comments
    await page.locator('img[alt*="test-image"]').first().click();
    if (await page.locator('button:has-text("Show")').isVisible()) {
      await page.click('button:has-text("Show")');
    }
    
    await expect(page.locator('input[placeholder*="Add a comment"]')).toBeVisible();
    
    // Add first comment
    const comment1 = 'First E2E comment';
    await page.fill('input[placeholder*="Add a comment"]', comment1);
    await page.click('button:has-text("Add"):not([disabled])');
    await expect(page.locator(`text=${comment1}`)).toBeVisible();
    
    // Add second comment
    const comment2 = 'Second E2E comment';
    await page.fill('input[placeholder*="Add a comment"]', comment2);
    await page.click('button:has-text("Add"):not([disabled])');
    await expect(page.locator(`text=${comment2}`)).toBeVisible();
    
    // Both comments should be visible
    await expect(page.locator(`text=${comment1}`)).toBeVisible();
    await expect(page.locator(`text=${comment2}`)).toBeVisible();
    
    // Comments should have timestamps
    const timestamps = page.locator('text=/\\d{2}\\/\\d{2}\\/\\d{4}/');
    await expect(timestamps).toHaveCount({ min: 2 });
  });

  test('should prevent submitting empty comments', async ({ page }) => {
    // Open gallery and expand comments
    await page.locator('img[alt*="test-image"]').first().click();
    if (await page.locator('button:has-text("Show")').isVisible()) {
      await page.click('button:has-text("Show")');
    }
    
    await expect(page.locator('input[placeholder*="Add a comment"]')).toBeVisible();
    
    // Add button should be disabled with empty input
    await expect(page.locator('button:has-text("Add")[disabled]')).toBeVisible();
    
    // Type some text then clear it
    await page.fill('input[placeholder*="Add a comment"]', 'test');
    await page.fill('input[placeholder*="Add a comment"]', '');
    
    // Add button should be disabled again
    await expect(page.locator('button:has-text("Add")[disabled]')).toBeVisible();
    
    // Type whitespace only
    await page.fill('input[placeholder*="Add a comment"]', '   ');
    
    // Add button should still be disabled
    await expect(page.locator('button:has-text("Add")[disabled]')).toBeVisible();
  });

  test('should support Enter key to submit comments', async ({ page }) => {
    // Open gallery and expand comments
    await page.locator('img[alt*="test-image"]').first().click();
    if (await page.locator('button:has-text("Show")').isVisible()) {
      await page.click('button:has-text("Show")');
    }
    
    await expect(page.locator('input[placeholder*="Add a comment"]')).toBeVisible();
    
    const commentText = 'Enter key test comment';
    
    // Type comment and press Enter
    await page.fill('input[placeholder*="Add a comment"]', commentText);
    await page.press('input[placeholder*="Add a comment"]', 'Enter');
    
    // Comment should appear
    await expect(page.locator(`text=${commentText}`)).toBeVisible();
    
    // Input should be cleared
    await expect(page.locator('input[placeholder*="Add a comment"]')).toHaveValue('');
  });

  test('should persist comments when navigating between gallery images', async ({ page }) => {
    // Open gallery and expand comments
    await page.locator('img[alt*="test-image"]').first().click();
    if (await page.locator('button:has-text("Show")').isVisible()) {
      await page.click('button:has-text("Show")');
    }
    
    await expect(page.locator('input[placeholder*="Add a comment"]')).toBeVisible();
    
    // Add a comment
    const commentText = 'Persistent comment test';
    await page.fill('input[placeholder*="Add a comment"]', commentText);
    await page.click('button:has-text("Add"):not([disabled])');
    await expect(page.locator(`text=${commentText}`)).toBeVisible();
    
    // Navigate to next image (if available)
    const nextButton = page.locator('button:has-text("Next"), .image-gallery-right-nav');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      
      // Wait a moment for navigation
      await page.waitForTimeout(500);
      
      // Comment should still be visible (gallery-level, not per-image)
      await expect(page.locator(`text=${commentText}`)).toBeVisible();
    }
  });

  test('should close gallery modal and preserve functionality on reopen', async ({ page }) => {
    // Open gallery and add comment
    await page.locator('img[alt*="test-image"]').first().click();
    if (await page.locator('button:has-text("Show")').isVisible()) {
      await page.click('button:has-text("Show")');
    }
    
    const commentText = 'Reopen test comment';
    await page.fill('input[placeholder*="Add a comment"]', commentText);
    await page.click('button:has-text("Add"):not([disabled])');
    await expect(page.locator(`text=${commentText}`)).toBeVisible();
    
    // Close gallery
    await page.click('button:has-text("✕")');
    
    // Gallery should be closed
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible();
    
    // Reopen gallery
    await page.locator('img[alt*="test-image"]').first().click();
    await expect(page.locator('.fixed.inset-0')).toBeVisible();
    
    // Expand comments
    if (await page.locator('button:has-text("Show")').isVisible()) {
      await page.click('button:has-text("Show")');
    }
    
    // Previous comment should still be there
    await expect(page.locator(`text=${commentText}`)).toBeVisible();
    
    // Should be able to add new comments
    const newCommentText = 'New comment after reopen';
    await page.fill('input[placeholder*="Add a comment"]', newCommentText);
    await page.click('button:has-text("Add"):not([disabled])');
    await expect(page.locator(`text=${newCommentText}`)).toBeVisible();
  });

  test('should handle loading states appropriately', async ({ page }) => {
    // Open gallery
    await page.locator('img[alt*="test-image"]').first().click();
    if (await page.locator('button:has-text("Show")').isVisible()) {
      await page.click('button:has-text("Show")');
    }
    
    await expect(page.locator('input[placeholder*="Add a comment"]')).toBeVisible();
    
    // Type comment
    const commentText = 'Loading state test';
    await page.fill('input[placeholder*="Add a comment"]', commentText);
    
    // Click Add button and immediately check for loading state
    await page.click('button:has-text("Add"):not([disabled])');
    
    // Button should briefly show loading state (if implemented)
    // Note: This might be too fast to catch reliably, but we can check it doesn't break
    
    // Comment should eventually appear
    await expect(page.locator(`text=${commentText}`)).toBeVisible();
    
    // Input should be cleared and button disabled
    await expect(page.locator('input[placeholder*="Add a comment"]')).toHaveValue('');
    await expect(page.locator('button:has-text("Add")[disabled]')).toBeVisible();
  });
});