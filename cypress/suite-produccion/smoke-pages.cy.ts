describe('Paginas de produccion (smoke tests)', () => {
  beforeEach(() => {
    cy.session('produccion');
  });

  it('dashboard carga correctamente', () => {
    cy.visit('/dashboard');
    cy.get('body').should('be.visible');
  });

  it('produccion carga correctamente', () => {
    cy.visit('/produccion');
    cy.get('body').should('be.visible');
  });

  it('bodega carga correctamente', () => {
    cy.visit('/bodega');
    cy.get('body').should('be.visible');
  });

  it('pedidos-despacho carga correctamente', () => {
    cy.visit('/pedidos-despacho');
    cy.get('body').should('be.visible');
  });

  it('clientes-saldos carga correctamente', () => {
    cy.visit('/clientes-saldos');
    cy.get('body').should('be.visible');
  });

  it('reportes carga correctamente', () => {
    cy.visit('/reportes');
    cy.get('body').should('be.visible');
  });
});
