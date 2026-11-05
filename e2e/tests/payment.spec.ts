import { expect, test } from '@playwright/test';
import { newMember, sendVnpayIpn } from '../support/api';

test('buying a membership: VNPay checkout, IPN, membership active', async ({ page, context }) => {
  const member = await newMember('payer');

  // VNPay's sandbox is not part of the test: answer its checkout page locally.
  await context.route('https://sandbox.vnpayment.vn/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>VNPay sandbox (stub)</h1>' }),
  );

  await page.goto('/login');
  await page.locator('#email').fill(member.email);
  await page.locator('#password').fill(member.password);
  await page.getByRole('button', { name: 'Sign In to Your Account' }).click();
  await page.waitForURL((url) => url.pathname === '/');

  // The pricing card opens the signed VNPay URL in a new tab.
  const popupPromise = page.waitForEvent('popup');
  await page.locator('#pricing').getByRole('button', { name: 'Get Started' }).first().click();
  const popup = await popupPromise;
  // opened with noopener, so it starts at about:blank and then navigates
  await popup.waitForURL(/sandbox\.vnpayment\.vn/);
  const paymentUrl = popup.url();
  expect(new URL(paymentUrl).searchParams.get('vnp_Amount')).toBe('50000000'); // 500,000 VND x 100
  await popup.close();

  // Before VNPay confirms, the membership is only pending.
  await page.goto('/member');
  await page.getByRole('button', { name: 'Memberships' }).click();
  await expect(page.getByTestId('subscription-status')).toHaveText('pending');

  // VNPay's server calls our IPN; replaying it changes nothing.
  expect(await sendVnpayIpn(paymentUrl)).toMatchObject({ RspCode: '00' });
  expect(await sendVnpayIpn(paymentUrl)).toMatchObject({ RspCode: '02' });

  await page.reload();
  await page.getByRole('button', { name: 'Memberships' }).click();
  await expect(page.getByTestId('subscription-status')).toHaveText('active');
  await expect(page.getByTestId('subscription')).toContainText('Basic 1 Month');

  await member.dispose();
});
