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

const listAdminSupportTickets = async (req, res) => {
  const data = await supportService.listAdminTickets({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: data.items,
    message: 'Admin support tickets fetched successfully',
    meta: data.meta,
  });
};

const getAdminSupportTicketDetail = async (req, res) => {
  const data = await supportService.getAdminTicketDetail({
    auth: req.auth,
    ticketId: req.params.ticket_id,
  });

  res.success({
    data,
    message: 'Admin support ticket fetched successfully',
  });
};

const updateAdminSupportTicket = async (req, res) => {
  const data = await supportService.updateAdminTicket({
    auth: req.auth,
    body: req.body,
    ticketId: req.params.ticket_id,
  });

  res.success({
    data,
    message: 'Admin support ticket updated successfully',
  });
};

const assignAdminSupportTicket = async (req, res) => {
  const data = await supportService.assignAdminTicket({
    auth: req.auth,
    body: req.body,
    ticketId: req.params.ticket_id,
  });

  res.success({
    data,
    message: 'Admin support ticket assigned successfully',
  });
};

const replyToAdminSupportTicket = async (req, res) => {
  const data = await supportService.replyToAdminTicket({
    auth: req.auth,
    body: req.body,
    ticketId: req.params.ticket_id,
  });

  res.success({
    data,
    message: 'Admin support ticket reply created successfully',
    statusCode: 201,
  });
};

const closeAdminSupportTicket = async (req, res) => {
  const data = await supportService.closeAdminTicket({
    auth: req.auth,
    body: req.body,
    ticketId: req.params.ticket_id,
  });

  res.success({
    data,
    message: 'Admin support ticket closed successfully',
  });
};

const reopenAdminSupportTicket = async (req, res) => {
  const data = await supportService.reopenAdminTicket({
    auth: req.auth,
    body: req.body,
    ticketId: req.params.ticket_id,
  });

  res.success({
    data,
    message: 'Admin support ticket reopened successfully',
  });
};

const markAdminSupportTicketAsSpam = async (req, res) => {
  const data = await supportService.markAdminTicketAsSpam({
    auth: req.auth,
    body: req.body,
    ticketId: req.params.ticket_id,
  });

  res.success({
    data,
    message: 'Admin support ticket marked as spam successfully',
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

const replyToSupportTicket = async (req, res) => {
  const data = await supportService.replyToTicket({
    auth: req.auth,
    body: req.body,
    ticketId: req.params.ticket_id,
  });

  res.success({
    data,
    message: 'Support ticket reply created successfully',
    statusCode: 201,
  });
};

const closeMySupportTicket = async (req, res) => {
  const data = await supportService.closeMyTicket({
    auth: req.auth,
    body: req.body,
    ticketId: req.params.ticket_id,
  });

  res.success({
    data,
    message: 'Support ticket closed successfully',
  });
};

module.exports = {
  assignAdminSupportTicket,
  closeAdminSupportTicket,
  closeMySupportTicket,
  createSupportTicket,
  markAdminSupportTicketAsSpam,
  updateAdminSupportTicket,
  getAdminSupportTicketDetail,
  getMySupportTicketDetail,
  listAdminSupportTickets,
  listMySupportTickets,
  reopenAdminSupportTicket,
  replyToAdminSupportTicket,
  replyToSupportTicket,
};
