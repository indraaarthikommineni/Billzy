// Password policy and input validation helpers

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  // Must be more than eight characters (> 8)
  if (password.length <= 8) {
    return { valid: false, message: 'Password must be more than 8 characters long (at least 9 characters)' };
  }
  // Must contain an uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  // Must contain a lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  // Must contain a special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim().toLowerCase())) {
    return { valid: false, message: 'Please provide a valid email address' };
  }
  return { valid: true };
}

module.exports = {
  validatePassword,
  validateEmail
};
