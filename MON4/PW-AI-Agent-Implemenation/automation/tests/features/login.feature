@smoke @login
Feature: Login
  As a user, I want to test the Login functionality.

  @smoke @login
  Scenario: Login with valid credentials
    Given user is on the "Login" page
    When user launch the application "https://ecommerce-playground.lambdatest.io"
    And user hover to My account --> Login  page.
    And user enter the email id jamadar.nasir@gmail.com
    And user password - test@123
    And user verify the user could able to login.
    Then the application should be launched
    And the verify the application is launched and we are in login page.
    And user could able to login.