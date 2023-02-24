/* eslint-disable jest/expect-expect */
describe('React-Redux-Saga-Boilerplate', () => {
  it('should have the correct tile', () => {
    cy.visit('/');

    cy.title().should('include', 'React Redux Saga Boilerplate');
  });

  it('should have a login button and start the app', () => {
    cy.findByTestId('Login').should('contain', 'Start').click();
  });

  it('should view the private area', () => {
    cy.findByTestId('Private').should('have.length', 1);
  });

  it('should have an alert and dismiss it', () => {
    cy.findByTestId('Alert').should('have.length', 1).findByRole('button').click();

    cy.findByTestId('Alert').should('not.exist');
  });

  it('should render the "react" repos', () => {
    cy.findByTestId('GitHubGrid')
      .should('have.length', 1)
      .should('have.attr', 'data-topic', 'react')
      .find('a')
      .should('have.length', 30);
    cy.wait(2000);
  });

  it('should toggle the selector', () => {
    cy.findByTestId('GitHubSelector')
      .find('button:last-child')
      .should('have.text', 'Redux')
      .click();
  });

  it('should render the "redux" repos', () => {
    cy.findByTestId('GitHubGrid')
      .should('have.length', 1)
      .should('have.attr', 'data-topic', 'redux')
      .find('a')
      .should('have.length', 30);

    cy.wait(2000);
  });

  it('should be able to logout', () => {
    cy.get('[class^=Logout]').click();
  });

  it('should have redirected to /', () => {
    cy.findByTestId('Home').should('have.length', 1);
  });

  it('should be able to start again', () => {
    cy.findByTestId('Login').should('contain', 'Start').click();

    cy.findByTestId('Private').should('have.length', 1);
  });

  it('should be able to logout again', () => {
    cy.get('[class^=Logout]').click();

    cy.findByTestId('Home').should('have.length', 1);
  });
});
