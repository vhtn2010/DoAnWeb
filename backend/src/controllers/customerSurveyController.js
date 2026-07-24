const customerSurveyService = require('../services/customerSurveyService');

const getMyCustomerSurveyStatus = async (req, res) => {
  const result = await customerSurveyService.getCurrentSurveyStatus({
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Customer survey status retrieved successfully',
  });
};

const submitMyCustomerSurvey = async (req, res) => {
  const result = await customerSurveyService.submitCurrentSurvey({
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Customer survey completed successfully',
    statusCode: 201,
  });
};

module.exports = {
  getMyCustomerSurveyStatus,
  submitMyCustomerSurvey,
};
