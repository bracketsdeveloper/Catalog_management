// middleware/hrmsAuth.js
function authenticate(req, res, next) { /* reuse your existing */ next(); }
function requireAdmin(req, res, next) { /* check role */ next(); }
function requireSuperAdmin(req, res, next) { /* check super admin */ next(); }

/** Field-level projection:
 * super admin sees financial; others don't
 */
function financialProjectionFor(user) {
  if (user?.isSuperAdmin) return {}; // no projection (show all)
  return { financial: 0 }; // hide financial object
}

module.exports = { authenticate, requireAdmin, requireSuperAdmin, financialProjectionFor };
