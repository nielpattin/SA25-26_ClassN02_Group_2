import { test, expect } from '@playwright/test';

test.describe('Task Size', () => {
	const timestamp = Date.now();
	const email = `test-size-${timestamp}@example.com`;
	const password = 'password123';

	test.beforeEach(async ({ page }) => {
		// Register and login
		await page.goto('/boards');
		await page.waitForTimeout(1000);

		// Handle Auth - modal is already open showing login form
		// Click to switch to signup form
		await page.getByText("Don't have an account? Sign up").click();
		await page.waitForTimeout(500);

		// Fill in the signup form
		await page.getByPlaceholder('Name').fill('Test User');
		await page.getByPlaceholder('Email').fill(email);
		await page.getByPlaceholder('Password').fill(password);
		await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

		await expect(page.getByText('My Boards')).toBeVisible({ timeout: 10000 });
	});

	test('User can set size on task via TaskModal dropdown', async ({ page }) => {
		// Create board
		await page.getByPlaceholder('Add a new board...').fill('Size Test Board');
		await page.getByPlaceholder('Add a new board...').press('Enter');
		await expect(page.getByText('Size Test Board')).toBeVisible();
		await page.getByText('Size Test Board').click();

		// Wait for board to load
		await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: 15000 });

		// Create column
		await page.getByPlaceholder('+ Add a group').fill('Todo');
		await page.getByPlaceholder('+ Add a group').press('Enter');
		await expect(page.getByText('Todo').first()).toBeVisible();

		// Create task
		const todoColumn = page.locator('[data-role="column"]', { hasText: 'Todo' }).first();
		await todoColumn.getByRole('button', { name: 'New' }).click();
		await page.getByPlaceholder('What needs to be done?').fill('Size Test Task');
		await page.keyboard.press('Enter');
		await expect(page.getByText('Size Test Task')).toBeVisible();

		// Open task modal
		await page.getByText('Size Test Task').click();

		// Wait for modal to load
		await expect(page.getByRole('textbox').first()).toBeVisible();

		// Click Size button to open dropdown
		await page.getByRole('button', { name: 'Size' }).click();

		// Select 'M' size
		await page.getByRole('button', { name: 'M' }).click();

		// Close modal by clicking overlay
		await page.locator('div.fixed.inset-0').first().click();
		await page.waitForTimeout(500);

		// Verify size badge appears on card
		const taskCard = page.locator('[data-role="card"]', { hasText: 'Size Test Task' }).first();
		await expect(taskCard.getByText('M')).toBeVisible();
	});

	test('Size badge visible on TaskCard after setting', async ({ page }) => {
		// Create board
		await page.getByPlaceholder('Add a new board...').fill('Size Badge Board');
		await page.getByPlaceholder('Add a new board...').press('Enter');
		await expect(page.getByText('Size Badge Board')).toBeVisible();
		await page.getByText('Size Badge Board').click();

		// Wait for board to load
		await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: 15000 });

		// Create column
		await page.getByPlaceholder('+ Add a group').fill('In Progress');
		await page.getByPlaceholder('+ Add a group').press('Enter');
		await expect(page.getByText('In Progress').first()).toBeVisible();

		// Create task
		const column = page.locator('[data-role="column"]', { hasText: 'In Progress' }).first();
		await column.getByRole('button', { name: 'New' }).click();
		await page.getByPlaceholder('What needs to be done?').fill('Badge Test Task');
		await page.keyboard.press('Enter');
		await expect(page.getByText('Badge Test Task')).toBeVisible();

		// Open task modal
		await page.getByText('Badge Test Task').click();
		await expect(page.getByRole('textbox').first()).toBeVisible();

		// Set size to XL
		await page.getByRole('button', { name: 'Size' }).click();
		await page.getByRole('button', { name: 'XL' }).click();

		// Close modal
		await page.locator('div.fixed.inset-0').first().click();
		await page.waitForTimeout(500);

		// Verify XL badge is visible on the card
		const taskCard = page.locator('[data-role="card"]', { hasText: 'Badge Test Task' }).first();
		const sizeBadge = taskCard.getByText('XL');
		await expect(sizeBadge).toBeVisible();

		// Verify badge styling (white background with border)
		const badgeClasses = await sizeBadge.evaluate(el => el.className);
		expect(badgeClasses).toContain('bg-white');
		expect(badgeClasses).toContain('border');
	});

	test('User can clear size back to none', async ({ page }) => {
		// Create board
		await page.getByPlaceholder('Add a new board...').fill('Clear Size Board');
		await page.getByPlaceholder('Add a new board...').press('Enter');
		await expect(page.getByText('Clear Size Board')).toBeVisible();
		await page.getByText('Clear Size Board').click();

		// Wait for board to load
		await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: 15000 });

		// Create column
		await page.getByPlaceholder('+ Add a group').fill('Done');
		await page.getByPlaceholder('+ Add a group').press('Enter');
		await expect(page.getByText('Done').first()).toBeVisible();

		// Create task
		const column = page.locator('[data-role="column"]', { hasText: 'Done' }).first();
		await column.getByRole('button', { name: 'New' }).click();
		await page.getByPlaceholder('What needs to be done?').fill('Clear Size Task');
		await page.keyboard.press('Enter');
		await expect(page.getByText('Clear Size Task')).toBeVisible();

		// Open task modal
		await page.getByText('Clear Size Task').click();
		await expect(page.getByRole('textbox').first()).toBeVisible();

		// First set a size (S)
		await page.getByRole('button', { name: 'Size' }).click();
		await page.getByRole('button', { name: 'S', exact: true }).click();

		// Close modal
		await page.locator('div.fixed.inset-0').first().click();
		await page.waitForTimeout(500);

		// Verify size badge is visible
		const taskCard = page.locator('[data-role="card"]', { hasText: 'Clear Size Task' }).first();
		await expect(taskCard.getByText('S')).toBeVisible();

		// Reopen modal
		await page.getByText('Clear Size Task').click();
		await expect(page.getByRole('textbox').first()).toBeVisible();

		// Clear size by selecting 'None'
		await page.getByRole('button', { name: 'Size' }).click();
		await page.getByRole('button', { name: 'None' }).click();

		// Close modal
		await page.locator('div.fixed.inset-0').first().click();
		await page.waitForTimeout(500);

		// Verify size badge is no longer visible
		await expect(taskCard.getByText('S')).not.toBeVisible();
	});

	test('All size options are available in dropdown', async ({ page }) => {
		// Create board
		await page.getByPlaceholder('Add a new board...').fill('All Sizes Board');
		await page.getByPlaceholder('Add a new board...').press('Enter');
		await expect(page.getByText('All Sizes Board')).toBeVisible();
		await page.getByText('All Sizes Board').click();

		// Wait for board to load
		await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: 15000 });

		// Create column
		await page.getByPlaceholder('+ Add a group').fill('Test');
		await page.getByPlaceholder('+ Add a group').press('Enter');
		await expect(page.getByText('Test').first()).toBeVisible();

		// Create task
		const column = page.locator('[data-role="column"]', { hasText: 'Test' }).first();
		await column.getByRole('button', { name: 'New' }).click();
		await page.getByPlaceholder('What needs to be done?').fill('All Sizes Task');
		await page.keyboard.press('Enter');
		await expect(page.getByText('All Sizes Task')).toBeVisible();

		// Open task modal
		await page.getByText('All Sizes Task').click();
		await expect(page.getByRole('textbox').first()).toBeVisible();

		// Open size dropdown
		await page.getByRole('button', { name: 'Size' }).click();

		// Verify all size options are present
		await expect(page.getByRole('button', { name: 'None' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'XS' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'S', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'M' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'L' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'XL' })).toBeVisible();

		// Close modal
		await page.locator('div.fixed.inset-0').first().click();
	});
});
