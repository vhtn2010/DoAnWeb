const supportService = require('../services/supportService');

const createSupportTicket = async (req, res) => {
  const data = await supportService.createTicket({
    auth: req.auth,
    body: req.body,
  });

  res.success({
    data,
    message: 'Support ticket created successfully',
    statusCode: 201,
  });
};

module.exports = {
  createSupportTicket,
};
