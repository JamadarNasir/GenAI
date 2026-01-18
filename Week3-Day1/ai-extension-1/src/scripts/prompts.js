/**
 * Collection of default prompts for different use cases (ICE POT Format)
 */
export const DEFAULT_PROMPTS = {
 
  /**
   * Selenium Java Page Object Prompt (No Test Class)
   */
  SELENIUM_JAVA_PAGE_ONLY: `
    Instructions:
    - Generate ONLY a Selenium Java Page Object Class (no test code).
    - Add JavaDoc for methods & class.
    - Use Selenium 2.30+ compatible imports.
    - Use meaningful method names.
    - Do NOT include explanations or test code.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`java
    package com.testleaf.pages;

    /**
     * Page Object for Component Page
     */
    public class ComponentPage {
        // Add methods as per the DOM
    }
    \`\`\`

    Persona:
    - Audience: Automation engineer focusing on maintainable POM structure.

    Output Format:
    - A single Java class inside a \`\`\`java\`\`\` block.

    Tone:
    - Clean, maintainable, enterprise-ready.
  `,

  /**
   * Cucumber Feature File Only Prompt
   */
  CUCUMBER_ONLY: `
    Instructions:
    - Generate ONLY a Cucumber (.feature) file.
    - Use Scenario Outline with Examples table.
    - Make sure every step is relevant to the provided DOM.
    - Do not combine multiple actions into one step.
    - Use South India realistic dataset (names, addresses, pin codes, mobile numbers).
    - Use dropdown values only from provided DOM.
    - Generate multiple scenarios if applicable.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "testuser" | "testpass"|
      | "admin"    | "admin123"|
    \`\`\`

    Persona:
    - Audience: BDD testers who only need feature files.

    Output Format:
    - Only valid Gherkin in a \`\`\`gherkin\`\`\` block.

    Tone:
    - Clear, structured, executable.
  `,

  /**
   * Cucumber with Step Definitions
   */
  CUCUMBER_WITH_SELENIUM_JAVA_STEPS: `
    Instructions:
    - Generate BOTH:
      1. A Cucumber .feature file.
      2. A Java step definition class for selenium.
    - Do NOT include Page Object code.
    - Step defs must include WebDriver setup, explicit waits, and actual Selenium code.
    - Use Scenario Outline with Examples table (South India realistic data).

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
\      | "admin"    | "admin123"|
    \`\`\`

    \`\`\`java
    package com.leaftaps.stepdefs;

    import io.cucumber.java.en.*;
    import org.openqa.selenium.*;
    import org.openqa.selenium.chrome.ChromeDriver;
    import org.openqa.selenium.support.ui.*;

    public class LoginStepDefinitions {
        private WebDriver driver;
        private WebDriverWait wait;

        @io.cucumber.java.Before
        public void setUp() {
            driver = new ChromeDriver();
            wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            driver.manage().window().maximize();
        }

        @io.cucumber.java.After
        public void tearDown() {
            if (driver != null) driver.quit();
        }

        @Given("I open the login page")
        public void openLoginPage() {
            driver.get("\${pageUrl}");
        }

        @When("I type {string} into the Username field")
        public void enterUsername(String username) {
            WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.id("username")));
            el.sendKeys(username);
        }

        @When("I type {string} into the Password field")
        public void enterPassword(String password) {
            WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.id("password")));
            el.sendKeys(password);
        }

        @When("I click the Login button")
        public void clickLogin() {
            driver.findElement(By.xpath("//button[contains(text(),'Login')]")).click();
        }

        @Then("I should be logged in successfully")
        public void verifyLogin() {
            WebElement success = wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("success")));
            assert success.isDisplayed();
        }
    }
    \`\`\`

    Persona:
    - Audience: QA engineers working with Cucumber & Selenium.

    Output Format:
    - Gherkin in \`\`\`gherkin\`\`\` block + Java code in \`\`\`java\`\`\` block.

    Tone:
    - Professional, executable, structured.
  `,

  /**
   * Playwright TypeScript Page Object Prompt (No Test Class)
   */
  PLAYWRIGHT_TYPESCRIPT_PAGE_ONLY: `
    Instructions:
    - Generate ONLY a Playwright TypeScript Page Object Class (no test code).
    - Add JSDoc for methods & class.
    - Use Playwright latest stable imports.
    - Use meaningful method names following camelCase convention.
    - Do NOT include explanations or test code.
    - Include proper type annotations.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`typescript
    import { Page, Locator } from '@playwright/test';

    /**
     * Page Object for Component Page
     */
    export class ComponentPage {
        readonly page: Page;

        constructor(page: Page) {
            this.page = page;
        }

        // Add methods as per the DOM
    }
    \`\`\`

    Persona:
    - Audience: Test automation engineers focusing on maintainable page object pattern in TypeScript.

    Output Format:
    - A single TypeScript class inside a \`\`\`typescript\`\`\` block.

    Tone:
    - Clean, maintainable, type-safe, modern.
  `,

  /**
   * Playwright TypeScript Step Definitions Prompt
   */
  PLAYWRIGHT_TYPESCRIPT_STEP_DEFINITIONS: `
    Instructions:
    - Generate ONLY Playwright TypeScript step definition code.
    - Include proper fixture setup and teardown.
    - Use async/await pattern with Playwright API.
    - Include timeouts and explicit waits using Playwright's built-in mechanisms.
    - Use meaningful variable names and proper type annotations.
    - Do NOT include Page Object code or feature files.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`typescript
    import { test, expect, Page } from '@playwright/test';

    let page: Page;

    test.beforeEach(async ({ browser }) => {
        const context = await browser.newContext();
        page = await context.newPage();
    });

    test.afterEach(async () => {
        await page.close();
    });

    // Add step definitions based on the DOM
    \`\`\`

    Persona:
    - Audience: QA engineers working with Playwright & TypeScript.

    Output Format:
    - TypeScript code in \`\`\`typescript\`\`\` block.

    Tone:
    - Professional, executable, type-safe.
  `,

  /**
   * Cucumber with Playwright TypeScript Steps
   */
  CUCUMBER_WITH_PLAYWRIGHT_TYPESCRIPT_STEPS: `
    Instructions:
    - Generate BOTH:
      1. A Cucumber .feature file.
      2. A TypeScript step definition class for Playwright.
    - Do NOT include Page Object code.
    - Step defs must include Playwright fixture setup, proper waits, and actual Playwright code.
    - Use Scenario Outline with Examples table (South India realistic data).
    - Use async/await patterns throughout.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "admin"    | "admin123"|
    \`\`\`

    \`\`\`typescript
    import { Given, When, Then, BeforeEach, AfterEach } from '@cucumber/cucumber';
    import { Page, expect } from '@playwright/test';
    import { chromium, Browser, BrowserContext } from '@playwright/test';

    let browser: Browser;
    let context: BrowserContext;
    let page: Page;

    BeforeEach(async () => {
        browser = await chromium.launch();
        context = await browser.newContext();
        page = await context.newPage();
    });

    AfterEach(async () => {
        await context.close();
        await browser.close();
    });

    Given('I open the login page', async () => {
        await page.goto('\${pageUrl}');
    });

    When('I type {string} into the Username field', async (username: string) => {
        await page.locator('id=username').fill(username);
    });

    When('I type {string} into the Password field', async (password: string) => {
        await page.locator('id=password').fill(password);
    });

    When('I click the Login button', async () => {
        await page.locator('button:has-text("Login")').click();
    });

    Then('I should be logged in successfully', async () => {
        const success = await page.locator('.success');
        await expect(success).toBeVisible();
    });
    \`\`\`

    Persona:
    - Audience: QA engineers working with Cucumber, Playwright & TypeScript.

    Output Format:
    - Gherkin in \`\`\`gherkin\`\`\` block + TypeScript code in \`\`\`typescript\`\`\` block.

    Tone:
    - Professional, executable, structured, type-safe.
  `
};

