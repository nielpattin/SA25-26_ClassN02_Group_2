import { test, expect } from '@playwright/test';

test.describe('Mentions Feature', () => {
	const timestamp = Date.now();
	const email = `mention-test-${timestamp}@example.com`;
	const password = 'password123';
	const userName = 'MentionUser';

	test('User can mention themselves in a comment', async ({ page }) => {
        test.slow(); 
        
		// 1. Register
		await page.goto('/boards');
		await page.waitForTimeout(1000);

		// Handle Auth
		const nameInput = page.getByPlaceholder('Name');
		if (await nameInput.isVisible()) {
			await nameInput.fill(userName);
			await page.getByPlaceholder('Email').fill(email);
			await page.getByPlaceholder('Password').fill(password);
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
		} else if (await page.getByText("Don't have an account? Sign up").isVisible()) {
			await page.getByText("Don't have an account? Sign up").click();
			await page.getByPlaceholder('Name').fill(userName);
			await page.getByPlaceholder('Email').fill(email);
			await page.getByPlaceholder('Password').fill(password);
			await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
		}
		
		await expect(page.getByText('My Boards')).toBeVisible({ timeout: 15000 });

		// 2. Create Board
		await page.getByPlaceholder('Add a new board...').fill('Mentions Board');
		await page.getByPlaceholder('Add a new board...').press('Enter');
		await expect(page.getByText('Mentions Board')).toBeVisible();
		await page.getByText('Mentions Board').click();

        // Wait for board to load
        await expect(page.getByText('Loading workspace...')).not.toBeVisible({ timeout: 15000 });

		// 3. Create Column & Task
		await page.getByPlaceholder('+ Add a group').fill('General');
		await page.getByPlaceholder('+ Add a group').press('Enter');
		await expect(page.getByText('General').first()).toBeVisible();

		const column = page.locator('[data-role="column"]', { hasText: 'General' }).first();
		await column.getByRole('button', { name: 'New' }).click();
		await page.getByPlaceholder('What needs to be done?').fill('Task with Mention');
		await page.keyboard.press('Enter');
		
		await expect(page.getByText('Task with Mention')).toBeVisible();
        
        // 4. Open Task
        await page.getByText('Task with Mention').click();
        
        // Wait for modal to be visible
        await expect(page.getByRole('heading', { name: 'Description' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible();

        // 5. Type Mention
        const commentInput = page.getByPlaceholder('Write a comment...');
        await commentInput.click();
        await commentInput.fill('Hey ');
        await commentInput.type('@Men'); 

        // 6. Verify Picker & Select
        // Wait for picker to be visible (target the one in the picker portal)
        const pickerItem = page.locator('.z-20000').getByText(userName, { exact: true });
        await expect(pickerItem).toBeVisible();
        
        // Ensure input is focused and wait for listeners
        await commentInput.focus();
        await page.waitForTimeout(500);
        
        // Navigate and select
        await commentInput.press('ArrowDown'); 
        await page.waitForTimeout(100);
        await commentInput.press('Enter');

        // Wait for the mention to be applied to the input
        await expect(commentInput).toHaveValue(new RegExp(`Hey @\\[${userName}\\]\\(.*\\)`));

        // 7. Post Comment
        await page.getByRole('button', { name: 'Comment' }).click();

        // 8. Verify Rendered Mention
        const commentBody = page.locator('.wrap-break-word').last(); 
        await expect(commentBody).toContainText(`Hey @${userName}`);
        
        // Verify the mention link style
        const mentionLink = commentBody.locator('span').filter({ hasText: `@${userName}` });
        await expect(mentionLink).toBeVisible();
	});
});
