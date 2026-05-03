describe('Paginas de produccion - smoke tests', () => {
  it('health-check del backend responde OK', () => {
    cy.request('https://proyectocga-production-2e12.up.railway.app/api/health/')
      .its('status')
      .should('equal', 200);
  });

  it('pagina de login carga correctamente', () => {
    cy.visit('/login');
    cy.get('body').should('be.visible');
    cy.title().should('not.be.empty');
  });

  it('API token endpoint responde con metodo correcto', () => {
    cy.request({
      method: 'POST',
      url: 'https://proyectocga-production-2e12.up.railway.app/api/token/',
      body: { username: '', password: '' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 401]);
    });
  });
});
