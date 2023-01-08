class AltError extends Error {
    constructor (errors) {
        if (errors.length === 1) {
            super(errors[0].join(": "));
        } else {
            super(`Validation failed: ${errors.length} errors found`)
        }
        this.errors = errors;
    }
}

module.exports = AltError;