const express = require('express');
const app = express();
const fs = require('fs');
const port = 9000;
const path = require('path');


// Serve static files
app.use(express.static(path.join(__dirname, 'web')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web','sampler_2961.html'));
})

app.listen(port, () => {
    console.log(`WebSampler funcionando en puerto ${port}`)
  })

  