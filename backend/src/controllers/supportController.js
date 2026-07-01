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

const listMySupportTickets = async (req, res) => {
  const data = await supportService.listMyTickets({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: data.items,
    message: 'Support tickets fetched successfully',
    meta: data.meta,
  });
};

const getMySupportTicketDetail = async (req, res) => {
  const data = await supportService.getMyTicketDetail({
    auth: req.auth,
    ticketId: req.params.ticket_id,
  });

  res.success({
    data,
    message: 'Support ticket fetched successfully',
  });
};

module.exports = {
  createSupportTicket,
  getMySupportTicketDetail,
  listMySupportTickets,
};
