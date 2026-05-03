describe('Login manual a produccion', () => {
  it('debe permitir login manual con 2FA', () => {
    cy.visit('/login');
    cy.log('╔═══════════════════════════════════════════════╗');
    cy.log('║         LOGIN MANUAL - PRODUCCION             ║');
    cy.log('╠═══════════════════════════════════════════════╣');
    cy.log('║  1. Ingresa tu usuario y contrasena           ║');
    cy.log('║  2. Click "Ingresar al sistema"               ║');
    cy.log('║  3. Revisa tu correo para el codigo 2FA       ║');
    cy.log('║  4. Ingresa el codigo                         ║');
    cy.log('║  5. Click "Verificar e ingresar"              ║');
    cy.log('║                                               ║');
    cy.log('║  El test espera hasta que completes           ║');
    cy.log('║  el login exitosamente (max 5 min)            ║');
    cy.log('╚═══════════════════════════════════════════════╝');

    cy.url({ timeout: 300000 }).should('not.include', '/login');
    cy.get('body').should('be.visible');
    cy.log('✓ Login exitoso - Sesion iniciada correctamente');
  });
});
