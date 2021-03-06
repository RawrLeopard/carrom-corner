const express = require('express');
const router = express.Router();

const connection = require('./db');

// POST player
router.post('/post', function(req, res) {
  const player_info = req.body;
  const query = 'INSERT INTO Players VALUES (NULL, ?, ?, 0);';
  const filter = [player_info.name, player_info.nickname];
  connection.query(query, filter, connection.handleRequest(res,'POST player'));
});

// GET all players
router.get('/get', function(req, res) {
  const query = 'SELECT * FROM Players';
  connection.query(query, connection.handleRequest(res,'GET players'));
});

// GET a specific player
router.get('/get/:player_id', function(req, res) {
  const query = 'SELECT * FROM Players WHERE id = ?';
  const filter = [parseInt(req.params.player_id)];
  connection.query(query, filter, connection.handleRequest(res,'GET player'));
});

//DELETE player
router.delete('/delete/:player_id', function(req, res) {
  const player_id = parseInt(req.params.player_id);
  const query = 'DELETE FROM Players WHERE id = ?';
  const filter = [player_id];
  connection.query(query, filter, connection.handleRequest(res,'DELETE player'));
});

// //UPDATE player singles game
// router.update('/update/singles/:player_id', function(req, res) {
//   const player_id = parseInt(req.params.player_id);
//   const query = 'UPDATE Players SET (name = ?, nickname = ?';
//   const filter = [player_id]
//   connection.query(query, filter, function(err, result) {
//     if (err) throw err;
//     else {
//       return res.status(200).send(JSON.stringify(result));
//     }
//   })
// });
//
// //UPDATE player doubles game
// router.update('/update/doubles/:player_id', function(req, res) {
//   const player_id = parseInt(req.params.player_id);
//   const query = 'UPDATE Players SET (name = ?, nickname = ?';
//   const filter = [player_id]
//   connection.query(query, filter, function(err, result) {
//     if (err) throw err;
//     else {
//       return res.status(200).send(JSON.stringify(result));
//     }
//   })
// });

module.exports = router;
