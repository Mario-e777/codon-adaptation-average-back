const express = require('express');
const { TIME_FRAMES_TITLES, extractTimeSections } = require('./script');
const bodyParser = require('body-parser');
const fileupload = require("express-fileupload");
const app = express();
const port = 3001;
const cors = require("cors");

const corsOptions = {
    origin: '*',
    optionSuccessStatus: 200,
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(fileupload());
app.use(cors(corsOptions));

app.post('/', (req, res) => {
    extractTimeSections(req.files.file).then(data => {
        res.status(200).json({ data });
    });
});
app.get('/time-frame-titles', (req, res) => {
    res.status(200).json(TIME_FRAMES_TITLES);
});

app.listen(port);
