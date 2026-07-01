const router = require('express').Router();
const { verificarSesion, esEspecialista } = require('../middlewares/autenticacion');
const feedbackController = require('../controllers/feedbackController');

router.post('/api/feedback', verificarSesion, feedbackController.enviarFeedback);
router.get('/api/feedback', verificarSesion, esEspecialista, feedbackController.listarFeedback);
router.delete('/api/feedback/:id', verificarSesion, esEspecialista, feedbackController.eliminarFeedback);

module.exports = router;
