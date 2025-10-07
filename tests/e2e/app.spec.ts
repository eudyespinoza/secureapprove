import { test, expect } from '@playwright/test';

test.describe('SecureApprove E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Authentication Flow', () => {
    test('should display login page', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('SecureApprove');
      await expect(page.locator('text=Sign in with WebAuthn')).toBeVisible();
    });

    test('should show WebAuthn registration flow for new user', async ({ page }) => {
      // Mock WebAuthn API
      await page.addInitScript(() => {
        // Mock navigator.credentials.create
        Object.defineProperty(navigator, 'credentials', {
          value: {
            create: async () => ({
              id: 'mock-credential-id',
              rawId: new ArrayBuffer(32),
              response: {
                clientDataJSON: new ArrayBuffer(100),
                attestationObject: new ArrayBuffer(200),
              },
              type: 'public-key',
            }),
            get: async () => ({
              id: 'mock-credential-id',
              rawId: new ArrayBuffer(32),
              response: {
                clientDataJSON: new ArrayBuffer(100),
                authenticatorData: new ArrayBuffer(150),
                signature: new ArrayBuffer(64),
                userHandle: new ArrayBuffer(16),
              },
              type: 'public-key',
            }),
          },
        });
      });

      // Click register button
      await page.click('text=Register New Device');
      
      // Fill registration form
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="name"]', 'Test User');
      
      // Submit registration
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should authenticate existing user', async ({ page }) => {
      // Mock existing user authentication
      await page.addInitScript(() => {
        localStorage.setItem('hasWebAuthnCredential', 'true');
      });

      await page.click('text=Sign in with WebAuthn');
      
      // Should redirect to dashboard after successful auth
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Request Management', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('authToken', 'mock-jwt-token');
      });
      
      await page.goto('/requests');
    });

    test('should display requests list', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Requests');
      await expect(page.locator('[data-testid="requests-table"]')).toBeVisible();
    });

    test('should filter requests by status', async ({ page }) => {
      // Click status filter
      await page.click('[data-testid="status-filter"]');
      await page.click('text=Pending');
      
      // Should show only pending requests
      const requestRows = page.locator('[data-testid="request-row"]');
      await expect(requestRows).toHaveCount(3); // Assuming 3 pending requests
      
      // All visible requests should have pending status
      const statusBadges = page.locator('[data-testid="status-badge"]:visible');
      await expect(statusBadges).toHaveText(['Pending', 'Pending', 'Pending']);
    });

    test('should create new request', async ({ page }) => {
      await page.click('text=New Request');
      
      // Fill request form
      await page.fill('input[name="title"]', 'Test Request');
      await page.fill('textarea[name="description"]', 'This is a test request');
      await page.selectOption('select[name="priority"]', 'high');
      
      // Add approver
      await page.click('text=Add Approver');
      await page.fill('input[name="approver-email"]', 'approver@example.com');
      await page.click('text=Add');
      
      // Submit request
      await page.click('button[type="submit"]');
      
      // Should redirect back to requests list
      await expect(page).toHaveURL(/\/requests/);
      
      // Should show success message
      await expect(page.locator('.toast-success')).toContainText('Request created successfully');
    });

    test('should approve request with WebAuthn', async ({ page }) => {
      // Click on first request
      await page.click('[data-testid="request-row"]:first-child');
      
      // Should show request details
      await expect(page.locator('h1')).toContainText('Request Details');
      
      // Click approve button
      await page.click('text=Approve');
      
      // Should trigger WebAuthn authentication
      await expect(page.locator('.webauthn-modal')).toBeVisible();
      
      // Mock WebAuthn success
      await page.click('text=Authenticate');
      
      // Should show success and update status
      await expect(page.locator('.toast-success')).toContainText('Request approved successfully');
      await expect(page.locator('[data-testid="status-badge"]')).toContainText('Approved');
    });

    test('should reject request with reason', async ({ page }) => {
      // Click on first request
      await page.click('[data-testid="request-row"]:first-child');
      
      // Click reject button
      await page.click('text=Reject');
      
      // Fill rejection reason
      await page.fill('textarea[name="rejection-reason"]', 'Insufficient documentation');
      
      // Confirm rejection
      await page.click('text=Confirm Rejection');
      
      // Should show success and update status
      await expect(page.locator('.toast-success')).toContainText('Request rejected');
      await expect(page.locator('[data-testid="status-badge"]')).toContainText('Rejected');
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('authToken', 'mock-jwt-token');
      });
      
      await page.goto('/dashboard');
    });

    test('should display dashboard statistics', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Dashboard');
      
      // Check stats cards
      await expect(page.locator('[data-testid="total-requests"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-requests"]')).toBeVisible();
      await expect(page.locator('[data-testid="approved-requests"]')).toBeVisible();
      await expect(page.locator('[data-testid="rejected-requests"]')).toBeVisible();
    });

    test('should display recent activity', async ({ page }) => {
      await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
      
      const activityItems = page.locator('[data-testid="activity-item"]');
      await expect(activityItems).toHaveCountGreaterThan(0);
    });

    test('should navigate to requests from dashboard', async ({ page }) => {
      await page.click('text=View All Requests');
      await expect(page).toHaveURL(/\/requests/);
    });
  });

  test.describe('Notifications', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('authToken', 'mock-jwt-token');
      });
      
      await page.goto('/notifications');
    });

    test('should display notifications list', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Notifications');
      await expect(page.locator('[data-testid="notifications-list"]')).toBeVisible();
    });

    test('should mark notification as read', async ({ page }) => {
      const firstNotification = page.locator('[data-testid="notification-item"]:first-child');
      
      // Should be unread initially
      await expect(firstNotification).toHaveClass(/unread/);
      
      // Click to mark as read
      await firstNotification.click();
      
      // Should be marked as read
      await expect(firstNotification).not.toHaveClass(/unread/);
    });

    test('should enable push notifications', async ({ page }) => {
      // Mock Notification API
      await page.addInitScript(() => {
        Object.defineProperty(window, 'Notification', {
          value: {
            permission: 'default',
            requestPermission: async () => 'granted',
          },
        });
      });

      await page.click('text=Enable Push Notifications');
      
      // Should show success message
      await expect(page.locator('.toast-success')).toContainText('Push notifications enabled');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/requests');
      
      // Tab through navigation
      await page.press('body', 'Tab');
      await page.press('body', 'Tab');
      await page.press('body', 'Tab');
      
      // Should focus on new request button
      await expect(page.locator('text=New Request')).toBeFocused();
      
      // Press Enter to activate
      await page.press('text=New Request', 'Enter');
      
      // Should open new request modal
      await expect(page.locator('[data-testid="new-request-modal"]')).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/requests');
      
      // Check main navigation has labels
      await expect(page.locator('nav')).toHaveAttribute('aria-label', 'Main navigation');
      
      // Check table has proper labels
      await expect(page.locator('[data-testid="requests-table"]')).toHaveAttribute('aria-label', 'Requests table');
      
      // Check status badges have labels
      const statusBadges = page.locator('[data-testid="status-badge"]');
      for (let i = 0; i < await statusBadges.count(); i++) {
        await expect(statusBadges.nth(i)).toHaveAttribute('aria-label');
      }
    });
  });

  test.describe('Performance', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock large dataset
      await page.route('/api/requests', (route) => {
        const requests = Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          title: `Request ${i + 1}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }));
        
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ requests, total: 1000 }),
        });
      });

      await page.goto('/requests');
      
      // Should render efficiently with pagination
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
      await expect(page.locator('[data-testid="request-row"]')).toHaveCount(25); // Default page size
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('/api/requests', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/requests');
      
      // Should show error message
      await expect(page.locator('.error-message')).toContainText('Failed to load requests');
      
      // Should show retry button
      await expect(page.locator('text=Retry')).toBeVisible();
    });

    test('should handle network errors', async ({ page }) => {
      // Simulate network failure
      await page.setOffline(true);
      
      await page.goto('/requests');
      
      // Should show offline message
      await expect(page.locator('.offline-message')).toBeVisible();
      
      // Restore network
      await page.setOffline(false);
      await page.reload();
      
      // Should work normally
      await expect(page.locator('[data-testid="requests-table"]')).toBeVisible();
    });
  });
});