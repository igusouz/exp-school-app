Feature: Student Evaluation and Notification
  As a school coordinator
  I want to manage students, classes, and evaluations
  So that learning progress is tracked and notifications are sent responsibly

  Background:
    Given the JSON data store is available
    And there is a class "Intro to Programming" in year 2026 semester 1
    And the class has goals "Requirements" and "Testing"

  Scenario: Updating a student evaluation and triggering daily email aggregation
    Given I am on the "Class Evaluation" page for "Intro to Programming"
    And the student "John Doe" is enrolled in the class
    When I change the "Requirements" goal for "John Doe" to "MPA"
    And I change the "Testing" goal for "John Doe" to "MA"
    Then the system should update the student's status in the JSON database
    And the system should queue a summary notification for "John Doe"
    But it should not send the email immediately to avoid multiple notifications in one day

  Scenario: Deleting a student
    Given I am on the "Student List" page
    And there is a student with CPF "123.456.789-00"
    When I click the "Delete" button for the student with CPF "123.456.789-00"
    Then the student should be removed from the list
    And the student should be automatically unenrolled from all active classes

  Scenario: Creating a student with valid data
    Given I am on the "Student List" page
    When I add a student with name "Jane Smith", CPF "987.654.321-00", and email "jane.smith@example.com"
    Then the student should appear in the student list
    And the student record should be persisted in the JSON database

  Scenario: Preventing duplicate student CPF
    Given a student already exists with CPF "111.222.333-44"
    When I try to add another student with CPF "111.222.333-44"
    Then the system should reject the creation request
    And I should see an error indicating that CPF already exists

  Scenario: Creating a class with enrolled students and goals
    Given students "John Doe" and "Jane Smith" exist
    When I create a class with topic "Intro to Programming", year 2026, semester 1
    And I enroll "John Doe" and "Jane Smith"
    And I define goals "Requirements" and "Testing"
    Then the class should be listed in the Classes page
    And the class should be persisted with enrolled students and goals in the JSON database

  Scenario: Restricting evaluation values to MANA, MPA, or MA
    Given I am on the "Class Evaluation" page for "Intro to Programming"
    And the student "John Doe" is enrolled in the class
    When I try to set the "Requirements" goal for "John Doe" to "EXCELLENT"
    Then the system should reject the update
    And the stored evaluation value should remain unchanged

  Scenario: Saving evaluation matrix for multiple students
    Given I am on the "Class Evaluation" page for "Intro to Programming"
    And students "John Doe" and "Jane Smith" are enrolled in the class
    When I set all goals for both students using only values "MANA", "MPA", or "MA"
    And I click "Save Evaluations"
    Then all evaluation cells should be persisted in the class JSON record
    And notification events should be queued for the students with changed evaluations

  Scenario: Dispatching one daily summary email with aggregated updates across classes
    Given "John Doe" is enrolled in classes "Intro to Programming" and "Software Testing"
    And pending notification events exist for "John Doe" in both classes on the same date
    When the daily notification dispatch process runs
    Then the system should send only one summary email to "John Doe"
    And the email should include updates from both classes
    And "John Doe" should be marked as dispatched for the current date

  Scenario: Preventing multiple summary emails in the same day
    Given "John Doe" has already received a summary email today
    And there are pending notification events for "John Doe"
    When the daily notification dispatch process runs again on the same date
    Then the system should not send another email to "John Doe"
    And the dispatch result should count "John Doe" as skipped

  Scenario: Removing a student from a class should clear their class evaluations
    Given class "Intro to Programming" contains student "John Doe" with saved evaluations
    When I update the class enrollment and remove "John Doe"
    Then "John Doe" should not be listed as enrolled in that class
    And all evaluation cells for "John Doe" in that class should be removed
