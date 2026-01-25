import { test, expect } from '@playwright/test'

test.describe('Account Recovery Hub', () => {
	const timestamp = Date.now()
	const email = `recovery-${timestamp}@example.com`
	const password = 'Password123!'

	test('User with deleted account sees recovery hub instead of dashboard', async ({ page, request }) => {
		// 1. Register a new user
		await page.goto('/boards')
		await page.waitForTimeout(1000)

		if (await page.getByPlaceholder('Name').isVisible()) {
			await page.getByPlaceholder('Name').fill('Recovery Test')
			await page.getByPlaceholder('Email').fill(email)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
		} else if (await page.getByText("Don't have an account? Sign up").isVisible()) {
			await page.getByText("Don't have an account? Sign up").click()
			await page.getByPlaceholder('Name').fill('Recovery Test')
			await page.getByPlaceholder('Email').fill(email)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
		}

		// Wait for dashboard to load
		await expect(page.getByText('My Boards')).toBeVisible({ timeout: 10000 })

		// 2. Go to settings and delete account
		await page.goto('/settings/account')
		await expect(page.getByText('Delete Account')).toBeVisible({ timeout: 10000 })

		// Click delete button to open modal
		await page.getByRole('button', { name: /Delete Account/i }).click()

		// Fill password and confirm deletion
		await expect(page.getByText('This action cannot be undone')).toBeVisible()
		await page.getByPlaceholder('Enter your password').fill(password)
		await page.getByRole('button', { name: 'Delete Account', exact: true }).click()

		// Should be redirected to landing page after deletion
		await expect(page).toHaveURL('/', { timeout: 10000 })

		// 3. Login again - should see recovery hub
		await page.goto('/boards')
		await page.waitForTimeout(1000)

		// Login with deleted account credentials
		if (await page.getByPlaceholder('Email').isVisible()) {
			await page.getByPlaceholder('Email').fill(email)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign In', exact: true }).click()
		}

		// Should be redirected to recovery hub, not dashboard
		await expect(page.getByText('Account Recovery')).toBeVisible({ timeout: 10000 })
		await expect(page.getByText('Deletion Scheduled')).toBeVisible()

		// 4. Verify recovery hub buttons are visible
		await expect(page.getByText('Keep My Account')).toBeVisible()
		await expect(page.getByText('Download My Data')).toBeVisible()
		await expect(page.getByText('Sign Out')).toBeVisible()
	})

	test('Keep My Account restores access and signs out', async ({ page }) => {
		const restoreEmail = `restore-${Date.now()}@example.com`

		// 1. Register
		await page.goto('/boards')
		await page.waitForTimeout(1000)

		if (await page.getByPlaceholder('Name').isVisible()) {
			await page.getByPlaceholder('Name').fill('Restore Test')
			await page.getByPlaceholder('Email').fill(restoreEmail)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
		} else if (await page.getByText("Don't have an account? Sign up").isVisible()) {
			await page.getByText("Don't have an account? Sign up").click()
			await page.getByPlaceholder('Name').fill('Restore Test')
			await page.getByPlaceholder('Email').fill(restoreEmail)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
		}

		await expect(page.getByText('My Boards')).toBeVisible({ timeout: 10000 })

		// 2. Delete account
		await page.goto('/settings/account')
		await expect(page.getByText('Delete Account')).toBeVisible({ timeout: 10000 })
		await page.getByRole('button', { name: /Delete Account/i }).click()
		await expect(page.getByText('This action cannot be undone')).toBeVisible()
		await page.getByPlaceholder('Enter your password').fill(password)
		await page.getByRole('button', { name: 'Delete Account', exact: true }).click()
		await expect(page).toHaveURL('/', { timeout: 10000 })

		// 3. Login again
		await page.goto('/boards')
		await page.waitForTimeout(1000)

		if (await page.getByPlaceholder('Email').isVisible()) {
			await page.getByPlaceholder('Email').fill(restoreEmail)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign In', exact: true }).click()
		}

		// Should see recovery hub
		await expect(page.getByText('Account Recovery')).toBeVisible({ timeout: 10000 })

		// 4. Click Keep My Account - should sign out and redirect to landing
		await page.getByText('Keep My Account').click()
		await expect(page).toHaveURL('/', { timeout: 10000 })

		// 5. Login again - should now access dashboard normally
		await page.goto('/boards')
		await page.waitForTimeout(1000)

		if (await page.getByPlaceholder('Email').isVisible()) {
			await page.getByPlaceholder('Email').fill(restoreEmail)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign In', exact: true }).click()
		}

		// Should go to dashboard, not recovery hub
		await expect(page.getByText('My Boards')).toBeVisible({ timeout: 10000 })
		await expect(page.getByText('Account Recovery')).not.toBeVisible()
	})

	test('Logout from recovery hub keeps account deleted', async ({ page }) => {
		const logoutEmail = `logout-${Date.now()}@example.com`

		// 1. Register
		await page.goto('/boards')
		await page.waitForTimeout(1000)

		if (await page.getByPlaceholder('Name').isVisible()) {
			await page.getByPlaceholder('Name').fill('Logout Test')
			await page.getByPlaceholder('Email').fill(logoutEmail)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
		} else if (await page.getByText("Don't have an account? Sign up").isVisible()) {
			await page.getByText("Don't have an account? Sign up").click()
			await page.getByPlaceholder('Name').fill('Logout Test')
			await page.getByPlaceholder('Email').fill(logoutEmail)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
		}

		await expect(page.getByText('My Boards')).toBeVisible({ timeout: 10000 })

		// 2. Delete account
		await page.goto('/settings/account')
		await expect(page.getByText('Delete Account')).toBeVisible({ timeout: 10000 })
		await page.getByRole('button', { name: /Delete Account/i }).click()
		await expect(page.getByText('This action cannot be undone')).toBeVisible()
		await page.getByPlaceholder('Enter your password').fill(password)
		await page.getByRole('button', { name: 'Delete Account', exact: true }).click()
		await expect(page).toHaveURL('/', { timeout: 10000 })

		// 3. Login again
		await page.goto('/boards')
		await page.waitForTimeout(1000)

		if (await page.getByPlaceholder('Email').isVisible()) {
			await page.getByPlaceholder('Email').fill(logoutEmail)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign In', exact: true }).click()
		}

		await expect(page.getByText('Account Recovery')).toBeVisible({ timeout: 10000 })

		// 4. Click Sign Out
		await page.getByText('Sign Out').click()

		// Should be on landing page
		await expect(page).toHaveURL('/', { timeout: 10000 })

		// 5. Login again - should still see recovery hub (not restored)
		await page.goto('/boards')
		await page.waitForTimeout(1000)

		if (await page.getByPlaceholder('Email').isVisible()) {
			await page.getByPlaceholder('Email').fill(logoutEmail)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign In', exact: true }).click()
		}

		// Should still see recovery hub since account was not restored
		await expect(page.getByText('Account Recovery')).toBeVisible({ timeout: 10000 })
	})
})
