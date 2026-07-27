// Shared input validators.

const PASSWORD_MIN_LENGTH = 8;

// Returns an error string if the password is too weak, or null if it's fine.
// Requires a minimum length and at least one letter and one digit.
function validatePassword(password) {
    if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return "Password must contain at least one letter and one number";
    }
    return null;
}

// Basic email shape check. Not RFC-exhaustive, but rejects obviously invalid
// input (missing @, spaces, no domain/TLD).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
    return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

module.exports = { validatePassword, isValidEmail, PASSWORD_MIN_LENGTH };
