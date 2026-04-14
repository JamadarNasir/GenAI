// LoginPage.ts — Auto-generated Page Object for Login
// Smart Locator: 4-tier resolution (Snapshot → Pattern → LLM → Heal)
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { smartLocate, smartClick, smartFill, smartAssertVisible, smartAssertText } from '../support/smart-locator';

export class LoginPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // ── Locators ──

  get loginElement() {
    return this.page.getByRole('button', { name: 'Login' });
  }

  get applicationHttpsecommercePlaygroundlambdatestioElement() {
    return this.page.locator('application "https://ecommerce-playground.lambdatest.io"');
  }

  get emailIdInput() {
    return this.page.getByRole('textbox', { name: 'email id' });
  }

  get userPasswordTest123Button() {
    return this.page.getByText('user password - test@123');
  }

  get userVerifyUserCouldAbleLoginElement() {
    return this.page.getByText('user verify user could able login.');
  }

  get applicationShouldElement() {
    return this.page.getByText('application should');
  }

  get verifyTheElement() {
    return this.page.getByRole('button', { name: 'verify the' });
  }

  get userCouldAbleLoginButton() {
    return this.page.getByText('user could able login.');
  }

  // ── Actions ──

  async navigateTo(url: string = '/') {
    await this.page.goto(url);
  }

  async fillEmailId(value: string) {
    // Smart Locator: Snapshot → Pattern → LLM → Heal
    await smartFill(this.page, {"role":"textbox","name":"email id"}, value, { stepDescription: 'And user enter the email id jamadar.nasir@gmail.com' });
  }

  async clickUserPasswordTest123() {
    // Smart Locator: Snapshot → Pattern → LLM → Heal
    await smartClick(this.page, {"text":"user password - test@123"}, { stepDescription: 'When user password - test@123' });
  }

  async verifyUserVerifyUserCouldAbleLoginVisible() {
    // Smart Locator: Snapshot → Pattern → LLM → Heal
    await smartAssertVisible(this.page, {"text":"user verify user could able login."}, { stepDescription: 'Then user verify the user could able to login.' });
  }

  async clickUserCouldAbleLogin() {
    // Smart Locator: Snapshot → Pattern → LLM → Heal
    await smartClick(this.page, {"text":"user could able login."}, { stepDescription: 'When user could able to login.' });
  }

}
