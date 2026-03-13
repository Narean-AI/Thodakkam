const allowRoles = (...roles) => (req, res, next) => {
  try {
    const user = req.user
    if (!user) return res.status(401).json({ message: 'No user in request' })
    if (!roles.includes(user.role)) return res.status(403).json({ message: 'Forbidden' })
    next()
  } catch (e) {
    res.status(500).json({ message: 'RBAC error' })
  }
}

module.exports = { allowRoles }
