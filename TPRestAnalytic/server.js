// Importation des modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

// Initialisation de l'application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connecté'))
  .catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Définition des schémas MongoDB
const analyticsSchema = new mongoose.Schema({
    source: { type: String, required: true },
    url: { type: String, required: true },
    visitor: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    meta: { type: Object, default: {} }
});

const View = mongoose.model('View', analyticsSchema);
const Action = mongoose.model('Action', { ...analyticsSchema.obj, action: String });
const Goal = mongoose.model('Goal', { ...analyticsSchema.obj, goal: String });

// Routes génériques pour les logs
const createResource = (Model) => async (req, res) => {
    try {
        const newEntry = new Model(req.body);
        await newEntry.save();
        res.status(201).json(newEntry);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

app.post('/views', createResource(View));
app.post('/actions', createResource(Action));
app.post('/goals', createResource(Goal));

app.get('/', (req, res) => {
    res.send('API REST d\'Analytics opérationnelle.');
});

// Route pour récupérer un Goal et tous les views et actions associés au visiteur
app.get('/goals/:goalId/details', async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.goalId);
        if (!goal) {
            return res.status(404).json({ error: 'Goal non trouvé' });
        }

        const visitor = goal.visitor;

        const views = await View.find({ visitor });
        const actions = await Action.find({ visitor });

        res.json({ goal, views, actions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
