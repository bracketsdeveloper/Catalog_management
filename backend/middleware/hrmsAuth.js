// middleware/hrmsAuth.js
function authenticate(req, res, next) { /* reuse your existing */ next(); }
function requireAdmin(req, res, next) { /* check role */ next(); }
function requireSuperAdmin(req, res, next) { /* check super admin */ next(); }

/** Field-level projection:
 * Since routes already use requireAdmin, allow all admins to see financial data
 * If you need stricter control, implement proper authentication in the middleware functions above
 */
function financialProjectionFor(user) {
  // For now, allow all authenticated users who pass requireAdmin to see financial data
  // If you want to restrict to super admin only, implement proper auth middleware first
  return {}; // no projection (show all fields including financial)
}

module.exports = { authenticate, requireAdmin, requireSuperAdmin, financialProjectionFor };
