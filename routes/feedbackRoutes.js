const router = require('express').Router();
const { verificarSesion, esEspecialista } = require('../middlewares/autenticacion');
const feedbackController = require('../controllers/feedbackController');

router.post('/api/feedback', verificarSesion, feedbackController.enviarFeedback);
router.get('/api/feedback', verificarSesion, esEspecialista, feedbackController.listarFeedback);

module.exports = router;
