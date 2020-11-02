
function promisify(func, ...args) {
    return new Promise((resolve, reject) => {
        func(...args, (error, result) => {
            if (error) reject(error);
            resolve(result);
        })
    });
}

module.exports = {promisify};
