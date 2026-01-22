import { test, expect } from '@playwright/test'

test.describe('Search - #label operator', () => {
	const timestamp = Date.now()
	const email = `search-label-${timestamp}@example.com`
	const password = 'password123'

	test('User can search tasks by label', async ({ page }) => {
		await page.goto('/boards')
		await page.waitForTimeout(1000)

		if (await page.getByPlaceholder('Name').isVisible()) {
			await page.getByPlaceholder('Name').fill('Label Test User')
			await page.getByPlaceholder('Email').fill(email)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
		} else if (await page.getByText("Don't have an account? Sign up").isVisible()) {
			await page.getByText("Don't have an account? Sign up").click()
			await page.getByPlaceholder('Name').fill('Label Test User')
			await page.getByPlaceholder('Email').fill(email)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
		}

		await expect(page.getByText('My Boards')).toBeVisible({ timeout: 10000 })

		await page.getByPlaceholder('Add a new board...').fill('Label Search Board')
		await page.getByPlaceholder('Add a new board...').press('Enter')
		await expect(page.getByText('Label Search Board')).toBeVisible()
		await page.getByText('Label Search Board').click()

		await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: 15000 })

		await page.getByPlaceholder('+ Add a group').fill('Backlog')
		await page.getByPlaceholder('+ Add a group').press('Enter')
		await expect(page.getByText('Backlog').first()).toBeVisible()

		const backlogColumn = page.locator('[data-role="column"]', { hasText: 'Backlog' }).first()
		await backlogColumn.getByRole('button', { name: 'New' }).click()
		await page.getByPlaceholder('What needs to be done?').fill('API integration task')
		await page.keyboard.press('Enter')
		await expect(page.getByText('API integration task')).toBeVisible()

		await backlogColumn.getByRole('button', { name: 'New' }).click()
		await page.getByPlaceholder('What needs to be done?').fill('Frontend styling task')
		await page.keyboard.press('Enter')
		await expect(page.getByText('Frontend styling task')).toBeVisible()

		await page.keyboard.press('Control+k')
		await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

		await page.locator('[role="dialog"] input').fill('API')
		await page.waitForTimeout(500)
		await expect(page.locator('[role="dialog"]').getByText('API integration task')).toBeVisible()

		await page.keyboard.press('Escape')
	})
})

test.describe('Search - due: operator', () => {
	const timestamp = Date.now()
	const email = `search-due-${timestamp}@example.com`
	const password = 'password123'

	test('User can search tasks by due date with due:overdue', async ({ page }) => {
		await page.goto('/boards')
		await page.waitForTimeout(1000)

		if (await page.getByPlaceholder('Name').isVisible()) {
			await page.getByPlaceholder('Name').fill('Due Test User')
			await page.getByPlaceholder('Email').fill(email)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
		} else if (await page.getByText("Don't have an account? Sign up").isVisible()) {
			await page.getByText("Don't have an account? Sign up").click()
			await page.getByPlaceholder('Name').fill('Due Test User')
			await page.getByPlaceholder('Email').fill(email)
			await page.getByPlaceholder('Password').fill(password)
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
		}

		await expect(page.getByText('My Boards')).toBeVisible({ timeout: 10000 })

		await page.getByPlaceholder('Add a new board...').fill('Due Search Board')
		await page.getByPlaceholder('Add a new board...').press('Enter')
		await expect(page.getByText('Due Search Board')).toBeVisible()
		await page.getByText('Due Search Board').click()

		await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: 15000 })

		await page.getByPlaceholder('+ Add a group').fill('Tasks')
		await page.getByPlaceholder('+ Add a group').press('Enter')
		await expect(page.getByText('Tasks').first()).toBeVisible()

		const tasksColumn = page.locator('[data-role="column"]', { hasText: 'Tasks' }).first()
		await tasksColumn.getByRole('button', { name: 'New' }).click()
		await page.getByPlaceholder('What needs to be done?').fill('Overdue task for search')
		await page.keyboard.press('Enter')
		await expect(page.getByText('Overdue task for search')).toBeVisible()

		await page.keyboard.press('Control+k')
		await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

		await page.locator('[role="dialog"] input').fill('due:today')
		await page.waitForTimeout(500)

		await page.keyboard.press('Escape')
	})
})
