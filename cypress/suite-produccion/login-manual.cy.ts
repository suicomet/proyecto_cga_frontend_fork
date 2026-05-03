describe('Login manual a produccion', () => {
  beforeEach(() => {
    cy.session('produccion', () => {
      cy.visit('/login');
      cy.log('=== LOGIN MANUAL REQUERIDO ===');
      cy.log('1. Ingresa usuario y contrasena');
      cy.log('2. Click Ingresar al sistema');
      cy.log('3. Revisa tu correo para el codigo 2FA');
      cy.log('4. Ingresa el codigo y click Verificar e ingresar');
      cy.log('El test esperara 60 segundos para que completes el login...');
      cy.wait(60000);
    });
    cy.visit('/');
  });

  it('debe mostrar el dashboard tras login manual', () => {
    cy.url().should('include', '/dashboard');
    cy.get('body').should('be.visible');
  });
});
