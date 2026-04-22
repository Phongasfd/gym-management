function catchAsync(fn) { // fn is an async function that we want to wrap
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
    // calling the async function and catching any errors, passing them to the next middleware (error handler)
  };
}; 

module.exports = catchAsync;