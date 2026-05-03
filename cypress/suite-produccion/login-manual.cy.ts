describe('Login manual a produccion', () => {
  beforeEach(() => {
    cy.session('produccion', () => {
      cy.visit('/login');
      cy.log('=== LOGIN MANUAL REQUERIDO ===');
      cy.log('1. Ingresa usuario y contrasena');
      cy.log('2. Click Ingresar al sistema');
      cy.log('3. Revisa tu correo para el codigo 2FA');
      cy.log('4. Ingresa el codigo y click Verificar e ingresar');
      cy.log('El test esperara 120 segundos para que completes el login...');
      cy.wait(120000);
    });
    cy.visit('/');
  });

  it('debe redirigir a una pagina interna tras login exitoso', () => {
    cy.url({ timeout: 10000 }).should('not.include', '/login');
    cy.get('body').should('be.visible');
  });
});
