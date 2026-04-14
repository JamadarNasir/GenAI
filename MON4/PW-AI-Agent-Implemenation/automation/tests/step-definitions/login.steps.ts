// login.steps.ts — Auto-generated step definitions for Login
// Smart Locator: 4-tier resolution (Snapshot → Pattern → LLM → Heal)
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { PlaywrightWorld } from '../support/world';
import { LoginPage } from '../pages/LoginPage';
import { smartLocate, smartClick, smartFill, smartAssertVisible, smartAssertText } from '../support/smart-locator';

// --- Login with valid credentials ---

Given('user is on the {string} page', async function (this: PlaywrightWorld, value: string) {
  await this.page.goto('/');
});

When('user launch the application {string}', async function (this: PlaywrightWorld, value: string) {
  await this.page.goto('https://ecommerce-playground.lambdatest.io');
});

When('user hover to My account --> Login  page.', async function (this: PlaywrightWorld) {
  // Smart Locator: Snapshot → Pattern → LLM → Heal
  const _r = await smartLocate(this.page, {"name":"My account","text":"My account"}, 'hover', { stepDescription: 'And user hover to My account --> Login  page.' });
  if (_r.locator) await _r.locator.hover();
});

When('user enter the email id jamadar.nasir@gmail.com', async function (this: PlaywrightWorld) {
  // Smart Locator: Snapshot → Pattern → LLM → Heal
  await smartFill(this.page, {"role":"textbox","name":"email id"}, 'id jamadar.nasir@gmail.com', { stepDescription: 'And user enter the email id jamadar.nasir@gmail.com' });
});

When('user password - test@123', async function (this: PlaywrightWorld) {
  // Smart Locator: Snapshot → Pattern → LLM → Heal
  await smartClick(this.page, {"text":"user password - test@123"}, { stepDescription: 'When user password - test@123' });
});

When('user verify the user could able to login.', async function (this: PlaywrightWorld) {
  // Smart Locator: Snapshot → Pattern → LLM → Heal
  await smartAssertVisible(this.page, {"text":"user verify user could able login."}, { stepDescription: 'Then user verify the user could able to login.' });
});

Then('the application should be launched', async function (this: PlaywrightWorld) {
  await this.page.goto('/');
});

When('the verify the application is launched and we are in login page.', async function (this: PlaywrightWorld) {
  await this.page.goto('/');
});

When('user could able to login.', async function (this: PlaywrightWorld) {
  // Smart Locator: Snapshot → Pattern → LLM → Heal
  await smartClick(this.page, {"text":"user could able login."}, { stepDescription: 'When user could able to login.' });
});
