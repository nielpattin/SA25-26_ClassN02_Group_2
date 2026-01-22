import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Notifications E2E', () => {
	const timestamp = Date.now();
	const emailA = `usera-${timestamp}@example.com`;
	const emailB = `userb-${timestamp}@example.com`;
	const password = 'password123';

	test('User A assigns task to User B, User B receives notification', async ({ browser }) => {
		test.slow();
		// 1. Register User A
		const contextA = await browser.newContext({ baseURL: 'http://localhost:5173' });
		const pageA = await contextA.newPage();
		await pageA.goto('/boards');
		await pageA.waitForTimeout(1000); // Allow hydration

		// Auth modal opens automatically if not logged in
		if (await pageA.getByPlaceholder('Name').isVisible()) {
			// Already in Sign Up mode
		} else if (await pageA.getByText("Don't have an account? Sign up").isVisible()) {
			await pageA.getByText("Don't have an account? Sign up").click();
		}
		
		await expect(pageA.getByPlaceholder('Name')).toBeVisible();

		await pageA.getByPlaceholder('Name').fill('User A');
		await pageA.getByPlaceholder('Email').fill(emailA);
		await pageA.getByPlaceholder('Password').fill(password);
		await pageA.getByRole('button', { name: 'Sign Up', exact: true }).click();

		// Wait for login
		await expect(pageA.getByText('My Boards')).toBeVisible();

		// 2. Register User B
		const contextB = await browser.newContext({ baseURL: 'http://localhost:5173' });
		const pageB = await contextB.newPage();
		await pageB.goto('/boards');
		await pageB.waitForTimeout(1000);

		if (await pageB.getByPlaceholder('Name').isVisible()) {
			// Already in Sign Up mode
		} else if (await pageB.getByText("Don't have an account? Sign up").isVisible()) {
			await pageB.getByText("Don't have an account? Sign up").click();
		}

		await expect(pageB.getByPlaceholder('Name')).toBeVisible();

		await pageB.getByPlaceholder('Name').fill('User B');
		await pageB.getByPlaceholder('Email').fill(emailB);
		await pageB.getByPlaceholder('Password').fill(password);
		await pageB.getByRole('button', { name: 'Sign Up', exact: true }).click();

		await expect(pageB.getByText('My Boards')).toBeVisible();

		// 3. DB Hack: Add B to A's workspace
		const output = execSync(`cd packages/server && bun run src/scripts/add-member.ts ${emailA} ${emailB}`, { encoding: 'utf-8' });
		const userBId = output.match(/UserB_ID:(.+)/)?.[1]?.trim();
		if (!userBId) throw new Error('Could not get User B ID');

		// 4. User A creates Board and Task
		await pageA.getByPlaceholder('Add a new board...').fill('Notif Board');
		await pageA.getByPlaceholder('Add a new board...').press('Enter');

		// Wait for board card to appear
		await expect(pageA.getByText('Notif Board')).toBeVisible();
		await pageA.getByText('Notif Board').click();

		// Get Board ID from URL
		const boardId = pageA.url().split('/').pop();

		// API Hack: Add B to Board
		const addRes = await pageA.request.post(`http://localhost:3000/v1/boards/${boardId}/members`, {
			data: { userId: userBId, role: 'member' }
		});
		console.log(`Add B to Board Status: ${addRes.status()}`);
		if (!addRes.ok()) console.log(await addRes.text());

		// Reload page to refresh members list
		await pageA.reload();
		await expect(pageA.getByText('Notif Board')).toBeVisible();

		// Create Column (if none)
		await pageA.getByPlaceholder('+ Add a group').fill('Todo');
		await pageA.getByPlaceholder('+ Add a group').press('Enter');
		await expect(pageA.getByText('Todo').first()).toBeVisible();

		// Create Task
		const todoColumn = pageA.locator('[data-role="column"]').first();
		await todoColumn.getByText('New').click();
		await pageA.getByPlaceholder('What needs to be done?').fill('Task for User B');
		await pageA.keyboard.press('Enter');

		// Open Task
		const taskCard = pageA.locator('[data-role="card"]', { hasText: 'Task for User B' });
		await expect(taskCard).toBeVisible();
		await taskCard.click();

		// Assign B
		const assignedHeader = pageA.getByRole('heading', { name: 'Assigned' });
		await assignedHeader.locator('xpath=..').getByRole('button').click();

		// Select B
		// Wait for the picker to load
		await expect(pageA.getByRole('button', { name: 'User B' })).toBeVisible();
		await pageA.getByRole('button', { name: 'User B' }).click();

		// Verify B is assigned
		await expect(pageA.getByText('User B', { exact: true })).toBeVisible();

		// 5. User B Checks Notification
		// B might need to reconnect WS or poll? Notification hook listens to WS.
		// If B is already on dashboard, WS should receive it.

		// Check bell
		const bell = pageB.locator('.lucide-bell').locator('xpath=..');
		await expect(bell).toBeVisible();

		// Wait for badge
		await expect(bell.locator('span')).toHaveText('1');
		await bell.click();

		// Verify content
		await expect(pageB.getByText('assigned you to "Task for User B"')).toBeVisible();
	});
});