/**
 * Helper function to escape code blocks in prompts
 */
function escapeCodeBlocks(text) {
  return text.replace(/```/g, '\\`\\`\\`');
}

/**
 * Function to fill template variables in a prompt
 */
export function getPrompt(promptKey, variables = {}) {
  let prompt = DEFAULT_PROMPTS[promptKey];
  if (!prompt) {
    throw new Error(`Prompt not found: ${promptKey}`);
  }

  Object.entries(variables).forEach(([k, v]) => {
    const regex = new RegExp(`\\$\\{${k}\\}`, 'g');
    prompt = prompt.replace(regex, v);
  });

  return prompt.trim();
}

export const CODE_GENERATOR_TYPES = {
  SELENIUM_JAVA_PAGE_ONLY: 'Selenium-Java-Page-Only',
  CUCUMBER_ONLY: 'Cucumber-Only',
  CUCUMBER_WITH_SELENIUM_JAVA_STEPS: 'Cucumber-With-Selenium-Java-Steps',
  PLAYWRIGHT_TYPESCRIPT_PAGE_ONLY: 'Playwright-TypeScript-Page-Only',
  PLAYWRIGHT_TYPESCRIPT_STEP_DEFINITIONS: 'Playwright-TypeScript-Step-Definitions',
  CUCUMBER_WITH_PLAYWRIGHT_TYPESCRIPT_STEPS: 'Cucumber-With-Playwright-TypeScript-Steps',
};
