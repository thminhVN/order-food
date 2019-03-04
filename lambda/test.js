exports.handler = (event, context, callback) => {
  const respond = ({ status = 200, body = '' }) => {
    callback(null, {
      statusCode: status,
      body: body || '',
    });
  };
  respond({ status: 200, body: 'Test' });
};
