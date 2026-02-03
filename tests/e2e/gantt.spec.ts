import { test, expect } from '@playwright/test';

test.describe('Gantt View Interaction', () => {
	const timestamp = Date.now();
	const email = `test-gantt-${timestamp}@example.com`;
	const password = 'password123';

	test.beforeEach(async ({ page }) => {
		// Register and Login
		await page.goto('/boards');
		await page.waitForTimeout(1000);

		if (await page.getByPlaceholder('Name').isVisible()) {
			await page.getByPlaceholder('Name').fill('Gantt User');
			await page.getByPlaceholder('Email').fill(email);
			await page.getByPlaceholder('Password').fill(password);
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
		} else if (await page.getByText("Don't have an account? Sign up").isVisible()) {
			await page.getByText("Don't have an account? Sign up").click();
			await page.getByPlaceholder('Name').fill('Gantt User');
			await page.getByPlaceholder('Email').fill(email);
			await page.getByPlaceholder('Password').fill(password);
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
		}
		
		await expect(page.getByText('My Boards')).toBeVisible({ timeout: 10000 });

		// Create Board
		await page.getByPlaceholder('Add a new board...').fill('Gantt Board');
		await page.getByPlaceholder('Add a new board...').press('Enter');
		await page.getByText('Gantt Board').click();

        // Wait for board to load
        await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: 15000 });

		// Create Column
		await page.getByPlaceholder('+ Add a group').fill('Gantt Tasks');
		await page.getByPlaceholder('+ Add a group').press('Enter');
		await expect(page.getByText('Gantt Tasks').first()).toBeVisible();
	});

	test('User can switch to Gantt view and interact with tasks', async ({ page }) => {
		// 1. Create two tasks
		const column = page.locator('[data-role="column"]', { hasText: 'Gantt Tasks' }).first();
		
		await column.getByRole('button', { name: 'New' }).click();
		await page.getByPlaceholder('What needs to be done?').fill('Task 1');
		await page.keyboard.press('Enter');
		await expect(page.getByText('Task 1')).toBeVisible();

		await column.getByRole('button', { name: 'New' }).click();
		await page.getByPlaceholder('What needs to be done?').fill('Task 2');
		await page.keyboard.press('Enter');
		await expect(page.getByText('Task 2')).toBeVisible();

		// 2. Set dates for Task 1 to make it appear on timeline
		await page.getByText('Task 1').click()
		await expect(page.getByText('Dates')).toBeVisible()
		const today = new Date()
		const todayStr = today.toISOString().split('T')[0]

		const startButton = page.getByRole('button', { name: 'Start + Add' })
		await startButton.click()
		const startInput = page.locator('input[type=date]')
		await expect(startInput).toBeVisible()
		await startInput.fill(todayStr)
		await page.getByRole('button', { name: 'Save' }).click()

		const dueButton = page.getByRole('button', { name: 'Due + Add' })
		await dueButton.click()
		const dueInput = page.locator('input[type=date]')
		await expect(dueInput).toBeVisible()
		await dueInput.fill(todayStr)
		await page.getByRole('button', { name: 'Save' }).click()

		const modalOverlay = page.locator('div.fixed.inset-0').first()
		const taskModal = page.locator('div.shadow-brutal-xl').first()
		await modalOverlay.click({ position: { x: 10, y: 10 } })
		await expect(taskModal).toHaveCount(0)

		// 3. Switch to Gantt View
		await page.getByTitle('Gantt View').click()
		const timeline = page.locator('.gantt-timeline-content')
		await expect(timeline).toBeVisible()
		await expect(timeline.getByText('Task 1')).toBeVisible()
		await expect(page.getByText('Task 2')).toBeVisible()
	});

});
