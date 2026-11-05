import { expect, test, type Page } from '@playwright/test';
import { asStaff, newMember } from '../support/api';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In to Your Account' }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

async function openTab(page: Page, name: string) {
  await page.goto('/member');
  await page.getByRole('button', { name }).click();
}

test('a member books a class with free seats', async ({ page }) => {
  const staff = await asStaff();
  const cls = await staff.createClass({ name: `Spin ${Date.now()}`, capacity: 5 });
  const member = await newMember('booker');

  await login(page, member.email, member.password);
  await openTab(page, 'Book Classes');

  const card = page.getByTestId(`class-${cls.name}`);
  await expect(card).toContainText('0/5');
  await card.getByRole('button', { name: 'Book Now' }).click();

  await expect(page.getByTestId('notice')).toHaveText(`Booked ${cls.name}.`);
  await expect(card.getByTestId('my-status')).toHaveText('Booked');
  await expect(card).toContainText('1/5');

  await page.getByRole('button', { name: 'My Bookings' }).click();
  await expect(page.getByTestId(`booking-${cls.name}`).getByTestId('booking-status')).toHaveText('Booked');

  await staff.dispose();
  await member.dispose();
});

test('a full class offers the waitlist, and a cancellation promotes the member', async ({ page }) => {
  const staff = await asStaff();
  const cls = await staff.createClass({ name: `HIIT ${Date.now()}`, capacity: 1 });
  const holder = await newMember('holder');
  const holderBooking = await holder.book(cls.id);
  const waiter = await newMember('waiter');

  await login(page, waiter.email, waiter.password);
  await openTab(page, 'Book Classes');

  const card = page.getByTestId(`class-${cls.name}`);
  await expect(card).toContainText('1/1');
  await card.getByRole('button', { name: 'Join waitlist' }).click();
  await expect(page.getByTestId('notice')).toContainText('#1 on the waitlist');
  await expect(card.getByTestId('my-status')).toHaveText('Waitlist #1');

  // The member holding the seat cancels (through the API, as they would from their own phone).
  await holder.cancel(holderBooking.id);

  await openTab(page, 'My Bookings');
  await expect(page.getByTestId(`booking-${cls.name}`).getByTestId('booking-status')).toHaveText('Booked');

  await staff.dispose();
  await holder.dispose();
  await waiter.dispose();
});

test('a member leaves the waitlist', async ({ page }) => {
  const staff = await asStaff();
  const cls = await staff.createClass({ name: `Boxing ${Date.now()}`, capacity: 1 });
  const holder = await newMember('holder2');
  await holder.book(cls.id);
  const waiter = await newMember('leaver');

  await login(page, waiter.email, waiter.password);
  await openTab(page, 'Book Classes');
  await page.getByTestId(`class-${cls.name}`).getByRole('button', { name: 'Join waitlist' }).click();
  await expect(page.getByTestId('notice')).toContainText('#1 on the waitlist');

  await page.getByRole('button', { name: 'My Bookings' }).click();
  const booking = page.getByTestId(`booking-${cls.name}`);
  await booking.getByRole('button', { name: 'Leave waitlist' }).click();
  await expect(page.getByTestId('notice')).toHaveText('You left the waitlist.');
  await expect(booking.getByTestId('booking-status')).toHaveText('Cancelled');

  await staff.dispose();
  await holder.dispose();
  await waiter.dispose();
});
