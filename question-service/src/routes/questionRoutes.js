const express = require('express');
const router = express.Router();
const controller = require('../controllers/questionController');

router.get('/', controller.getQuestions);
router.post('/', controller.createQuestion);
router.get('/:id', controller.getQuestionById);
router.put('/:id', controller.updateQuestion);
router.delete('/:id', controller.deleteQuestion);

module.exports = router;
