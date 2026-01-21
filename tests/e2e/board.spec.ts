import { test, expect } from '@playwright/test';

test.describe('Board Interaction', () => {
	const timestamp = Date.now();
	const email = `test-${timestamp}@example.com`;
	const password = 'password123';

	test('User can create board, columns, tasks and drag them', async ({ page }) => {
		// 1. Register
		await page.goto('/boards');
		
		// Wait for initial load
		await page.waitForTimeout(1000);

		// Handle Auth
		if (await page.getByPlaceholder('Name').isVisible()) {
			await page.getByPlaceholder('Name').fill('Test User');
			await page.getByPlaceholder('Email').fill(email);
			await page.getByPlaceholder('Password').fill(password);
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
		} else if (await page.getByText("Don't have an account? Sign up").isVisible()) {
			await page.getByText("Don't have an account? Sign up").click();
			await page.getByPlaceholder('Name').fill('Test User');
			await page.getByPlaceholder('Email').fill(email);
			await page.getByPlaceholder('Password').fill(password);
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
		}
		
		await expect(page.getByText('My Boards')).toBeVisible({ timeout: 10000 });

		// 2. Create Board
		await page.getByPlaceholder('Add a new board...').fill('DnD Board');
		await page.getByPlaceholder('Add a new board...').press('Enter');
		await expect(page.getByText('DnD Board')).toBeVisible();
		await page.getByText('DnD Board').click();

        // Wait for board to load
        await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: 15000 });

		// 3. Create Columns
		await page.getByPlaceholder('+ Add a group').fill('Todo');
		await page.getByPlaceholder('+ Add a group').press('Enter');
		// Wait for Todo to be persisted and rendered
		await expect(page.getByText('Todo').first()).toBeVisible();

		await page.getByPlaceholder('+ Add a group').fill('Done');
		await page.getByPlaceholder('+ Add a group').press('Enter');
		await expect(page.getByText('Done').first()).toBeVisible();
		
		// 4. Create Task
		const todoColumn = page.locator('[data-role="column"]', { hasText: 'Todo' }).first();
		await todoColumn.getByRole('button', { name: 'New' }).click();
		await page.getByPlaceholder('What needs to be done?').fill('Draggable Task');
		await page.keyboard.press('Enter');
		
		// Wait for task creation
		await expect(page.getByText('Draggable Task')).toBeVisible();

		// 5. Drag Task Todo -> Done
		const task = page.locator('[data-role="card"]', { hasText: 'Draggable Task' }).first();
		const doneColumn = page.locator('[data-role="column"]', { hasText: 'Done' }).first();
		
		// Manual drag to ensure custom DnD handlers trigger
        const box = await task.boundingBox();
        const targetBox = await doneColumn.boundingBox();
        if (!box || !targetBox) throw new Error('Element bounds not found');

        // Start drag
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        // Move small distance to trigger drag start threshold (> 5px)
        await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10, { steps: 5 });
        await page.waitForTimeout(100); // Wait for state update
        
        // Move to target
        await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 });
        await page.waitForTimeout(100); // Wait for hover detection
        
        // Drop
        await page.mouse.up();

		// Verify it moved - check that Done column now contains the task
		await page.waitForTimeout(1000);
		await expect(doneColumn.locator('[data-role="card"]', { hasText: 'Draggable Task' })).toBeVisible();
	});
});
