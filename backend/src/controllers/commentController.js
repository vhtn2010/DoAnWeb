const commentService = require('../services/commentService');

const createServiceComment = async (req, res) => {
  const data = await commentService.createServiceComment({
    auth: req.auth,
    body: req.body,
    serviceId: req.params.service_id,
  });

  res.success({
    data,
    message: 'Tour comment submitted successfully',
    statusCode: 201,
  });
};

const listServiceComments = async (req, res) => {
  const result = await commentService.listServiceComments({
    query: req.query,
    serviceId: req.params.service_id,
  });

  res.success({
    data: result.items,
    message: 'Tour comments fetched successfully',
    meta: result.meta,
  });
};

module.exports = {
  createServiceComment,
  listServiceComments,
};
