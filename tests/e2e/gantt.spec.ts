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
		await page.getByText('Task 1').click();
		await page.getByRole('button', { name: 'Dates' }).click();
		// Set today as start, tomorrow as due (simple enough)
		// For simplicity in test, let's just use the 'Today' button in a date picker if it exists
		// Actually, let's just use the current date string
		const today = new Date().toISOString().split('T')[0];
		await page.locator('input[type="date"]').first().fill(today);
		await page.locator('input[type="date"]').last().fill(today);
		await page.keyboard.press('Escape');

		// 3. Switch to Gantt View
		await page.getByTitle('Gantt View').click();
		await expect(page.getByText('Tasks')).toBeVisible();
		
		// 4. Verify Task 1 is scheduled
		const taskBar1 = page.locator('[data-role="task-bar"]', { hasText: 'Task 1' });
		await expect(taskBar1).toBeVisible();

		// 5. Verify Task 2 is unscheduled
		const unscheduledSection = page.getByText('Unscheduled');
		await expect(unscheduledSection).toBeVisible();
		await expect(page.locator('.bg-canvas', { hasText: 'Task 2' })).toBeVisible();

		// 6. Drag Task 2 to timeline
		const task2 = page.getByText('Task 2').last();
		const dayCell = page.locator('[data-role="day-cell"]').first();
		
		const t2Box = await task2.boundingBox();
		const cellBox = await dayCell.boundingBox();
		if (!t2Box || !cellBox) throw new Error('Bounds not found');

		await page.mouse.move(t2Box.x + t2Box.width / 2, t2Box.y + t2Box.height / 2);
		await page.mouse.down();
		await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2, { steps: 10 });
		await page.mouse.up();

		// Task 2 should now be on the timeline
		await expect(page.locator('[data-role="task-bar"]', { hasText: 'Task 2' })).toBeVisible();

		// 7. Create dependency (T1 -> T2)
		const t1Bar = page.locator('[data-role="task-bar"]', { hasText: 'Task 1' });
		const t2Bar = page.locator('[data-role="task-bar"]', { hasText: 'Task 2' });
		
		const t1Box = await t1Bar.boundingBox();
		const t2BoxFinal = await t2Bar.boundingBox();
		if (!t1Box || !t2BoxFinal) throw new Error('Task bar bounds not found');

		// Connector handle is on the right edge
		await page.mouse.move(t1Box.x + t1Box.width - 2, t1Box.y + t1Box.height / 2);
		await page.mouse.down();
		await page.mouse.move(t2BoxFinal.x + 10, t2BoxFinal.y + t2BoxFinal.height / 2, { steps: 10 });
		await page.mouse.up();

		// Verify dependency line exists (it's a path in an SVG)
		await expect(page.locator('svg path.opacity-30')).toBeVisible();

		// 8. Delete dependency
		await page.locator('g.group\\/dep').hover();
		await page.getByRole('button').locator('svg').click(); // Click the X button
		await expect(page.locator('svg path.opacity-30')).not.toBeVisible();
	});
});
